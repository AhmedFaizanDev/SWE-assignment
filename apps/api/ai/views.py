import json
import hashlib
import logging

from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .client import call_openai
from .context_builder import (
    build_full_context, build_inventory_summary, build_activity_summary,
    build_supplier_summary, build_borrowed_summary, build_item_context,
    build_insights_summary,
)
from .models import InsightRecord, AISuggestion, AIInteraction
from .prompts import TEMPLATES
from .serializers import InsightRecordSerializer, AISuggestionSerializer
from .rag import build_rag_context

logger = logging.getLogger(__name__)

QUERY_CACHE_TTL = 120  # 2 min cache for identical questions


class AIWriteThrottle(AnonRateThrottle):
    scope = 'ai_write'


class AIInsightsListThrottle(AnonRateThrottle):
    scope = 'ai_insights_read'

    def allow_request(self, request, view):
        self.scope = 'ai_insights_read' if request.method == 'GET' else 'ai_write'
        self.rate = None
        return super().allow_request(request, view)


def _query_cache_key(question: str) -> str:
    return f"ai_query:{hashlib.sha256(question.lower().strip().encode()).hexdigest()[:16]}"


def _to_text_answer(raw_answer):
    """Normalise model's answer field into a plain-text string."""
    if raw_answer is None:
        return ''
    if isinstance(raw_answer, str):
        s = raw_answer.strip()
        if not s:
            return ''
        if (s.startswith('{') and s.endswith('}')) or (s.startswith('[') and s.endswith(']')):
            try:
                raw_answer = json.loads(s)
            except Exception:
                return s
        else:
            return s

    if isinstance(raw_answer, dict):
        if 'summary' in raw_answer and isinstance(raw_answer['summary'], str):
            return raw_answer['summary'].strip()
        key_vals = []
        for k, v in raw_answer.items():
            if isinstance(v, list) and v and isinstance(v[0], dict):
                lines = [f'{k}:']
                for row in v[:8]:
                    parts = [f'{kk}: {vv}' for kk, vv in row.items()]
                    lines.append(f"- {', '.join(parts)}")
                key_vals.append('\n'.join(lines))
            else:
                key_vals.append(f'{k}: {v}')
        return '\n'.join(key_vals)

    if isinstance(raw_answer, list):
        return '\n'.join(f'- {x}' for x in raw_answer[:12])

    return str(raw_answer)


@api_view(['POST'])
@throttle_classes([AIWriteThrottle])
def ai_query(request):
    """Natural-language Q&A grounded in live inventory data.
    Identical questions are cached for 2 minutes to save tokens."""
    question = request.data.get('question', '').strip()
    if not question:
        return Response({'detail': 'question is required.'}, status=status.HTTP_400_BAD_REQUEST)

    cache_key = _query_cache_key(question)
    cached_response = cache.get(cache_key)
    if cached_response is not None:
        cached_response['meta']['cached'] = True
        return Response(cached_response)

    rag_context, retrieved_chunks = build_rag_context(question=question, limit=5)
    context = rag_context if retrieved_chunks else build_full_context()
    tpl = TEMPLATES['query']
    user_prompt = tpl['user'].format(context=context, question=question)

    result = call_openai(
        system_prompt=tpl['system'],
        user_prompt=user_prompt,
        model=tpl['model'],
        max_tokens=tpl['max_tokens'],
        temperature=tpl['temperature'],
        interaction_type='query',
        user_input=question,
        context_summary=context[:300],
    )

    if result.get('fallback'):
        return Response({
            'answer': 'AI service is currently unavailable. Please check your OpenAI API key configuration.',
            'confidence': 0,
            'suggestedActions': [],
            'relatedItems': [],
            'meta': {'requestId': result.get('request_id', ''), 'fallback': True},
        })

    data = result.get('data', {})
    answer = _to_text_answer(data.get('answer', ''))

    confidence = data.get('confidence', 0)
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.0

    suggested_actions = data.get('suggestedActions', data.get('suggested_actions', []))
    if not isinstance(suggested_actions, list):
        suggested_actions = [str(suggested_actions)] if suggested_actions else []

    related_items = data.get('relatedItems', data.get('related_items', []))
    if not isinstance(related_items, list):
        related_items = [str(related_items)] if related_items else []

    citations = data.get('citations', [])
    if not isinstance(citations, list):
        citations = []
    citations = [str(c) for c in citations if c]
    if retrieved_chunks:
        valid_ids = [c.chunk_id for c in retrieved_chunks]
        normalized: list[str] = []
        for c in citations:
            if c in valid_ids:
                normalized.append(c)
                continue
            m = c.strip().upper()
            if m.startswith("R") and m[1:].isdigit():
                idx = int(m[1:]) - 1
                if 0 <= idx < len(valid_ids):
                    normalized.append(valid_ids[idx])
        citations = list(dict.fromkeys(normalized)) or valid_ids[:3]

    response_data = {
        'answer': answer,
        'confidence': confidence,
        'citations': citations,
        'suggestedActions': suggested_actions,
        'relatedItems': related_items,
        'meta': {
            'requestId': result.get('request_id', ''),
            'model': result.get('model', ''),
            'tokens': result.get('tokens', 0),
            'costUsd': result.get('cost_usd', 0),
            'latencyMs': result.get('latency_ms', 0),
            'cached': False,
            'retrieval': [
                {
                    'chunkId': c.chunk_id,
                    'source': c.source,
                    'title': c.title,
                    'score': c.score,
                }
                for c in retrieved_chunks
            ],
        },
    }

    cache.set(cache_key, response_data, QUERY_CACHE_TTL)
    return Response(response_data)


@api_view(['GET', 'POST'])
@throttle_classes([AIInsightsListThrottle])
def ai_insights(request):
    """GET: return active insights. POST: generate fresh insights via AI."""
    if request.method == 'GET':
        qs = InsightRecord.objects.filter(status='active').order_by('-severity', '-confidence', '-created_at')[:20]
        return Response(InsightRecordSerializer(qs, many=True).data)

    tpl = TEMPLATES['insights']
    user_prompt = tpl['user'].format(
        inventory_summary=build_inventory_summary(),
        activity_summary=build_activity_summary(),
        supplier_summary=build_supplier_summary(),
        borrowed_summary=build_borrowed_summary(),
    )

    result = call_openai(
        system_prompt=tpl['system'],
        user_prompt=user_prompt,
        model=tpl['model'],
        max_tokens=tpl['max_tokens'],
        temperature=tpl['temperature'],
        interaction_type='insight',
        context_summary=user_prompt[:300],
    )

    if result.get('fallback'):
        return Response({
            'insights': [],
            'meta': {'requestId': result.get('request_id', ''), 'fallback': True, 'error': result.get('error', '')},
        })

    raw = result.get('data', [])
    if isinstance(raw, dict):
        raw = raw.get('insights', raw.get('data', []))
    if not isinstance(raw, list):
        raw = []

    interaction = AIInteraction.objects.filter(request_id=result.get('request_id', '')).first()
    created = []
    for item in raw[:5]:
        try:
            record = InsightRecord.objects.create(
                title=item.get('title', 'Untitled Insight')[:255],
                description=item.get('description', ''),
                category=item.get('category', 'operational'),
                severity=item.get('severity', 'info'),
                confidence=float(item.get('confidence', 0)),
                impact_estimate=item.get('impactEstimate', item.get('impact_estimate', '')),
                recommended_action=item.get('recommendedAction', item.get('recommended_action', '')),
                evidence=item.get('evidence', {}),
                related_item_ids=item.get('relatedItemIds', item.get('related_item_ids', [])),
                related_supplier_ids=item.get('relatedSupplierIds', item.get('related_supplier_ids', [])),
                ai_interaction=interaction,
            )
            created.append(record)
        except Exception as exc:
            logger.warning('Failed to save insight: %s', exc)

    return Response({
        'insights': InsightRecordSerializer(created, many=True).data,
        'meta': {
            'requestId': result.get('request_id', ''),
            'model': result.get('model', ''),
            'tokens': result.get('tokens', 0),
            'costUsd': result.get('cost_usd', 0),
            'latencyMs': result.get('latency_ms', 0),
        },
    })


@api_view(['POST'])
@throttle_classes([AIWriteThrottle])
def ai_simulate_reorder(request):
    """What-if reorder simulation for a specific item."""
    item_id = request.data.get('itemId')
    if not item_id:
        return Response({'detail': 'itemId is required.'}, status=status.HTTP_400_BAD_REQUEST)

    ctx = build_item_context(int(item_id))
    if not ctx:
        return Response({'detail': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

    tpl = TEMPLATES['simulation']
    user_prompt = tpl['user'].format(**ctx)

    result = call_openai(
        system_prompt=tpl['system'],
        user_prompt=user_prompt,
        model=tpl['model'],
        max_tokens=tpl['max_tokens'],
        temperature=tpl['temperature'],
        interaction_type='simulation',
        user_input=f'item_id={item_id}',
        context_summary=str(ctx)[:300],
    )

    if result.get('fallback'):
        return Response({
            'simulation': None,
            'meta': {'requestId': result.get('request_id', ''), 'fallback': True, 'error': result.get('error', '')},
        })

    data = result.get('data', {})
    return Response({
        'simulation': data,
        'meta': {
            'requestId': result.get('request_id', ''),
            'model': result.get('model', ''),
            'tokens': result.get('tokens', 0),
            'costUsd': result.get('cost_usd', 0),
            'latencyMs': result.get('latency_ms', 0),
        },
    })


@api_view(['PATCH'])
def insight_feedback(request, pk):
    """Submit feedback on an insight."""
    try:
        insight = InsightRecord.objects.get(pk=pk)
    except InsightRecord.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    feedback = request.data.get('feedback', '')
    comment = request.data.get('comment', '')
    new_status = request.data.get('status', '')

    if feedback:
        insight.feedback = feedback
    if comment:
        insight.feedback_comment = comment
    if new_status in ('acknowledged', 'resolved', 'dismissed'):
        insight.status = new_status

    insight.save()
    return Response(InsightRecordSerializer(insight).data)


@api_view(['GET'])
def suggestion_list(request):
    """List AI-generated suggestions."""
    approval_status = request.query_params.get('status', 'pending')
    qs = AISuggestion.objects.filter(approval_status=approval_status)[:50]
    return Response(AISuggestionSerializer(qs, many=True).data)


@api_view(['PATCH'])
def suggestion_action(request, pk):
    """Approve or reject an AI suggestion."""
    try:
        suggestion = AISuggestion.objects.get(pk=pk)
    except AISuggestion.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    action = request.data.get('action')
    if action == 'approve':
        suggestion.approval_status = 'approved'
        suggestion.approved_by = request.data.get('approvedBy', 'Admin')
        suggestion.approved_at = timezone.now()
    elif action == 'reject':
        suggestion.approval_status = 'rejected'
        suggestion.rejection_reason = request.data.get('reason', '')
    elif action == 'execute':
        if suggestion.approval_status != 'approved':
            return Response({'detail': 'Must be approved before execution.'}, status=status.HTTP_409_CONFLICT)
        suggestion.approval_status = 'executed'
    else:
        return Response({'detail': 'action must be approve, reject, or execute.'}, status=status.HTTP_400_BAD_REQUEST)

    suggestion.save()
    return Response(AISuggestionSerializer(suggestion).data)


@api_view(['POST'])
@throttle_classes([AIWriteThrottle])
def generate_suggestions(request):
    """Generate AI suggestions from active insights.
    Uses the insights + inventory context to create actionable suggestions."""
    active_insights = InsightRecord.objects.filter(status='active').order_by('-severity', '-confidence')[:5]
    if not active_insights.exists():
        return Response({
            'suggestions': [],
            'meta': {'message': 'No active insights to base suggestions on. Generate insights first.'},
        })

    tpl = TEMPLATES['suggestions']
    user_prompt = tpl['user'].format(
        insights_summary=build_insights_summary(list(active_insights)),
        inventory_summary=build_inventory_summary(),
    )

    result = call_openai(
        system_prompt=tpl['system'],
        user_prompt=user_prompt,
        model=tpl['model'],
        max_tokens=tpl['max_tokens'],
        temperature=tpl['temperature'],
        interaction_type='insight',
        context_summary=user_prompt[:300],
    )

    if result.get('fallback'):
        return Response({
            'suggestions': [],
            'meta': {'requestId': result.get('request_id', ''), 'fallback': True, 'error': result.get('error', '')},
        })

    raw = result.get('data', {})
    items = raw.get('suggestions', []) if isinstance(raw, dict) else []
    if not isinstance(items, list):
        items = []

    interaction = AIInteraction.objects.filter(request_id=result.get('request_id', '')).first()
    created = []
    for item in items[:3]:
        try:
            sug_type = item.get('suggestion_type', 'reorder')
            if sug_type not in ('reorder', 'rebalance', 'decommission'):
                sug_type = 'reorder'
            suggestion = AISuggestion.objects.create(
                suggestion_type=sug_type,
                title=item.get('title', 'Untitled Suggestion')[:255],
                description=item.get('description', ''),
                details=item.get('details', {}),
                ai_interaction=interaction,
                insight=active_insights.first(),
            )
            created.append(suggestion)
        except Exception as exc:
            logger.warning('Failed to save suggestion: %s', exc)

    return Response({
        'suggestions': AISuggestionSerializer(created, many=True).data,
        'meta': {
            'requestId': result.get('request_id', ''),
            'model': result.get('model', ''),
            'tokens': result.get('tokens', 0),
            'costUsd': result.get('cost_usd', 0),
            'latencyMs': result.get('latency_ms', 0),
        },
    })


@api_view(['GET'])
def ai_usage_stats(request):
    """Token/cost usage stats for observability."""
    days = int(request.query_params.get('days', '30'))
    since = timezone.now() - timezone.timedelta(days=days)
    qs = AIInteraction.objects.filter(created_at__gte=since)

    from django.db.models import Sum, Count, Avg
    stats = qs.aggregate(
        total_calls=Count('id'),
        total_tokens=Sum('total_tokens'),
        total_cost=Sum('cost_usd'),
        avg_latency=Avg('latency_ms'),
    )
    error_count = qs.exclude(error='').count()

    return Response({
        'period_days': days,
        'totalCalls': stats['total_calls'] or 0,
        'totalTokens': stats['total_tokens'] or 0,
        'totalCostUsd': round(stats['total_cost'] or 0, 4),
        'avgLatencyMs': round(stats['avg_latency'] or 0, 1),
        'errorCount': error_count,
    })
