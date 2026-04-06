from django.db import models
from django.utils import timezone

ACTIVITY_TYPE_CHOICES = [
    ('issued', 'issued'),
    ('returned', 'returned'),
    ('restocked', 'restocked'),
    ('requested', 'requested'),
    ('approved', 'approved'),
    ('rejected', 'rejected'),
]


class ActivityEntry(models.Model):
    """Activity log. Frontend: id, type, description, timestamp, user."""
    type = models.CharField(max_length=20, choices=ACTIVITY_TYPE_CHOICES)
    description = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    user = models.CharField(max_length=255)

    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = 'Activity entries'

    def __str__(self):
        return f'{self.type}: {self.description[:50]}'
