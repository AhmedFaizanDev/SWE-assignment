from rest_framework import serializers
from .models import InventoryItem, CATEGORY_CHOICES


class InventoryItemSerializer(serializers.ModelSerializer):
    """Output camelCase: id, name, category, quantity, minThreshold, location, supplier (name string), purchaseDate, notes, unitPrice."""
    minThreshold = serializers.IntegerField(source='min_threshold')
    purchaseDate = serializers.DateField(source='purchase_date', allow_null=True)
    unitPrice = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False, source='unit_price')
    supplier = serializers.SerializerMethodField()

    class Meta:
        model = InventoryItem
        fields = [
            'id', 'name', 'category', 'quantity', 'minThreshold', 'location',
            'supplier', 'purchaseDate', 'notes', 'unitPrice',
        ]

    def get_supplier(self, obj):
        return obj.supplier.name if obj.supplier_id else ''

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        if instance.purchase_date:
            data['purchaseDate'] = instance.purchase_date.isoformat()
        else:
            data['purchaseDate'] = ''
        return data

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if data.get('purchaseDate') == '':
            data['purchaseDate'] = None
        return super().to_internal_value(data)

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError('Quantity must be >= 0.')
        return value

    def validate_minThreshold(self, value):
        if value < 0:
            raise serializers.ValidationError('Min threshold must be >= 0.')
        return value

    def validate_unitPrice(self, value):
        if value < 0:
            raise serializers.ValidationError('Unit price must be >= 0.')
        return value

    def validate_category(self, value):
        valid = [c[0] for c in CATEGORY_CHOICES]
        if value not in valid:
            raise serializers.ValidationError(f'Must be one of: {", ".join(valid)}.')
        return value
