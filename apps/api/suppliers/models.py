from django.db import models


class Supplier(models.Model):
    """Supplier model. items_supplied stored as JSON array for PostgreSQL."""
    name = models.CharField(max_length=255, unique=True)
    contact_person = models.CharField(max_length=255, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    items_supplied = models.JSONField(default=list)  # list of strings
    last_purchase_date = models.DateField(null=True, blank=True)
    total_orders = models.IntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name
