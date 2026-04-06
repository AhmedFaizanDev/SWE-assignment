from django.urls import path
from . import views

urlpatterns = [
    path('borrowed/', views.borrowed_list),
    path('borrowed/<int:pk>/', views.borrowed_detail),
]
