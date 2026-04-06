from django.db import models
from django.utils import timezone


class InventorySnapshot(models.Model):
    """Daily point-in-time snapshot of each inventory item's state."""
    item = models.ForeignKey('inventory.InventoryItem', on_delete=models.CASCADE, related_name='snapshots')
    snapshot_date = models.DateField(db_index=True)
    quantity = models.IntegerField()
    min_threshold = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=32)
    supplier_name = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ('item', 'snapshot_date')
        ordering = ['-snapshot_date']
        indexes = [
            models.Index(fields=['snapshot_date', 'category']),
        ]


class InventoryMovement(models.Model):
    """Tracks every quantity change: issue, return, restock, adjustment."""
    MOVEMENT_TYPES = [
        ('issue', 'Issue'),
        ('return', 'Return'),
        ('restock', 'Restock'),
        ('adjustment', 'Adjustment'),
    ]
    item = models.ForeignKey('inventory.InventoryItem', on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=16, choices=MOVEMENT_TYPES, db_index=True)
    quantity_delta = models.IntegerField()
    quantity_after = models.IntegerField()
    actor = models.CharField(max_length=255, blank=True)
    reference_type = models.CharField(max_length=32, blank=True)
    reference_id = models.PositiveIntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['item', 'timestamp']),
        ]


class DemandSignal(models.Model):
    """Aggregated demand data per item per period for forecasting."""
    item = models.ForeignKey('inventory.InventoryItem', on_delete=models.CASCADE, related_name='demand_signals')
    period_start = models.DateField()
    period_end = models.DateField()
    total_requested = models.IntegerField(default=0)
    total_issued = models.IntegerField(default=0)
    total_returned = models.IntegerField(default=0)
    unique_requestors = models.IntegerField(default=0)

    class Meta:
        unique_together = ('item', 'period_start')
        ordering = ['-period_start']


class SupplierPerformance(models.Model):
    """Periodic supplier performance metrics."""
    supplier = models.ForeignKey('suppliers.Supplier', on_delete=models.CASCADE, related_name='performance_records')
    period_start = models.DateField()
    period_end = models.DateField()
    items_supplied_count = models.IntegerField(default=0)
    avg_lead_time_days = models.FloatField(null=True, blank=True)
    on_time_delivery_pct = models.FloatField(null=True, blank=True)
    total_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    rating_snapshot = models.DecimalField(max_digits=3, decimal_places=1, default=0)

    class Meta:
        unique_together = ('supplier', 'period_start')
        ordering = ['-period_start']


class KPISnapshot(models.Model):
    """System-wide KPI values computed daily."""
    computed_at = models.DateTimeField(default=timezone.now, db_index=True)
    total_items = models.IntegerField(default=0)
    total_quantity = models.IntegerField(default=0)
    total_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    low_stock_count = models.IntegerField(default=0)
    out_of_stock_count = models.IntegerField(default=0)
    overdue_borrows = models.IntegerField(default=0)
    pending_requests = models.IntegerField(default=0)
    avg_supplier_rating = models.FloatField(default=0)
    inventory_turnover_rate = models.FloatField(default=0)
    fill_rate = models.FloatField(default=0)
    health_score = models.FloatField(default=0)
    category_breakdown = models.JSONField(default=dict)
    details = models.JSONField(default=dict)

    class Meta:
        ordering = ['-computed_at']
