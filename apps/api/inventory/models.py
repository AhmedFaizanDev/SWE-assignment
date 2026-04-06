from django.db import models

from suppliers.models import Supplier

CATEGORY_CHOICES = [
    ('Electronics', 'Electronics'),
    ('Mechanical', 'Mechanical'),
    ('Tools', 'Tools'),
    ('Consumables', 'Consumables'),
]


class InventoryItem(models.Model):
    """Inventory item. Frontend expects id, name, category, quantity, min_threshold, location, supplier (name), purchase_date, notes, unit_price."""
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
    quantity = models.PositiveIntegerField(default=0)
    min_threshold = models.PositiveIntegerField(default=0)
    location = models.CharField(max_length=255, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_items')
    purchase_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return self.name
