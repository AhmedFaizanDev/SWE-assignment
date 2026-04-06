from django.urls import path
from . import views

urlpatterns = [
    path('requests/', views.request_list),
    path('requests/<int:pk>/', views.request_detail),
]
