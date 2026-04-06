from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .engine import compute_all_risks
from .models import Alert, RiskScore
from .serializers import AlertSerializer, RiskScoreSerializer


@api_view(['GET'])
def alert_list(request):
    """List alerts. Filter by status, severity, type."""
    qs = Alert.objects.select_related('item', 'supplier', 'risk_score').all()
    alert_status = request.query_params.get('status', 'active')
    if alert_status:
        qs = qs.filter(status=alert_status)
    severity = request.query_params.get('severity')
    if severity:
        qs = qs.filter(severity=severity)
    alert_type = request.query_params.get('type')
    if alert_type:
        qs = qs.filter(alert_type=alert_type)
    return Response(AlertSerializer(qs[:100], many=True).data)


@api_view(['PATCH'])
def alert_action(request, pk):
    """Acknowledge, resolve, or dismiss an alert."""
    try:
        alert = Alert.objects.get(pk=pk)
    except Alert.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    if new_status not in ('acknowledged', 'resolved', 'dismissed'):
        return Response({'detail': 'status must be acknowledged, resolved, or dismissed.'}, status=status.HTTP_400_BAD_REQUEST)

    alert.status = new_status
    if new_status == 'resolved':
        alert.resolved_at = timezone.now()
    alert.save()
    return Response(AlertSerializer(alert).data)


@api_view(['GET'])
def risk_scores(request):
    """Current risk scores for all items/suppliers."""
    risk_type = request.query_params.get('type')
    qs = RiskScore.objects.select_related('item', 'supplier').all()
    if risk_type:
        qs = qs.filter(risk_type=risk_type)
    return Response(RiskScoreSerializer(qs[:200], many=True).data)


@api_view(['POST'])
def compute_risks(request):
    """Trigger risk computation (admin/cron use)."""
    num_scores, num_alerts = compute_all_risks()
    return Response({
        'computed': True,
        'riskScores': num_scores,
        'alertsGenerated': num_alerts,
    })
