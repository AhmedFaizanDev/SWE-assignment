from django.urls import path
from . import views

urlpatterns = [
    path('alerts/', views.alert_list),
    path('alerts/<int:pk>/', views.alert_action),
    path('alerts/risks/', views.risk_scores),
    path('alerts/compute/', views.compute_risks),
]
