"""
Prompt templates for AI interactions.
Templates use {variable} placeholders filled at runtime by context_builder.

Token-cost strategy:
- System prompt is shared across calls → keep it minimal.
- User prompts include only essential data; schemas use shorthand.
- max_tokens are tuned per endpoint to cap completion cost.
"""

SYSTEM_INVENTORY_ANALYST = (
    "You are an inventory analyst for an engineering lab. "
    "Reply ONLY with valid JSON matching the requested schema. "
    "Use only provided data — never invent numbers. "
    "State confidence explicitly when uncertain."
)

USER_QUERY_TEMPLATE = """Context:
{context}

Q: {question}

JSON schema:
{{"answer":"str","confidence":0-1,"citations":["chunk_id"],"relatedItems":["name"],"suggestedActions":["action"]}}
Cite chunk ids (e.g. inventory:3). Lower confidence if evidence is weak."""

USER_INSIGHTS_TEMPLATE = """Inventory:
{inventory_summary}

Activity (30d):
{activity_summary}

Suppliers:
{supplier_summary}

Borrowed:
{borrowed_summary}

Return JSON: {{"insights":[{{"title":"str","description":"str","category":"stockout_risk|overstock|demand_trend|supplier_risk|cost_optimization|operational","severity":"info|warning|critical","confidence":0-1,"impactEstimate":"str","recommendedAction":"str","relatedItemIds":[],"relatedSupplierIds":[]}}]}}
Generate up to 5 actionable insights. Be concise."""

USER_SIMULATION_TEMPLATE = """Item: {item_details}
Demand (90d): {demand_history}
Stock: {current_quantity} (min {min_threshold}), ${unit_price}/unit
Supplier: {supplier_info}

JSON: {{"recommendedOrderQty":int,"estimatedCost":float,"reasoning":"str","daysUntilStockout":int|null,"optimalReorderPoint":int,"safetyStock":int,"confidence":0-1}}"""

USER_SUGGESTIONS_TEMPLATE = """Based on these insights, generate actionable suggestions that require human approval.

Insights:
{insights_summary}

Inventory snapshot:
{inventory_summary}

JSON: {{"suggestions":[{{"suggestion_type":"reorder|rebalance|decommission","title":"str","description":"str","details":{{"itemIds":[],"reason":"str","estimatedSavings":"str"}}}}]}}
Generate 1-3 suggestions. Only suggest actions with clear justification."""

TEMPLATES = {
    'query': {
        'system': SYSTEM_INVENTORY_ANALYST,
        'user': USER_QUERY_TEMPLATE,
        'model': 'gpt-4o-mini',
        'max_tokens': 512,
        'temperature': 0.3,
    },
    'insights': {
        'system': SYSTEM_INVENTORY_ANALYST,
        'user': USER_INSIGHTS_TEMPLATE,
        'model': 'gpt-4o-mini',
        'max_tokens': 1024,
        'temperature': 0.4,
    },
    'simulation': {
        'system': SYSTEM_INVENTORY_ANALYST,
        'user': USER_SIMULATION_TEMPLATE,
        'model': 'gpt-4o-mini',
        'max_tokens': 384,
        'temperature': 0.2,
    },
    'suggestions': {
        'system': SYSTEM_INVENTORY_ANALYST,
        'user': USER_SUGGESTIONS_TEMPLATE,
        'model': 'gpt-4o-mini',
        'max_tokens': 512,
        'temperature': 0.3,
    },
}
