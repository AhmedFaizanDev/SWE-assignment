from rest_framework import serializers
from .models import (
    InventorySnapshot, InventoryMovement, DemandSignal,
    SupplierPerformance, KPISnapshot,
)


class InventorySnapshotSerializer(serializers.ModelSerializer):
    itemId = serializers.IntegerField(source='item_id')
    itemName = serializers.CharField(source='item.name', read_only=True)
    snapshotDate = serializers.DateField(source='snapshot_date')
    minThreshold = serializers.IntegerField(source='min_threshold')
    unitPrice = serializers.DecimalField(source='unit_price', max_digits=12, decimal_places=2, coerce_to_string=False)
    supplierName = serializers.CharField(source='supplier_name')

    class Meta:
        model = InventorySnapshot
        fields = ['id', 'itemId', 'itemName', 'snapshotDate', 'quantity', 'minThreshold', 'unitPrice', 'category', 'supplierName']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        return data


class InventoryMovementSerializer(serializers.ModelSerializer):
    itemId = serializers.IntegerField(source='item_id')
    itemName = serializers.CharField(source='item.name', read_only=True)
    movementType = serializers.CharField(source='movement_type')
    quantityDelta = serializers.IntegerField(source='quantity_delta')
    quantityAfter = serializers.IntegerField(source='quantity_after')
    referenceType = serializers.CharField(source='reference_type')
    referenceId = serializers.IntegerField(source='reference_id', allow_null=True)

    class Meta:
        model = InventoryMovement
        fields = ['id', 'itemId', 'itemName', 'movementType', 'quantityDelta', 'quantityAfter', 'actor', 'referenceType', 'referenceId', 'timestamp']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        data['timestamp'] = instance.timestamp.isoformat()
        return data


class DemandSignalSerializer(serializers.ModelSerializer):
    itemId = serializers.IntegerField(source='item_id')
    itemName = serializers.CharField(source='item.name', read_only=True)
    periodStart = serializers.DateField(source='period_start')
    periodEnd = serializers.DateField(source='period_end')
    totalRequested = serializers.IntegerField(source='total_requested')
    totalIssued = serializers.IntegerField(source='total_issued')
    totalReturned = serializers.IntegerField(source='total_returned')
    uniqueRequestors = serializers.IntegerField(source='unique_requestors')

    class Meta:
        model = DemandSignal
        fields = ['id', 'itemId', 'itemName', 'periodStart', 'periodEnd', 'totalRequested', 'totalIssued', 'totalReturned', 'uniqueRequestors']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        return data


class SupplierPerformanceSerializer(serializers.ModelSerializer):
    supplierId = serializers.IntegerField(source='supplier_id')
    supplierName = serializers.CharField(source='supplier.name', read_only=True)
    periodStart = serializers.DateField(source='period_start')
    periodEnd = serializers.DateField(source='period_end')
    itemsSuppliedCount = serializers.IntegerField(source='items_supplied_count')
    avgLeadTimeDays = serializers.FloatField(source='avg_lead_time_days', allow_null=True)
    onTimeDeliveryPct = serializers.FloatField(source='on_time_delivery_pct', allow_null=True)
    totalValue = serializers.DecimalField(source='total_value', max_digits=14, decimal_places=2, coerce_to_string=False)
    ratingSnapshot = serializers.DecimalField(source='rating_snapshot', max_digits=3, decimal_places=1, coerce_to_string=False)

    class Meta:
        model = SupplierPerformance
        fields = [
            'id', 'supplierId', 'supplierName', 'periodStart', 'periodEnd',
            'itemsSuppliedCount', 'avgLeadTimeDays', 'onTimeDeliveryPct',
            'totalValue', 'ratingSnapshot',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        return data


class KPISnapshotSerializer(serializers.ModelSerializer):
    computedAt = serializers.DateTimeField(source='computed_at')
    totalItems = serializers.IntegerField(source='total_items')
    totalQuantity = serializers.IntegerField(source='total_quantity')
    totalValue = serializers.DecimalField(source='total_value', max_digits=14, decimal_places=2, coerce_to_string=False)
    lowStockCount = serializers.IntegerField(source='low_stock_count')
    outOfStockCount = serializers.IntegerField(source='out_of_stock_count')
    overdueBorrows = serializers.IntegerField(source='overdue_borrows')
    pendingRequests = serializers.IntegerField(source='pending_requests')
    avgSupplierRating = serializers.FloatField(source='avg_supplier_rating')
    inventoryTurnoverRate = serializers.FloatField(source='inventory_turnover_rate')
    fillRate = serializers.FloatField(source='fill_rate')
    healthScore = serializers.FloatField(source='health_score')
    categoryBreakdown = serializers.JSONField(source='category_breakdown')

    class Meta:
        model = KPISnapshot
        fields = [
            'id', 'computedAt', 'totalItems', 'totalQuantity', 'totalValue',
            'lowStockCount', 'outOfStockCount', 'overdueBorrows', 'pendingRequests',
            'avgSupplierRating', 'inventoryTurnoverRate', 'fillRate', 'healthScore',
            'categoryBreakdown',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        data['computedAt'] = instance.computed_at.isoformat()
        return data
