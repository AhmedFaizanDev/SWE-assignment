"""
Compute and persist analytics snapshots, demand signals, supplier performance, and KPIs.
Run: python manage.py compute_analytics
Designed to run daily via cron / Celery beat / Coolify scheduled task.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Sum, Avg, Count, F, Q
from django.utils import timezone

from analytics.models import (
    InventorySnapshot, DemandSignal, SupplierPerformance, KPISnapshot,
)
from borrowed.models import BorrowedItem
from inventory.models import InventoryItem
from item_requests.models import ItemRequest
from suppliers.models import Supplier


class Command(BaseCommand):
    help = 'Compute daily analytics snapshots, demand signals, supplier performance, and KPIs.'

    def handle(self, *args, **options):
        today = timezone.now().date()
        self._snapshot_inventory(today)
        self._compute_demand_signals(today)
        self._compute_supplier_performance(today)
        self._compute_kpi(today)
        self.stdout.write(self.style.SUCCESS(f'Analytics computed for {today}.'))

    def _snapshot_inventory(self, today):
        items = InventoryItem.objects.select_related('supplier').all()
        snapshots = []
        for item in items:
            snapshots.append(InventorySnapshot(
                item=item,
                snapshot_date=today,
                quantity=item.quantity,
                min_threshold=item.min_threshold,
                unit_price=item.unit_price,
                category=item.category,
                supplier_name=item.supplier.name if item.supplier else '',
            ))
        InventorySnapshot.objects.filter(snapshot_date=today).delete()
        InventorySnapshot.objects.bulk_create(snapshots)
        self.stdout.write(f'  Snapshotted {len(snapshots)} items.')

    def _compute_demand_signals(self, today):
        period_start = today - timedelta(days=30)
        items = InventoryItem.objects.all()
        signals = []
        for item in items:
            requests = ItemRequest.objects.filter(
                item=item, request_date__gte=period_start, request_date__lte=today,
            )
            total_requested = requests.aggregate(s=Sum('requested_qty'))['s'] or 0
            total_issued = requests.filter(status='Issued').aggregate(s=Sum('requested_qty'))['s'] or 0
            total_returned = BorrowedItem.objects.filter(
                item=item, status='Returned',
                actual_return_date__gte=period_start, actual_return_date__lte=today,
            ).aggregate(s=Sum('quantity'))['s'] or 0
            unique = requests.values('requested_by').distinct().count()

            signals.append(DemandSignal(
                item=item,
                period_start=period_start,
                period_end=today,
                total_requested=total_requested,
                total_issued=total_issued,
                total_returned=total_returned,
                unique_requestors=unique,
            ))

        DemandSignal.objects.filter(period_start=period_start).delete()
        DemandSignal.objects.bulk_create(signals)
        self.stdout.write(f'  Computed demand signals for {len(signals)} items.')

    def _compute_supplier_performance(self, today):
        period_start = today - timedelta(days=30)
        suppliers = Supplier.objects.all()
        records = []
        for sup in suppliers:
            item_count = sup.inventory_items.count()
            total_val = sup.inventory_items.aggregate(
                v=Sum(F('quantity') * F('unit_price'))
            )['v'] or 0
            records.append(SupplierPerformance(
                supplier=sup,
                period_start=period_start,
                period_end=today,
                items_supplied_count=item_count,
                total_value=total_val,
                rating_snapshot=sup.rating,
            ))

        SupplierPerformance.objects.filter(period_start=period_start).delete()
        SupplierPerformance.objects.bulk_create(records)
        self.stdout.write(f'  Computed supplier performance for {len(records)} suppliers.')

    def _compute_kpi(self, today):
        items = InventoryItem.objects.all()
        total_items = items.count()
        agg = items.aggregate(
            total_qty=Sum('quantity'),
            total_val=Sum(F('quantity') * F('unit_price')),
        )
        total_quantity = agg['total_qty'] or 0
        total_value = agg['total_val'] or 0

        low_stock = items.filter(quantity__gt=0, quantity__lte=F('min_threshold')).count()
        out_of_stock = items.filter(quantity=0).count()

        overdue = BorrowedItem.objects.filter(
            status='Active', expected_return_date__lt=today,
        ).count()
        pending = ItemRequest.objects.filter(status='Pending').count()
        avg_rating = Supplier.objects.aggregate(avg=Avg('rating'))['avg'] or 0

        issued_30d = BorrowedItem.objects.filter(
            borrow_date__gte=today - timedelta(days=30),
        ).aggregate(s=Sum('quantity'))['s'] or 0
        turnover = round(issued_30d / max(total_quantity, 1), 3)

        total_requests = ItemRequest.objects.filter(
            request_date__gte=today - timedelta(days=30),
        ).count()
        fulfilled = ItemRequest.objects.filter(
            request_date__gte=today - timedelta(days=30), status='Issued',
        ).count()
        fill_rate = round(fulfilled / max(total_requests, 1), 3)

        risk_items = low_stock + out_of_stock
        health = round(max(0, 100 - (risk_items / max(total_items, 1)) * 100 - overdue * 2), 1)

        cats = {}
        for item in items:
            cat = item.category
            if cat not in cats:
                cats[cat] = {'count': 0, 'quantity': 0, 'value': 0}
            cats[cat]['count'] += 1
            cats[cat]['quantity'] += item.quantity
            cats[cat]['value'] += float(item.unit_price * item.quantity)

        KPISnapshot.objects.create(
            total_items=total_items,
            total_quantity=total_quantity,
            total_value=total_value,
            low_stock_count=low_stock,
            out_of_stock_count=out_of_stock,
            overdue_borrows=overdue,
            pending_requests=pending,
            avg_supplier_rating=float(avg_rating),
            inventory_turnover_rate=turnover,
            fill_rate=fill_rate,
            health_score=health,
            category_breakdown=cats,
            details={
                'issued_30d': issued_30d,
                'total_requests_30d': total_requests,
                'fulfilled_30d': fulfilled,
            },
        )
        self.stdout.write(f'  KPI snapshot saved (health={health}).')
