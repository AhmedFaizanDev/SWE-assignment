"""
Build grounding context from live database state for AI prompts.
PII is redacted: user names are replaced with anonymized labels.
Context strings are kept compact to minimise token cost.
"""
from django.db.models import Sum
from django.utils import timezone

from borrowed.models import BorrowedItem
from inventory.models import InventoryItem
from item_requests.models import ItemRequest
from suppliers.models import Supplier
from activity.models import ActivityEntry


def _anonymize(name: str, seen: dict) -> str:
    if name not in seen:
        seen[name] = f'U{len(seen) + 1}'
    return seen[name]


def build_full_context() -> str:
    """Compact context string for general queries (fallback when RAG finds nothing)."""
    parts = [
        build_inventory_summary(),
        build_activity_summary(),
        build_supplier_summary(),
        build_borrowed_summary(),
    ]
    return '\n'.join(p for p in parts if p)


def build_inventory_summary() -> str:
    items = InventoryItem.objects.select_related('supplier').all()
    if not items.exists():
        return 'Inventory: empty.'

    cats: dict[str, dict] = {}
    total_val = 0
    low_stock: list[str] = []
    out_of_stock: list[str] = []

    for item in items:
        cat = item.category
        if cat not in cats:
            cats[cat] = {'n': 0, 'q': 0}
        cats[cat]['n'] += 1
        cats[cat]['q'] += item.quantity
        total_val += float(item.unit_price * item.quantity)

        if item.quantity == 0:
            out_of_stock.append(item.name)
        elif item.min_threshold > 0 and item.quantity <= item.min_threshold:
            low_stock.append(f'{item.name}({item.quantity}/{item.min_threshold})')

    lines = [f'Inv: {items.count()} items, ${total_val:,.0f} value']
    lines.append(' | '.join(f'{c}:{d["n"]}items/{d["q"]}units' for c, d in cats.items()))
    if out_of_stock:
        lines.append(f'OOS: {", ".join(out_of_stock[:8])}')
    if low_stock:
        lines.append(f'Low: {", ".join(low_stock[:8])}')
    return '\n'.join(lines)


def build_activity_summary() -> str:
    since = timezone.now() - timezone.timedelta(days=30)
    entries = ActivityEntry.objects.filter(timestamp__gte=since)
    counts: dict[str, int] = {}
    for e in entries:
        counts[e.type] = counts.get(e.type, 0) + 1

    if not counts:
        return 'Activity(30d): none.'

    return 'Activity(30d): ' + ', '.join(f'{t}:{c}' for t, c in sorted(counts.items(), key=lambda x: -x[1]))


def build_supplier_summary() -> str:
    suppliers = Supplier.objects.all()
    if not suppliers.exists():
        return 'Suppliers: none.'

    lines = ['Suppliers:']
    for s in suppliers[:15]:
        item_count = s.inventory_items.count()
        lines.append(f'  {s.name} r{s.rating}/5 {item_count}items {s.total_orders}orders')
    return '\n'.join(lines)


def build_borrowed_summary() -> str:
    today = timezone.now().date()
    active = BorrowedItem.objects.filter(status='Active').select_related('item')
    overdue = [b for b in active if b.expected_return_date and b.expected_return_date < today]
    seen: dict[str, str] = {}

    parts = [f'Borrowed: {active.count()} active, {len(overdue)} overdue']
    for b in overdue[:5]:
        days_late = (today - b.expected_return_date).days
        parts.append(f'  {b.item.name} by {_anonymize(b.borrowed_by, seen)}: {days_late}d late')
    return '\n'.join(parts)


def build_insights_summary(insights) -> str:
    """Compact summary of insight records for suggestion generation."""
    if not insights:
        return 'No active insights.'
    lines = []
    for i in insights[:5]:
        lines.append(f'[{i.severity}] {i.title}: {i.recommended_action[:120]}' if i.recommended_action else f'[{i.severity}] {i.title}')
    return '\n'.join(lines)


def build_item_context(item_id: int) -> dict:
    """Build context for a specific item (for simulation)."""
    try:
        item = InventoryItem.objects.select_related('supplier').get(pk=item_id)
    except InventoryItem.DoesNotExist:
        return {}

    since_90d = timezone.now().date() - timezone.timedelta(days=90)
    requests = ItemRequest.objects.filter(item=item, request_date__gte=since_90d)

    total_requested = requests.aggregate(s=Sum('requested_qty'))['s'] or 0
    total_issued = requests.filter(status='Issued').aggregate(s=Sum('requested_qty'))['s'] or 0

    return {
        'item_details': f'{item.name} | {item.category} | {item.location}',
        'demand_history': f'{total_requested} requested, {total_issued} issued, {requests.count()} requests (90d)',
        'current_quantity': item.quantity,
        'min_threshold': item.min_threshold,
        'unit_price': f'{item.unit_price:.2f}',
        'supplier_info': f'{item.supplier.name} r{item.supplier.rating}/5, {item.supplier.total_orders} orders' if item.supplier else 'No supplier',
    }
