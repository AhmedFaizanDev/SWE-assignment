from django.contrib import admin
from .models import PromptTemplate, AIInteraction, InsightRecord, AISuggestion, KnowledgeChunk

admin.site.register(PromptTemplate)
admin.site.register(AIInteraction)
admin.site.register(InsightRecord)
admin.site.register(AISuggestion)
admin.site.register(KnowledgeChunk)
