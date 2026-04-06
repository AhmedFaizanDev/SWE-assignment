from rest_framework import serializers
from .models import Supplier


class SupplierSerializer(serializers.ModelSerializer):
    """Output camelCase for frontend: id, name, contactPerson, email, phone, address, itemsSupplied, lastPurchaseDate, totalOrders, rating."""
    contactPerson = serializers.CharField(source='contact_person')
    itemsSupplied = serializers.ListField(child=serializers.CharField(), source='items_supplied')
    lastPurchaseDate = serializers.DateField(source='last_purchase_date', allow_null=True)
    totalOrders = serializers.IntegerField(source='total_orders')
    rating = serializers.DecimalField(max_digits=3, decimal_places=1, coerce_to_string=False)

    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'contactPerson', 'email', 'phone', 'address',
            'itemsSupplied', 'lastPurchaseDate', 'totalOrders', 'rating',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        if instance.last_purchase_date:
            data['lastPurchaseDate'] = instance.last_purchase_date.isoformat()
        else:
            data['lastPurchaseDate'] = ''
        return data

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if data.get('lastPurchaseDate') == '':
            data['lastPurchaseDate'] = None
        return super().to_internal_value(data)

    def validate_rating(self, value):
        if value < 0 or value > 5:
            raise serializers.ValidationError('Rating must be between 0 and 5.')
        return value

    def validate_totalOrders(self, value):
        if value < 0:
            raise serializers.ValidationError('Total orders must be >= 0.')
        return value

    def validate_itemsSupplied(self, value):
        if len(value) > 50:
            raise serializers.ValidationError('Maximum 50 items allowed.')
        for item in value:
            if len(item) > 200:
                raise serializers.ValidationError('Each item name must be <= 200 characters.')
        return value
