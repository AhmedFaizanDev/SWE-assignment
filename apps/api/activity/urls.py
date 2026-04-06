from django.urls import path
from . import views

urlpatterns = [
    path('activity/', views.activity_list),
    path('reports/monthly-usage/', views.monthly_usage),
    path('reports/borrow-leaderboard/', views.borrow_leaderboard),
]
