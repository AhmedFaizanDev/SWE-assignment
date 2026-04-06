"""
Risk scoring and alert generation engine.
Run via management command or scheduled task.
"""
from django.db.models import Sum, F, Q
from django.utils import timezone

from borrowed.models import BorrowedItem
from inventory.models import InventoryItem
from item_requests.models import ItemRequest
from suppliers.models import Supplier
from .models import RiskScore, Alert


def compute_all_risks():
    """Compute risk scores and generate alerts for all items and suppliers."""
    today = timezone.now().date()
    score_objects = []
    alerts = []

    score_objects.extend(_stockout_risks(today))
    score_objects.extend(_overstock_risks())
    score_objects.extend(_supplier_risks())

    RiskScore.objects.filter(computed_at__date=today).delete()
    Alert.objects.filter(status='active', created_at__date=today).delete()

    for score in score_objects:
        score.save()
        alert = _score_to_alert(score)
        if alert:
            alert.save()
            alerts.append(alert)

    return len(score_objects), len(alerts)


def _stockout_risks(today):
    """Compute stockout risk for each item based on quantity vs threshold and demand."""
    scores = []
    since_30d = today - timezone.timedelta(days=30)
    items = InventoryItem.objects.all()

    for item in items:
        demand_30d = ItemRequest.objects.filter(
            item=item, request_date__gte=since_30d, status='Issued',
        ).aggregate(s=Sum('requested_qty'))['s'] or 0

        daily_demand = demand_30d / 30.0 if demand_30d > 0 else 0
        days_of_stock = item.quantity / daily_demand if daily_demand > 0 else 999

        if item.quantity == 0:
            risk = 1.0
        elif item.min_threshold > 0 and item.quantity <= item.min_threshold // 2:
            risk = 0.85
        elif item.min_threshold > 0 and item.quantity <= item.min_threshold:
            risk = 0.6
        elif days_of_stock < 7:
            risk = 0.7
        elif days_of_stock < 14:
            risk = 0.4
        else:
            risk = max(0, 0.1 - (days_of_stock / 100))

        scores.append(RiskScore(
            risk_type='stockout',
            item=item,
            score=round(risk, 3),
            factors={
                'quantity': item.quantity,
                'minThreshold': item.min_threshold,
                'demand30d': demand_30d,
                'dailyDemand': round(daily_demand, 2),
                'daysOfStock': round(days_of_stock, 1),
            },
        ))
    return scores


def _overstock_risks():
    scores = []
    items = InventoryItem.objects.all()

    for item in items:
        if item.min_threshold <= 0:
            continue
        ratio = item.quantity / item.min_threshold
        if ratio > 5:
            risk = min(0.9, 0.5 + (ratio - 5) * 0.05)
        elif ratio > 3:
            risk = 0.3 + (ratio - 3) * 0.1
        else:
            risk = 0

        if risk > 0:
            scores.append(RiskScore(
                risk_type='overstock',
                item=item,
                score=round(risk, 3),
                factors={
                    'quantity': item.quantity,
                    'minThreshold': item.min_threshold,
                    'stockRatio': round(ratio, 2),
                    'carryingCost': round(float(item.unit_price) * item.quantity * 0.02, 2),
                },
            ))
    return scores


def _supplier_risks():
    scores = []
    suppliers = Supplier.objects.all()

    for sup in suppliers:
        item_count = sup.inventory_items.count()
        risk = 0

        if sup.rating < 2:
            risk = 0.8
        elif sup.rating < 3:
            risk = 0.5
        elif sup.rating < 3.5:
            risk = 0.2

        if item_count == 0 and sup.total_orders > 0:
            risk = max(risk, 0.3)

        if risk > 0:
            scores.append(RiskScore(
                risk_type='supplier_delay',
                supplier=sup,
                score=round(risk, 3),
                factors={
                    'rating': float(sup.rating),
                    'totalOrders': sup.total_orders,
                    'itemCount': item_count,
                },
            ))
    return scores


def _humanize_message(score: RiskScore) -> str:
    """Plain-language alert body for operators (no raw Python dicts)."""
    f = score.factors or {}
    name = score.item.name if score.item else (score.supplier.name if score.supplier else 'Target')
    pct = int(round(score.score * 100))

    if score.risk_type == 'stockout':
        qty = f.get('quantity', 0)
        mt = f.get('minThreshold', 0)
        dos = f.get('daysOfStock', 999)
        dd = f.get('dailyDemand', 0)
        if qty == 0:
            return f'{name} is out of stock. Risk score {pct}%. Restock before approving new issues or requests.'
        if dos < 999 and dd and dd > 0:
            return (
                f'{name} may run low soon (risk {pct}%). On hand: {qty} units, min threshold: {mt}. '
                f'Estimated ~{dos:.0f} days of cover at recent demand (~{dd:.1f} units/day).'
            )
        return f'{name} is at or below its minimum threshold (risk {pct}%). Quantity {qty}, threshold {mt}.'

    if score.risk_type == 'overstock':
        ratio = f.get('stockRatio', 0)
        qty = f.get('quantity', 0)
        mt = f.get('minThreshold', 0)
        carry = f.get('carryingCost', 0)
        return (
            f'{name} is stocked at {ratio}× the minimum threshold (risk {pct}%). '
            f'You hold {qty} units vs a threshold of {mt}. Rough carrying-cost signal: ~${carry:.2f} (2% of line value/month rule of thumb).'
        )

    if score.risk_type == 'supplier_delay':
        rating = f.get('rating', 0)
        orders = f.get('totalOrders', 0)
        ic = f.get('itemCount', 0)
        if ic == 0 and orders > 0:
            return (
                f'{name} has no inventory items linked in the catalog but shows {orders} recorded orders (risk {pct}%). '
                f'Link SKUs or verify the supplier record so procurement analytics stay accurate.'
            )
        return (
            f'{name} shows elevated supplier-risk score ({pct}%) based on rating {rating}/5 and {orders} orders on record. '
            f'Consider backup vendors for critical parts.'
        )

    if score.risk_type == 'demand_spike':
        return f'Unusual demand pattern for {name} (risk {pct}%). Review forecasts and safety stock.'

    return f'{score.risk_type.replace("_", " ").title()} risk for {name} is {pct}% based on the latest scoring run.'


def _score_to_alert(score: RiskScore):
    if score.score < 0.3:
        return None

    if score.score >= 0.7:
        severity = 'critical'
    elif score.score >= 0.5:
        severity = 'warning'
    else:
        severity = 'info'

    target_name = ''
    if score.item:
        target_name = score.item.name
    elif score.supplier:
        target_name = score.supplier.name

    title_map = {
        'stockout': f'Stockout risk: {target_name}',
        'overstock': f'Overstock detected: {target_name}',
        'supplier_delay': f'Supplier risk: {target_name}',
        'demand_spike': f'Demand spike: {target_name}',
    }

    return Alert(
        title=title_map.get(score.risk_type, f'Risk: {target_name}'),
        message=_humanize_message(score),
        severity=severity,
        alert_type=score.risk_type,
        item=score.item,
        supplier=score.supplier,
        risk_score=score,
        details=score.factors,
    )
