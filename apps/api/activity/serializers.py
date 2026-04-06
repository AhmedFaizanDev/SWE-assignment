from rest_framework import serializers
from .models import ActivityEntry


class ActivityEntrySerializer(serializers.ModelSerializer):
    """Output camelCase: id, type, description, timestamp, user."""

    class Meta:
        model = ActivityEntry
        fields = ['id', 'type', 'description', 'timestamp', 'user']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.pk)
        data['timestamp'] = instance.timestamp.isoformat()
        return data
