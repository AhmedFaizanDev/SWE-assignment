from django.contrib import admin
from .models import (
    InventorySnapshot, InventoryMovement, DemandSignal,
    SupplierPerformance, KPISnapshot,
)

admin.site.register(InventorySnapshot)
admin.site.register(InventoryMovement)
admin.site.register(DemandSignal)
admin.site.register(SupplierPerformance)
admin.site.register(KPISnapshot)
