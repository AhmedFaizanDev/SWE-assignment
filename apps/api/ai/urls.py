from django.urls import path
from . import views

urlpatterns = [
    path('ai/query/', views.ai_query),
    path('ai/insights/', views.ai_insights),
    path('ai/insights/<int:pk>/feedback/', views.insight_feedback),
    path('ai/simulate-reorder/', views.ai_simulate_reorder),
    path('ai/suggestions/', views.suggestion_list),
    path('ai/suggestions/generate/', views.generate_suggestions),
    path('ai/suggestions/<int:pk>/', views.suggestion_action),
    path('ai/usage/', views.ai_usage_stats),
]
