from rest_framework import serializers
from .models import Alert, RiskScore


class RiskScoreSerializer(serializers.ModelSerializer):
    riskType = serializers.CharField(source='risk_type')
    itemId = serializers.SerializerMethodField()
    itemName = serializers.SerializerMethodField()
    supplierId = serializers.SerializerMethodField()
    supplierName = serializers.SerializerMethodField()
    computedAt = serializers.DateTimeField(source='computed_at')

    class Meta:
        model = RiskScore
        fields = [
            'id', 'riskType', 'itemId', 'itemName', 'supplierId', 'supplierName',
            'score', 'factors', 'computedAt',
        ]

    def get_itemId(self, obj):
        return str(obj.item_id) if obj.item_id else None

    def get_itemName(self, obj):
        return obj.item.name if obj.item_id else None

    def get_supplierId(self, obj):
        return str(obj.supplier_id) if obj.supplier_id else None

    def get_supplierName(self, obj):
        return obj.supplier.name if obj.supplier_id else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        data['computedAt'] = instance.computed_at.isoformat()
        return data


class AlertSerializer(serializers.ModelSerializer):
    alertType = serializers.CharField(source='alert_type')
    itemId = serializers.SerializerMethodField()
    itemName = serializers.SerializerMethodField()
    supplierId = serializers.SerializerMethodField()
    supplierName = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at')
    resolvedAt = serializers.DateTimeField(source='resolved_at', allow_null=True)
    riskScore = serializers.SerializerMethodField()

    class Meta:
        model = Alert
        fields = [
            'id', 'title', 'message', 'severity', 'status', 'alertType',
            'itemId', 'itemName', 'supplierId', 'supplierName',
            'riskScore', 'details', 'createdAt', 'resolvedAt',
        ]

    def get_itemId(self, obj):
        return str(obj.item_id) if obj.item_id else None

    def get_itemName(self, obj):
        return obj.item.name if obj.item_id else None

    def get_supplierId(self, obj):
        return str(obj.supplier_id) if obj.supplier_id else None

    def get_supplierName(self, obj):
        return obj.supplier.name if obj.supplier_id else None

    def get_riskScore(self, obj):
        return obj.risk_score.score if obj.risk_score else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        data['createdAt'] = instance.created_at.isoformat()
        if instance.resolved_at:
            data['resolvedAt'] = instance.resolved_at.isoformat()
        return data
