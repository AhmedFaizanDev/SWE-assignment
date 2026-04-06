from django.db.models import Sum, Avg, Count, F, Q
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from borrowed.models import BorrowedItem
from inventory.models import InventoryItem
from item_requests.models import ItemRequest
from suppliers.models import Supplier
from .models import KPISnapshot, InventoryMovement, DemandSignal, SupplierPerformance
from .serializers import KPISnapshotSerializer, InventoryMovementSerializer, DemandSignalSerializer, SupplierPerformanceSerializer


@api_view(['GET'])
def kpi_latest(request):
    """Return the most recent KPI snapshot, or compute one live."""
    latest = KPISnapshot.objects.first()
    if latest:
        return Response(KPISnapshotSerializer(latest).data)
    return Response(_compute_kpi_live())


@api_view(['GET'])
def kpi_history(request):
    """Return recent KPI snapshots for trend charts."""
    days = int(request.query_params.get('days', '30'))
    days = min(days, 365)
    since = timezone.now() - timezone.timedelta(days=days)
    qs = KPISnapshot.objects.filter(computed_at__gte=since)
    return Response(KPISnapshotSerializer(qs, many=True).data)


@api_view(['GET'])
def movements_list(request):
    """Recent inventory movements."""
    limit = min(int(request.query_params.get('limit', '50')), 200)
    item_id = request.query_params.get('itemId')
    qs = InventoryMovement.objects.select_related('item').all()
    if item_id:
        qs = qs.filter(item_id=item_id)
    return Response(InventoryMovementSerializer(qs[:limit], many=True).data)


@api_view(['GET'])
def demand_signals(request):
    """Demand signals for forecasting."""
    item_id = request.query_params.get('itemId')
    qs = DemandSignal.objects.select_related('item').all()
    if item_id:
        qs = qs.filter(item_id=item_id)
    return Response(DemandSignalSerializer(qs[:60], many=True).data)


@api_view(['GET'])
def supplier_performance(request):
    """Supplier performance records."""
    supplier_id = request.query_params.get('supplierId')
    qs = SupplierPerformance.objects.select_related('supplier').all()
    if supplier_id:
        qs = qs.filter(supplier_id=supplier_id)
    return Response(SupplierPerformanceSerializer(qs[:60], many=True).data)


@api_view(['GET'])
def stock_health(request):
    """Live stock health breakdown."""
    items = InventoryItem.objects.select_related('supplier').all()
    today = timezone.now().date()

    result = {
        'totalItems': 0,
        'totalQuantity': 0,
        'totalValue': 0,
        'outOfStock': [],
        'critical': [],
        'lowStock': [],
        'healthy': [],
        'overStocked': [],
    }

    for item in items:
        result['totalItems'] += 1
        result['totalQuantity'] += item.quantity
        result['totalValue'] += float(item.unit_price * item.quantity)

        entry = {
            'id': str(item.pk),
            'name': item.name,
            'category': item.category,
            'quantity': item.quantity,
            'minThreshold': item.min_threshold,
            'unitPrice': float(item.unit_price),
            'supplier': item.supplier.name if item.supplier else '',
        }

        if item.quantity == 0:
            result['outOfStock'].append(entry)
        elif item.min_threshold > 0 and item.quantity <= item.min_threshold // 2:
            result['critical'].append(entry)
        elif item.min_threshold > 0 and item.quantity <= item.min_threshold:
            result['lowStock'].append(entry)
        elif item.min_threshold > 0 and item.quantity > item.min_threshold * 3:
            result['overStocked'].append(entry)
        else:
            result['healthy'].append(entry)

    return Response(result)


def _compute_kpi_live():
    """Compute KPIs from live data without persisting."""
    today = timezone.now().date()
    items = InventoryItem.objects.all()

    total_items = items.count()
    agg = items.aggregate(
        total_qty=Sum('quantity'),
        total_val=Sum(F('quantity') * F('unit_price')),
    )
    total_quantity = agg['total_qty'] or 0
    total_value = float(agg['total_val'] or 0)
    low_stock = items.filter(quantity__gt=0, quantity__lte=F('min_threshold')).count()
    out_of_stock = items.filter(quantity=0).count()

    overdue = BorrowedItem.objects.filter(
        status='Active', expected_return_date__lt=today
    ).count()

    pending = ItemRequest.objects.filter(status='Pending').count()

    avg_rating = Supplier.objects.aggregate(avg=Avg('rating'))['avg'] or 0

    issued_30d = BorrowedItem.objects.filter(
        borrow_date__gte=today - timezone.timedelta(days=30)
    ).aggregate(s=Sum('quantity'))['s'] or 0
    turnover = round(issued_30d / max(total_quantity, 1), 3)

    total_requests = ItemRequest.objects.filter(
        request_date__gte=today - timezone.timedelta(days=30)
    ).count()
    fulfilled = ItemRequest.objects.filter(
        request_date__gte=today - timezone.timedelta(days=30),
        status='Issued',
    ).count()
    fill_rate = round(fulfilled / max(total_requests, 1), 3)

    risk_items = low_stock + out_of_stock
    health_score = round(max(0, 100 - (risk_items / max(total_items, 1)) * 100 - overdue * 2), 1)

    cats = {}
    for item in items:
        cat = item.category
        if cat not in cats:
            cats[cat] = {'count': 0, 'quantity': 0, 'value': 0}
        cats[cat]['count'] += 1
        cats[cat]['quantity'] += item.quantity
        cats[cat]['value'] += float(item.unit_price * item.quantity)

    return {
        'totalItems': total_items,
        'totalQuantity': total_quantity,
        'totalValue': total_value,
        'lowStockCount': low_stock,
        'outOfStockCount': out_of_stock,
        'overdueBorrows': overdue,
        'pendingRequests': pending,
        'avgSupplierRating': round(float(avg_rating), 1),
        'inventoryTurnoverRate': turnover,
        'fillRate': fill_rate,
        'healthScore': health_score,
        'categoryBreakdown': cats,
    }
