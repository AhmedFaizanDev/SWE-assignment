from django.contrib import admin
from .models import BorrowedItem


@admin.register(BorrowedItem)
class BorrowedItemAdmin(admin.ModelAdmin):
    list_display = ('item', 'quantity', 'borrowed_by', 'expected_return_date', 'status')
