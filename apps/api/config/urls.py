from django.contrib import admin
from django.urls import include, path
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def health_check(request):
    return Response({'status': 'ok'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check),
    path('api/', include('inventory.urls')),
    path('api/', include('suppliers.urls')),
    path('api/', include('item_requests.urls')),
    path('api/', include('borrowed.urls')),
    path('api/', include('activity.urls')),
    path('api/', include('analytics.urls')),
    path('api/', include('ai.urls')),
    path('api/', include('alerts.urls')),
]
