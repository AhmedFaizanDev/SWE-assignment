"""
OpenAI client wrapper with fail-safe fallback, cost tracking, and schema validation.
"""
import json
import logging
import time
import uuid

from django.conf import settings

from .models import AIInteraction

logger = logging.getLogger(__name__)

COST_PER_1K = {
    'gpt-4o-mini': {'input': 0.00015, 'output': 0.0006},
    'gpt-4o': {'input': 0.0025, 'output': 0.01},
    'gpt-4': {'input': 0.03, 'output': 0.06},
}


def _get_client():
    try:
        import openai
        api_key = getattr(settings, 'OPENAI_API_KEY', '')
        if not api_key:
            return None
        return openai.OpenAI(api_key=api_key)
    except ImportError:
        logger.warning('openai package not installed.')
        return None


def _estimate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    rates = COST_PER_1K.get(model, COST_PER_1K['gpt-4o-mini'])
    return (prompt_tokens / 1000 * rates['input']) + (completion_tokens / 1000 * rates['output'])


def call_openai(
    system_prompt: str,
    user_prompt: str,
    model: str = None,
    max_tokens: int = None,
    temperature: float = None,
    interaction_type: str = 'query',
    user_input: str = '',
    context_summary: str = '',
) -> dict:
    """
    Call OpenAI and return parsed JSON response.
    Falls back to an error dict if OpenAI is unavailable.
    Logs every interaction to AIInteraction for governance.
    """
    request_id = str(uuid.uuid4())[:12]
    model = model or getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini')
    max_tokens = max_tokens or getattr(settings, 'AI_MAX_TOKENS', 1024)
    temperature = temperature if temperature is not None else 0.3
    timeout = getattr(settings, 'AI_REQUEST_TIMEOUT_MS', 30000) / 1000

    client = _get_client()
    if client is None:
        interaction = AIInteraction.objects.create(
            interaction_type=interaction_type,
            user_input=user_input,
            context_summary=context_summary[:500],
            full_prompt=f'[SYSTEM]{system_prompt[:200]}...\n[USER]{user_prompt[:500]}...',
            error='OpenAI client not available (missing API key or package).',
            request_id=request_id,
        )
        return {
            'error': 'AI service is not configured. Set OPENAI_API_KEY in environment.',
            'fallback': True,
            'request_id': request_id,
        }

    start = time.time()
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=timeout,
            response_format={'type': 'json_object'},
        )
        latency_ms = int((time.time() - start) * 1000)

        choice = response.choices[0]
        raw_text = choice.message.content or ''
        usage = response.usage

        prompt_tokens = usage.prompt_tokens if usage else 0
        completion_tokens = usage.completion_tokens if usage else 0
        total_tokens = usage.total_tokens if usage else 0
        cost = _estimate_cost(model, prompt_tokens, completion_tokens)

        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError:
            parsed = {'raw': raw_text}

        AIInteraction.objects.create(
            interaction_type=interaction_type,
            user_input=user_input,
            context_summary=context_summary[:500],
            full_prompt=f'[SYSTEM]{system_prompt[:200]}...\n[USER]{user_prompt[:500]}...',
            response_text=raw_text[:2000],
            response_data=parsed,
            model_used=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost_usd=cost,
            latency_ms=latency_ms,
            request_id=request_id,
        )

        return {
            'data': parsed,
            'request_id': request_id,
            'model': model,
            'tokens': total_tokens,
            'cost_usd': round(cost, 6),
            'latency_ms': latency_ms,
        }

    except Exception as exc:
        latency_ms = int((time.time() - start) * 1000)
        error_msg = str(exc)
        logger.error('OpenAI call failed: %s', error_msg)

        AIInteraction.objects.create(
            interaction_type=interaction_type,
            user_input=user_input,
            context_summary=context_summary[:500],
            full_prompt=f'[SYSTEM]{system_prompt[:200]}...\n[USER]{user_prompt[:500]}...',
            error=error_msg[:1000],
            model_used=model,
            latency_ms=latency_ms,
            request_id=request_id,
        )

        return {
            'error': f'AI service error: {error_msg[:200]}',
            'fallback': True,
            'request_id': request_id,
        }


def embed_texts(texts: list[str], model: str = None) -> dict:
    """
    Create embeddings for one or more texts.
    Returns {'embeddings': [...], 'model': '...'} on success, else {'fallback': True, 'error': '...'}.
    """
    if not texts:
        return {'embeddings': [], 'model': model or getattr(settings, 'AI_EMBEDDING_MODEL', 'text-embedding-3-small')}

    client = _get_client()
    if client is None:
        return {'fallback': True, 'error': 'OpenAI client not available (missing API key or package).'}

    model = model or getattr(settings, 'AI_EMBEDDING_MODEL', 'text-embedding-3-small')
    try:
        response = client.embeddings.create(
            model=model,
            input=texts,
            timeout=getattr(settings, 'AI_REQUEST_TIMEOUT_MS', 30000) / 1000,
        )
        vectors = [row.embedding for row in response.data]
        return {'embeddings': vectors, 'model': model}
    except Exception as exc:
        logger.error('OpenAI embedding call failed: %s', exc)
        return {'fallback': True, 'error': str(exc)}
