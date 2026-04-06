from django.contrib import admin
from .models import ActivityEntry


@admin.register(ActivityEntry)
class ActivityEntryAdmin(admin.ModelAdmin):
    list_display = ('type', 'description', 'user', 'timestamp')
