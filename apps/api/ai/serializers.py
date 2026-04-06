from rest_framework import serializers
from .models import AIInteraction, InsightRecord, AISuggestion


class AIInteractionSerializer(serializers.ModelSerializer):
    interactionType = serializers.CharField(source='interaction_type')
    userInput = serializers.CharField(source='user_input')
    responseData = serializers.JSONField(source='response_data')
    modelUsed = serializers.CharField(source='model_used')
    promptTokens = serializers.IntegerField(source='prompt_tokens')
    completionTokens = serializers.IntegerField(source='completion_tokens')
    totalTokens = serializers.IntegerField(source='total_tokens')
    costUsd = serializers.FloatField(source='cost_usd')
    latencyMs = serializers.IntegerField(source='latency_ms')
    requestId = serializers.CharField(source='request_id')
    createdAt = serializers.DateTimeField(source='created_at')

    class Meta:
        model = AIInteraction
        fields = [
            'id', 'interactionType', 'userInput', 'responseData', 'modelUsed',
            'promptTokens', 'completionTokens', 'totalTokens', 'costUsd',
            'latencyMs', 'requestId', 'error', 'createdAt',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        data['createdAt'] = instance.created_at.isoformat()
        return data


class InsightRecordSerializer(serializers.ModelSerializer):
    impactEstimate = serializers.CharField(source='impact_estimate')
    recommendedAction = serializers.CharField(source='recommended_action')
    relatedItemIds = serializers.JSONField(source='related_item_ids')
    relatedSupplierIds = serializers.JSONField(source='related_supplier_ids')
    feedbackComment = serializers.CharField(source='feedback_comment', required=False)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = InsightRecord
        fields = [
            'id', 'title', 'description', 'category', 'severity', 'status',
            'confidence', 'impactEstimate', 'recommendedAction', 'evidence',
            'relatedItemIds', 'relatedSupplierIds', 'feedback', 'feedbackComment',
            'createdAt', 'updatedAt',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        data['createdAt'] = instance.created_at.isoformat()
        data['updatedAt'] = instance.updated_at.isoformat()
        return data


class AISuggestionSerializer(serializers.ModelSerializer):
    suggestionType = serializers.CharField(source='suggestion_type')
    approvalStatus = serializers.CharField(source='approval_status')
    approvedBy = serializers.CharField(source='approved_by', required=False)
    approvedAt = serializers.DateTimeField(source='approved_at', read_only=True, allow_null=True)
    rejectionReason = serializers.CharField(source='rejection_reason', required=False)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = AISuggestion
        fields = [
            'id', 'suggestionType', 'title', 'description', 'details',
            'approvalStatus', 'approvedBy', 'approvedAt', 'rejectionReason',
            'createdAt', 'updatedAt',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        data['createdAt'] = instance.created_at.isoformat()
        data['updatedAt'] = instance.updated_at.isoformat()
        if instance.approved_at:
            data['approvedAt'] = instance.approved_at.isoformat()
        return data
