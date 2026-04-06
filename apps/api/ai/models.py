from django.db import models
from django.utils import timezone


class PromptTemplate(models.Model):
    """Versioned prompt templates for AI interactions."""
    slug = models.SlugField(max_length=64, unique=True)
    version = models.PositiveIntegerField(default=1)
    system_prompt = models.TextField()
    user_template = models.TextField(help_text='Use {variable} placeholders.')
    model_name = models.CharField(max_length=64, default='gpt-4o-mini')
    max_tokens = models.PositiveIntegerField(default=1024)
    temperature = models.FloatField(default=0.3)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['slug', '-version']
        unique_together = ('slug', 'version')

    def __str__(self):
        return f'{self.slug} v{self.version}'


class AIInteraction(models.Model):
    """Audit log for every AI call."""
    INTERACTION_TYPES = [
        ('query', 'Natural Language Query'),
        ('insight', 'Generated Insight'),
        ('simulation', 'Reorder Simulation'),
    ]
    interaction_type = models.CharField(max_length=16, choices=INTERACTION_TYPES)
    prompt_template = models.ForeignKey(PromptTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    user_input = models.TextField(blank=True)
    context_summary = models.TextField(blank=True)
    full_prompt = models.TextField(blank=True)
    response_text = models.TextField(blank=True)
    response_data = models.JSONField(default=dict)
    model_used = models.CharField(max_length=64, blank=True)
    prompt_tokens = models.IntegerField(default=0)
    completion_tokens = models.IntegerField(default=0)
    total_tokens = models.IntegerField(default=0)
    cost_usd = models.FloatField(default=0)
    latency_ms = models.IntegerField(default=0)
    error = models.TextField(blank=True)
    request_id = models.CharField(max_length=64, blank=True, db_index=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-created_at']


class InsightRecord(models.Model):
    """Precomputed or AI-generated insight/recommendation."""
    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]
    CATEGORY_CHOICES = [
        ('stockout_risk', 'Stockout Risk'),
        ('overstock', 'Overstock'),
        ('demand_trend', 'Demand Trend'),
        ('supplier_risk', 'Supplier Risk'),
        ('cost_optimization', 'Cost Optimization'),
        ('operational', 'Operational'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, db_index=True)
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES, db_index=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='active', db_index=True)
    confidence = models.FloatField(default=0.0)
    impact_estimate = models.TextField(blank=True)
    recommended_action = models.TextField(blank=True)
    evidence = models.JSONField(default=dict)
    related_item_ids = models.JSONField(default=list)
    related_supplier_ids = models.JSONField(default=list)
    ai_interaction = models.ForeignKey(AIInteraction, on_delete=models.SET_NULL, null=True, blank=True)
    feedback = models.CharField(max_length=16, blank=True)
    feedback_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', 'severity', 'status']),
        ]

    def __str__(self):
        return f'[{self.severity}] {self.title}'


class AISuggestion(models.Model):
    """AI-generated action suggestion with human-in-the-loop approval."""
    SUGGESTION_TYPES = [
        ('reorder', 'Reorder'),
        ('rebalance', 'Rebalance Inventory'),
        ('decommission', 'Decommission Dead Stock'),
    ]
    APPROVAL_STATUS = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('executed', 'Executed'),
    ]
    suggestion_type = models.CharField(max_length=20, choices=SUGGESTION_TYPES)
    title = models.CharField(max_length=255)
    description = models.TextField()
    details = models.JSONField(default=dict)
    approval_status = models.CharField(max_length=16, choices=APPROVAL_STATUS, default='pending', db_index=True)
    approved_by = models.CharField(max_length=255, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    insight = models.ForeignKey(InsightRecord, on_delete=models.SET_NULL, null=True, blank=True)
    ai_interaction = models.ForeignKey(AIInteraction, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.approval_status}] {self.title}'


class KnowledgeChunk(models.Model):
    """Persistent retrieval chunk for RAG search."""
    chunk_key = models.CharField(max_length=128, unique=True)
    source = models.CharField(max_length=32, db_index=True)
    title = models.CharField(max_length=255)
    text = models.TextField()
    text_hash = models.CharField(max_length=64, db_index=True)
    embedding = models.JSONField(default=list, blank=True)
    embedding_model = models.CharField(max_length=64, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['source', 'chunk_key']
        indexes = [
            models.Index(fields=['source', 'is_active']),
        ]

    def __str__(self):
        return f'{self.source}:{self.chunk_key}'
