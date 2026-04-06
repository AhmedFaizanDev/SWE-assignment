from rest_framework import serializers
from inventory.models import InventoryItem
from .models import ItemRequest


class ItemRequestSerializer(serializers.ModelSerializer):
    """Output camelCase: id, itemId, itemName, requestedQty, requestedBy, requestDate, status, notes."""
    itemId = serializers.PrimaryKeyRelatedField(queryset=InventoryItem.objects.all(), source='item')
    itemName = serializers.CharField(source='item.name', read_only=True)
    requestedQty = serializers.IntegerField(source='requested_qty')
    requestedBy = serializers.CharField(source='requested_by')
    requestDate = serializers.DateField(source='request_date')

    class Meta:
        model = ItemRequest
        fields = ['id', 'itemId', 'itemName', 'requestedQty', 'requestedBy', 'requestDate', 'status', 'notes']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        data['itemId'] = str(instance.item_id)
        data['itemName'] = instance.item.name
        data['requestDate'] = instance.request_date.isoformat()
        return data

    def validate_requestedQty(self, value):
        if value < 1:
            raise serializers.ValidationError('Requested quantity must be at least 1.')
        return value
