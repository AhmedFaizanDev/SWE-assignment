from django.contrib import admin
from .models import Alert, RiskScore

admin.site.register(Alert)
admin.site.register(RiskScore)
