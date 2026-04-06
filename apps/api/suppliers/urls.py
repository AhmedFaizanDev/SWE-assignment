from django.urls import path
from . import views

urlpatterns = [
    path('suppliers/', views.supplier_list),
    path('suppliers/<int:pk>/', views.supplier_detail),
]
