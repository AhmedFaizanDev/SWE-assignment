from django.urls import path
from . import views

urlpatterns = [
    path('analytics/kpi/', views.kpi_latest),
    path('analytics/kpi/history/', views.kpi_history),
    path('analytics/movements/', views.movements_list),
    path('analytics/demand/', views.demand_signals),
    path('analytics/supplier-performance/', views.supplier_performance),
    path('analytics/stock-health/', views.stock_health),
]
