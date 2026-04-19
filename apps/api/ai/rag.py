"""
Persistent RAG indexing + retrieval for chatbot grounding.

Token-cost notes:
- Chunk text is kept under 200 chars to limit context window usage.
- Default retrieval limit is 5 (not 8) to cap prompt tokens.
- Query embeddings are cached for 5 min to avoid duplicate OpenAI calls.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import math
import re
from collections import Counter

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from activity.models import ActivityEntry
from borrowed.models import BorrowedItem
from inventory.models import InventoryItem
from item_requests.models import ItemRequest
from suppliers.models import Supplier
from alerts.models import Alert

from .client import embed_texts
from .models import KnowledgeChunk

QUERY_EMBED_CACHE_TTL = 300  # 5 minutes

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how",
    "in", "is", "it", "of", "on", "or", "that", "the", "to", "was", "were",
    "what", "when", "where", "which", "who", "why", "with", "show", "list",
    "about", "me", "our", "we", "you", "your", "please", "can", "could",
}


@dataclass(frozen=True)
class RawChunk:
    chunk_key: str
    source: str
    title: str
    text: str
    metadata: dict


@dataclass(frozen=True)
class RetrievedChunk:
    chunk_id: str
    source: str
    title: str
    text: str
    score: float


def _tokens(text: str) -> list[str]:
    raw = re.findall(r"[a-z0-9]+", (text or "").lower())
    return [t for t in raw if len(t) > 1 and t not in STOPWORDS]


def _text_hash(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b):
        dot += x * y
        na += x * x
        nb += y * y
    if na == 0 or nb == 0:
        return 0.0
    return dot / (math.sqrt(na) * math.sqrt(nb))


def _format_chunk_line(prefix: str, source: str, title: str, body: str, max_len: int = 180) -> str:
    body = " ".join(body.split())
    if len(body) > max_len:
        body = f"{body[:max_len - 3]}..."
    return f"{prefix} [{source}] {title}: {body}"


def build_live_chunks() -> list[RawChunk]:
    """Build compact text chunks from live DB records.
    Chunk text is kept short (~100-180 chars) to minimise embedding + prompt tokens."""
    chunks: list[RawChunk] = []

    for item in InventoryItem.objects.select_related("supplier").all():
        supplier_name = item.supplier.name if item.supplier else "none"
        risk = "OOS" if item.quantity == 0 else ("low" if item.quantity <= item.min_threshold else "ok")
        text = (
            f"{item.name} ({item.category}) @ {item.location}. "
            f"qty {item.quantity}/{item.min_threshold} ${item.unit_price}. "
            f"Supplier: {supplier_name}. {risk}."
        )
        chunks.append(RawChunk(
            chunk_key=f"inventory:{item.id}", source="inventory",
            title=item.name, text=text,
            metadata={"itemId": item.id, "category": item.category},
        ))

    for supplier in Supplier.objects.all():
        text = f"{supplier.name} r{supplier.rating}/5, {supplier.total_orders} orders. {supplier.contact_person}, {supplier.email}."
        chunks.append(RawChunk(
            chunk_key=f"supplier:{supplier.id}", source="suppliers",
            title=supplier.name, text=text,
            metadata={"supplierId": supplier.id},
        ))

    for req in ItemRequest.objects.select_related("item").order_by("-request_date")[:60]:
        item_name = req.item.name if req.item else req.item_name
        text = f"Req {req.id}: {item_name} x{req.requested_qty}, {req.status}, by {req.requested_by} {req.request_date}."
        chunks.append(RawChunk(
            chunk_key=f"request:{req.id}", source="requests",
            title=f"Req {req.id}", text=text,
            metadata={"requestId": req.id, "status": req.status},
        ))

    today = timezone.now().date()
    for b in BorrowedItem.objects.select_related("item").order_by("-borrow_date")[:60]:
        item_name = b.item.name if b.item else "?"
        overdue_days = max(0, (today - b.expected_return_date).days) if b.expected_return_date else 0
        tag = f"{overdue_days}d late" if overdue_days > 0 and b.status == "Active" else b.status
        text = f"Borrow {b.id}: {item_name} by {b.borrowed_by}, {tag}, return {b.expected_return_date}."
        chunks.append(RawChunk(
            chunk_key=f"borrowed:{b.id}", source="borrowed",
            title=f"Borrow {b.id}", text=text,
            metadata={"borrowId": b.id, "status": b.status},
        ))

    for alert in Alert.objects.select_related("item", "supplier", "risk_score").order_by("-created_at")[:40]:
        target = alert.item.name if alert.item else (alert.supplier.name if alert.supplier else "N/A")
        score = alert.risk_score.score if alert.risk_score else None
        score_txt = f"{round(score * 100)}%" if score is not None else "?"
        text = f"Alert: {alert.title} for {target}. {alert.severity}/{alert.status}, risk {score_txt}."
        chunks.append(RawChunk(
            chunk_key=f"alert:{alert.id}", source="alerts",
            title=alert.title, text=text,
            metadata={"alertId": alert.id, "severity": alert.severity, "status": alert.status},
        ))

    for act in ActivityEntry.objects.order_by("-timestamp")[:40]:
        text = f"{act.type} by {act.user} {act.timestamp}: {act.description[:100]}"
        chunks.append(RawChunk(
            chunk_key=f"activity:{act.id}", source="activity",
            title=act.type, text=text,
            metadata={"activityId": act.id, "type": act.type},
        ))

    return chunks


def build_and_store_rag_index(force_reembed: bool = False) -> dict:
    """
    Refresh persistent RAG index from live data.
    Creates/updates active chunks, deactivates stale keys, and (re)embeds changed chunks.
    """
    live_chunks = build_live_chunks()
    now = timezone.now()
    active_keys = {c.chunk_key for c in live_chunks}
    updated_or_created = 0
    embeds_needed: list[tuple[str, str]] = []

    with transaction.atomic():
        # Deactivate stale rows.
        KnowledgeChunk.objects.exclude(chunk_key__in=active_keys).update(is_active=False)

        for c in live_chunks:
            txt_hash = _text_hash(c.text)
            obj, created = KnowledgeChunk.objects.get_or_create(
                chunk_key=c.chunk_key,
                defaults={
                    "source": c.source,
                    "title": c.title[:255],
                    "text": c.text,
                    "text_hash": txt_hash,
                    "metadata": c.metadata,
                    "is_active": True,
                    "created_at": now,
                },
            )
            changed = created or obj.text_hash != txt_hash or obj.title != c.title[:255] or obj.source != c.source
            if created or changed or not obj.is_active:
                obj.source = c.source
                obj.title = c.title[:255]
                obj.text = c.text
                obj.text_hash = txt_hash
                obj.metadata = c.metadata
                obj.is_active = True
                if force_reembed or changed or created:
                    obj.embedding = []
                    obj.embedding_model = ""
                    embeds_needed.append((obj.chunk_key, c.text))
                obj.save()
                updated_or_created += 1
            elif force_reembed or not obj.embedding:
                embeds_needed.append((obj.chunk_key, c.text))

    embedded = 0
    embedding_error = ""
    if embeds_needed:
        payload = [text for _, text in embeds_needed]
        emb = embed_texts(payload)
        if emb.get("fallback"):
            embedding_error = emb.get("error", "Embedding service unavailable")
        else:
            vectors = emb.get("embeddings", [])
            model = emb.get("model", "")
            to_update = []
            for (chunk_key, _), vec in zip(embeds_needed, vectors):
                to_update.append((chunk_key, vec))
            for chunk_key, vec in to_update:
                KnowledgeChunk.objects.filter(chunk_key=chunk_key).update(
                    embedding=vec, embedding_model=model, is_active=True
                )
            embedded = len(to_update)

    active_count = KnowledgeChunk.objects.filter(is_active=True).count()
    return {
        "activeChunks": active_count,
        "updatedOrCreated": updated_or_created,
        "embedded": embedded,
        "embeddingError": embedding_error,
    }


def _lexical_scores(question: str, chunks: list[KnowledgeChunk]) -> dict[str, float]:
    q_tokens = _tokens(question)
    if not q_tokens or not chunks:
        return {}

    token_sets: list[set[str]] = []
    df = Counter()
    for c in chunks:
        toks = set(_tokens(f"{c.title} {c.text}"))
        token_sets.append(toks)
        df.update(toks)

    n_docs = len(chunks)
    scores: dict[str, float] = {}
    q_lower = question.lower()
    for c, toks in zip(chunks, token_sets):
        overlap = set(q_tokens) & toks
        if not overlap:
            continue
        score = 0.0
        for t in overlap:
            idf = math.log((n_docs + 1) / (df[t] + 1)) + 1.0
            score += idf
        haystack = f"{c.title} {c.text}".lower()
        if q_lower in haystack:
            score += 2.5
        score += 0.2 * len(overlap)
        scores[c.chunk_key] = score
    return scores


def _get_query_embedding(question: str) -> list[float]:
    """Get embedding for a query string, using cache to avoid duplicate OpenAI calls."""
    cache_key = f"rag_qembed:{_text_hash(question)}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    emb_result = embed_texts([question])
    if emb_result.get("fallback"):
        return []
    vecs = emb_result.get("embeddings", [])
    vec = vecs[0] if vecs else []
    if vec:
        cache.set(cache_key, vec, QUERY_EMBED_CACHE_TTL)
    return vec


def retrieve_relevant_chunks(question: str, limit: int = 5, auto_index: bool = True) -> list[RetrievedChunk]:
    q = (question or "").strip()
    if not q:
        return []

    if auto_index and not KnowledgeChunk.objects.filter(is_active=True).exists():
        build_and_store_rag_index(force_reembed=False)

    chunks = list(KnowledgeChunk.objects.filter(is_active=True))
    if not chunks:
        return []

    lexical = _lexical_scores(q, chunks)

    # Semantic scores — embedding is cached to avoid repeat API calls.
    semantic: dict[str, float] = {}
    q_vec = _get_query_embedding(q)
    if q_vec:
        for c in chunks:
            if isinstance(c.embedding, list) and c.embedding:
                semantic[c.chunk_key] = _cosine_similarity(q_vec, c.embedding)

    # Hybrid rank.
    ranked: list[tuple[KnowledgeChunk, float]] = []
    lex_max = max(lexical.values()) if lexical else 1.0
    for c in chunks:
        lex_norm = (lexical.get(c.chunk_key, 0.0) / lex_max) if lex_max else 0.0
        sem = semantic.get(c.chunk_key, 0.0)
        hybrid = 0.72 * sem + 0.28 * lex_norm
        if hybrid <= 0 and c.chunk_key not in lexical:
            continue
        ranked.append((c, hybrid))

    ranked.sort(key=lambda x: x[1], reverse=True)
    top = ranked[: max(1, limit)]
    return [
        RetrievedChunk(
            chunk_id=c.chunk_key,
            source=c.source,
            title=c.title,
            text=c.text,
            score=round(score, 4),
        )
        for c, score in top
    ]


def build_rag_context(question: str, limit: int = 5) -> tuple[str, list[RetrievedChunk]]:
    chunks = retrieve_relevant_chunks(question=question, limit=limit, auto_index=True)
    if not chunks:
        return "No relevant records found in knowledge base.", []

    lines = []
    for c in chunks:
        lines.append(_format_chunk_line(c.chunk_id, c.source, c.title, c.text))
    return "\n".join(lines), chunks

