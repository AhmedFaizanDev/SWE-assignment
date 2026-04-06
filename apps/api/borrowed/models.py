from django.db import models

from inventory.models import InventoryItem

STATUS_CHOICES = [
    ('Active', 'Active'),
    ('Returned', 'Returned'),
    ('Overdue', 'Overdue'),
]


class BorrowedItem(models.Model):
    """Borrowed equipment. Frontend: id, itemId, equipmentName, borrowedBy, borrowDate, expectedReturnDate, actualReturnDate?, status. quantity used for return stock correction."""
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, related_name='borrowed_records')
    quantity = models.PositiveIntegerField(default=1)
    borrowed_by = models.CharField(max_length=255)
    borrow_date = models.DateField()
    expected_return_date = models.DateField()
    actual_return_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')

    class Meta:
        ordering = ['-borrow_date']

    def __str__(self):
        return f'{self.item.name} x{self.quantity} by {self.borrowed_by}'
