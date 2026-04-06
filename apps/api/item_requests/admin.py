from django.contrib import admin
from .models import ItemRequest


@admin.register(ItemRequest)
class ItemRequestAdmin(admin.ModelAdmin):
    list_display = ('item', 'requested_qty', 'requested_by', 'request_date', 'status')
