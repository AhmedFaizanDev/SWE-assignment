from django.urls import path
from . import views

urlpatterns = [
    path('inventory/', views.inventory_list),
    path('inventory/<int:pk>/', views.inventory_detail),
]
