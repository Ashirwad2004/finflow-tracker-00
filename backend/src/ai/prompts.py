FINANCE_ANALYST_SYSTEM = (
    "You are FinFlow AI, an enterprise finance analyst and store copilot for small "
    "businesses and personal users. Provide realistic, concise analysis. Budget "
    "suggestions should relate to inventory levels, collection of debts, or expense cutting."
)

BUSINESS_AUDITOR_SYSTEM = (
    "You are FinFlow AI, an expert enterprise chartered accountant and business auditor.\n"
    "Analyze the business metrics (sales, purchases, expenses, inventory status, "
    "payables/receivables) and provide key insights:\n"
    "- Headline summarizing core status.\n"
    "- Summary of cash flow and profit margins.\n"
    "- Tax analysis (GST/GSTR-1 liability estimate, tax optimizations).\n"
    "- Debt analysis (Risk on receivables/loans, cash recovery tips).\n"
    "- Suggestions: 3-4 specific operational recommendations.\n"
    "Keep descriptions concise and highly professional."
)

PRODUCT_SEARCH_SYSTEM = (
    "Convert natural language shopping queries into product filters and ranked product ids. "
    "Prefer in-stock products. Support INR price constraints like under 20000. "
    "Return only products present in the input."
)

PRODUCT_CONTENT_SYSTEM = (
    "You are an ecommerce merchandising AI. Generate honest, conversion-focused product copy "
    "for an Indian online store. Do not claim features that were not provided."
)

FINANCE_INSIGHT_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "summary": {"type": "string"},
        "topCategories": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "amount": {"type": "number"},
                    "reason": {"type": "string"},
                },
                "required": ["name", "amount", "reason"],
            },
        },
        "suggestedAction": {"type": "string"},
        "predictions": {"type": "array", "items": {"type": "string"}},
        "risks": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "headline",
        "summary",
        "topCategories",
        "suggestedAction",
        "predictions",
        "risks",
    ],
}

BUSINESS_INSIGHT_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "summary": {"type": "string"},
        "taxAnalysis": {"type": "string"},
        "debtAnalysis": {"type": "string"},
        "suggestions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["headline", "summary", "taxAnalysis", "debtAnalysis", "suggestions"],
}

PRODUCT_SEARCH_SCHEMA = {
    "type": "object",
    "properties": {
        "intent": {"type": "string"},
        "keywords": {"type": "array", "items": {"type": "string"}},
        "maxPrice": {"type": "number", "nullable": True},
        "minPrice": {"type": "number", "nullable": True},
        "categories": {"type": "array", "items": {"type": "string"}},
        "rankedProductIds": {"type": "array", "items": {"type": "string"}},
        "explanation": {"type": "string"},
    },
    "required": [
        "intent",
        "keywords",
        "maxPrice",
        "minPrice",
        "categories",
        "rankedProductIds",
        "explanation",
    ],
}

PRODUCT_CONTENT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "seoTitle": {"type": "string"},
        "seoDescription": {"type": "string"},
        "highlights": {"type": "array", "items": {"type": "string"}},
        "marketingCopy": {"type": "string"},
    },
    "required": [
        "title",
        "description",
        "seoTitle",
        "seoDescription",
        "highlights",
        "marketingCopy",
    ],
}
