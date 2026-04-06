"""
Prompt templates for AI interactions.
Templates use {variable} placeholders filled at runtime by context_builder.
"""

SYSTEM_INVENTORY_ANALYST = """You are an expert inventory management analyst for an engineering lab.
You analyze inventory data, identify risks, and provide actionable recommendations.
Always respond in valid JSON matching the requested schema.
Base your analysis only on the provided data — never fabricate numbers.
When uncertain, state your confidence level explicitly."""

USER_QUERY_TEMPLATE = """## Retrieved Context (RAG)
{context}

## User Question
{question}

Respond as JSON:
{{
  "answer": "your detailed answer",
  "confidence": 0.0-1.0,
  "citations": ["R1", "R2"],
  "relatedItems": ["item names if relevant"],
  "suggestedActions": ["action 1", "action 2"]
}}

Rules:
- Ground your answer in retrieved context chunks and cite chunk ids used (e.g., R3).
- If evidence is weak, say so and lower confidence.
- Do not fabricate inventory values or IDs."""

USER_INSIGHTS_TEMPLATE = """## Current Inventory Snapshot
{inventory_summary}

## Recent Activity (last 30 days)
{activity_summary}

## Supplier Information
{supplier_summary}

## Borrowed Equipment Status
{borrowed_summary}

Analyze the data and generate up to 5 actionable insights.
Respond as JSON array:
[
  {{
    "title": "concise title",
    "description": "detailed analysis",
    "category": "stockout_risk|overstock|demand_trend|supplier_risk|cost_optimization|operational",
    "severity": "info|warning|critical",
    "confidence": 0.0-1.0,
    "impactEstimate": "business impact description",
    "recommendedAction": "specific action to take",
    "relatedItemIds": [],
    "relatedSupplierIds": []
  }}
]"""

USER_SIMULATION_TEMPLATE = """## Item Details
{item_details}

## Historical Demand (last 90 days)
{demand_history}

## Current Stock
Quantity: {current_quantity}
Min Threshold: {min_threshold}
Unit Price: ${unit_price}

## Supplier Info
{supplier_info}

Simulate a reorder scenario. Respond as JSON:
{{
  "recommendedOrderQty": number,
  "estimatedCost": number,
  "reasoning": "why this quantity",
  "daysUntilStockout": number or null,
  "optimalReorderPoint": number,
  "safetyStock": number,
  "confidence": 0.0-1.0
}}"""

TEMPLATES = {
    'query': {
        'system': SYSTEM_INVENTORY_ANALYST,
        'user': USER_QUERY_TEMPLATE,
        'model': 'gpt-4o-mini',
        'max_tokens': 1024,
        'temperature': 0.3,
    },
    'insights': {
        'system': SYSTEM_INVENTORY_ANALYST,
        'user': USER_INSIGHTS_TEMPLATE,
        'model': 'gpt-4o-mini',
        'max_tokens': 2048,
        'temperature': 0.4,
    },
    'simulation': {
        'system': SYSTEM_INVENTORY_ANALYST,
        'user': USER_SIMULATION_TEMPLATE,
        'model': 'gpt-4o-mini',
        'max_tokens': 1024,
        'temperature': 0.2,
    },
}
