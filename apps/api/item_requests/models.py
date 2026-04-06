from django.db import models

from inventory.models import InventoryItem

STATUS_CHOICES = [
    ('Pending', 'Pending'),
    ('Approved', 'Approved'),
    ('Rejected', 'Rejected'),
    ('Issued', 'Issued'),
]


class ItemRequest(models.Model):
    """Item request. Frontend: id, itemId, itemName, requestedQty, requestedBy, requestDate, status, notes."""
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, related_name='requests')
    requested_qty = models.PositiveIntegerField(default=1)
    requested_by = models.CharField(max_length=255)
    request_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-request_date']

    def __str__(self):
        return f'{self.item.name} x{self.requested_qty} by {self.requested_by}'
