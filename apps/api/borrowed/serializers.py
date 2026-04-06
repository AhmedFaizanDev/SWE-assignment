from django.utils import timezone
from rest_framework import serializers
from .models import BorrowedItem


class BorrowedItemSerializer(serializers.ModelSerializer):
    """Output camelCase: id, itemId, equipmentName, borrowedBy, borrowDate, expectedReturnDate, actualReturnDate?, status. quantity optional for frontend."""
    itemId = serializers.IntegerField(source='item_id', read_only=True)
    equipmentName = serializers.CharField(source='item.name', read_only=True)
    borrowedBy = serializers.CharField(source='borrowed_by')
    borrowDate = serializers.DateField(source='borrow_date')
    expectedReturnDate = serializers.DateField(source='expected_return_date')
    actualReturnDate = serializers.DateField(source='actual_return_date', allow_null=True, required=False)

    class Meta:
        model = BorrowedItem
        fields = [
            'id', 'itemId', 'equipmentName', 'quantity', 'borrowedBy', 'borrowDate',
            'expectedReturnDate', 'actualReturnDate', 'status',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        data['itemId'] = str(instance.item_id)
        data['equipmentName'] = instance.item.name
        data['borrowDate'] = instance.borrow_date.isoformat()
        data['expectedReturnDate'] = instance.expected_return_date.isoformat()
        if instance.actual_return_date:
            data['actualReturnDate'] = instance.actual_return_date.isoformat()
        else:
            data['actualReturnDate'] = None
        # Expose Overdue when applicable (computed on read)
        if instance.status == 'Active' and instance.expected_return_date < timezone.now().date():
            data['status'] = 'Overdue'
        return data
