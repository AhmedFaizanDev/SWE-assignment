"""
Build grounding context from live database state for AI prompts.
PII is redacted: user names are replaced with anonymized labels.
"""
from django.db.models import Sum, F, Q
from django.utils import timezone

from borrowed.models import BorrowedItem
from inventory.models import InventoryItem
from item_requests.models import ItemRequest
from suppliers.models import Supplier
from activity.models import ActivityEntry


def _anonymize(name: str, seen: dict) -> str:
    if name not in seen:
        seen[name] = f'User-{len(seen) + 1}'
    return seen[name]


def build_full_context() -> str:
    """Build a comprehensive context string for general queries."""
    parts = [
        build_inventory_summary(),
        build_activity_summary(),
        build_supplier_summary(),
        build_borrowed_summary(),
    ]
    return '\n\n'.join(parts)


def build_inventory_summary() -> str:
    items = InventoryItem.objects.select_related('supplier').all()
    if not items.exists():
        return 'Inventory: No items.'

    lines = ['### Inventory Overview']
    cats = {}
    total_val = 0
    low_stock = []
    out_of_stock = []

    for item in items:
        cat = item.category
        if cat not in cats:
            cats[cat] = {'count': 0, 'qty': 0}
        cats[cat]['count'] += 1
        cats[cat]['qty'] += item.quantity
        total_val += float(item.unit_price * item.quantity)

        if item.quantity == 0:
            out_of_stock.append(item.name)
        elif item.min_threshold > 0 and item.quantity <= item.min_threshold:
            low_stock.append(f'{item.name} ({item.quantity}/{item.min_threshold})')

    lines.append(f'Total items: {items.count()}, Total value: ${total_val:,.2f}')
    for cat, d in cats.items():
        lines.append(f'  {cat}: {d["count"]} items, {d["qty"]} units')

    if out_of_stock:
        lines.append(f'Out of stock: {", ".join(out_of_stock[:10])}')
    if low_stock:
        lines.append(f'Low stock: {", ".join(low_stock[:10])}')

    return '\n'.join(lines)


def build_activity_summary() -> str:
    since = timezone.now() - timezone.timedelta(days=30)
    entries = ActivityEntry.objects.filter(timestamp__gte=since)
    counts = {}
    seen_users = {}

    for e in entries:
        counts[e.type] = counts.get(e.type, 0) + 1

    lines = ['### Recent Activity (30 days)']
    for t, c in sorted(counts.items(), key=lambda x: -x[1]):
        lines.append(f'  {t}: {c} events')

    if not counts:
        lines.append('  No activity in last 30 days.')

    return '\n'.join(lines)


def build_supplier_summary() -> str:
    suppliers = Supplier.objects.all()
    if not suppliers.exists():
        return 'Suppliers: None.'

    lines = ['### Suppliers']
    for s in suppliers:
        item_count = s.inventory_items.count()
        lines.append(f'  {s.name}: rating {s.rating}/5, {item_count} items linked, {s.total_orders} orders')
    return '\n'.join(lines)


def build_borrowed_summary() -> str:
    today = timezone.now().date()
    active = BorrowedItem.objects.filter(status='Active').select_related('item')
    overdue = [b for b in active if b.expected_return_date < today]
    seen = {}

    lines = ['### Borrowed Equipment']
    lines.append(f'Active borrows: {active.count()}')
    lines.append(f'Overdue: {len(overdue)}')

    if overdue:
        for b in overdue[:5]:
            days_late = (today - b.expected_return_date).days
            lines.append(f'  {b.item.name} by {_anonymize(b.borrowed_by, seen)}: {days_late}d overdue')

    return '\n'.join(lines)


def build_item_context(item_id: int) -> dict:
    """Build context for a specific item (for simulation)."""
    try:
        item = InventoryItem.objects.select_related('supplier').get(pk=item_id)
    except InventoryItem.DoesNotExist:
        return {}

    since_90d = timezone.now().date() - timezone.timedelta(days=90)
    requests = ItemRequest.objects.filter(item=item, request_date__gte=since_90d)
    borrows = BorrowedItem.objects.filter(item=item, borrow_date__gte=since_90d)

    total_requested = requests.aggregate(s=Sum('requested_qty'))['s'] or 0
    total_issued = requests.filter(status='Issued').aggregate(s=Sum('requested_qty'))['s'] or 0

    return {
        'item_details': f'{item.name} | {item.category} | Location: {item.location}',
        'demand_history': f'{total_requested} units requested, {total_issued} issued in 90 days ({requests.count()} requests)',
        'current_quantity': item.quantity,
        'min_threshold': item.min_threshold,
        'unit_price': f'{item.unit_price:.2f}',
        'supplier_info': f'{item.supplier.name} (rating: {item.supplier.rating}/5, {item.supplier.total_orders} orders)' if item.supplier else 'No supplier linked',
    }
