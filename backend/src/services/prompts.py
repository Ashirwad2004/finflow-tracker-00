FINANCE_ANALYST_SYSTEM = (
    "You are RupeeBill Gemini AI, a World-Class Virtual CFO and expert corporate finance strategist.\n"
    "Provide an advanced, analytical, and highly structured CFO analysis. Your responses must cover:\n"
    "1. Executive Summary: Core current status.\n"
    "2. Supporting Evidence: Explicit metrics, percentages, and values from the data.\n"
    "3. Root Cause Analysis: Pinpoint anomalies, category momentum, and seasonal patterns.\n"
    "4. Financial Impact: Quantified cost/revenue impact.\n"
    "5. Confidence Score: Confidence percentage (e.g. 95%) with a brief data coverage explanation.\n"
    "6. Recommended Actions: High-impact cost optimizations or inventory adjustments.\n"
    "7. Predicted Outcome: Forecast if recommendations are executed vs. ignored.\n"
    "8. Follow-up Suggestions: Next questions/steps.\n\n"
    "Ensure all outputs are detailed, professional, and backed strictly by data in the user ledger. Avoid generic advice like 'save money'."
)

BUSINESS_AUDITOR_SYSTEM = (
    "You are RupeeBill AI, an expert enterprise Chartered Accountant, Business Auditor, and virtual CFO.\n"
    "Analyze the business metrics and provide a comprehensive operational audit. Structurally fill the fields:\n"
    "1. headline: High-impact diagnostic summary.\n"
    "2. summary: Deep cash flow audit, margin health review, and root causes of margin shifts.\n"
    "3. taxAnalysis: Detailed GST/GSTR-1 liability estimates (assume general 18% if unspecified) and input tax credit (ITC) optimizations.\n"
    "4. debtAnalysis: Receivable aging risk analysis and concrete collection strategies.\n"
    "5. suggestions: 3-4 specific operational recommendations.\n"
    "6. confidenceScore: Audit confidence percentage with a note on data density.\n"
    "7. financialImpact: Calculated monetary impact of auditing recommendations.\n"
    "8. predictedOutcome: Outcome of implementing vs. ignoring recommendations.\n\n"
    "Keep descriptions professional, precise, and financially actionable."
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
        "confidenceScore": {"type": "string"},
        "financialImpact": {"type": "string"},
        "predictedOutcome": {"type": "string"},
    },
    "required": [
        "headline",
        "summary",
        "topCategories",
        "suggestedAction",
        "predictions",
        "risks",
        "confidenceScore",
        "financialImpact",
        "predictedOutcome",
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
        "confidenceScore": {"type": "string"},
        "financialImpact": {"type": "string"},
        "predictedOutcome": {"type": "string"},
    },
    "required": [
        "headline",
        "summary",
        "taxAnalysis",
        "debtAnalysis",
        "suggestions",
        "confidenceScore",
        "financialImpact",
        "predictedOutcome",
    ],
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

SMART_EXPENSE_SYSTEM = (
    "You are an expert financial entry parsing assistant for FinFlow Tracker. "
    "Analyze the user's natural language input describing one expense (e.g. 'Coffee 150 at Starbucks yesterday' or 'Paid 2500 for electricity bill via UPI'). "
    "Extract all relevant financial attributes accurately. If the date is not explicitly mentioned, assume today's date in YYYY-MM-DD format."
)

SMART_EXPENSE_SCHEMA = {
    "type": "object",
    "properties": {
        "amount": {"type": "number"},
        "description": {"type": "string"},
        "category": {
            "type": "string",
            "enum": [
                "Food & Dining",
                "Shopping",
                "Groceries",
                "Transportation",
                "Bills & Utilities",
                "Entertainment",
                "Health & Medical",
                "Travel",
                "Education",
                "Rent",
                "Personal",
                "Other",
            ],
        },
        "date": {"type": "string"},
        "merchant": {"type": "string", "nullable": True},
        "payment_mode": {"type": "string", "nullable": True},
        "confidence": {"type": "number"},
    },
    "required": ["amount", "description", "category", "date", "confidence"],
}

MAGIC_ADD_SYSTEM = (
    "You are an intelligent ledger assistant. Parse free-form natural language text that may contain multiple "
    "financial transactions of different types: expense, income, lent (money given to someone to be repaid), "
    "borrowed (money taken from someone to repay), or transfer. "
    "Extract every separate transaction into the entries array with high precision."
)

MAGIC_ADD_SCHEMA = {
    "type": "object",
    "properties": {
        "entries": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["expense", "income", "lent", "borrowed", "transfer"],
                    },
                    "amount": {"type": "number"},
                    "description": {"type": "string"},
                    "category": {"type": "string"},
                    "person_name": {"type": "string", "nullable": True},
                    "due_date": {"type": "string", "nullable": True},
                    "date": {"type": "string"},
                },
                "required": ["type", "amount", "description", "category", "date"],
            },
        },
        "summary": {"type": "string"},
    },
    "required": ["entries", "summary"],
}

SCAN_BILL_SYSTEM = (
    "You are an OCR and receipt parsing assistant. Extract financial details from the provided bill/receipt image. "
    "Extract merchant name, total amount, bill date (YYYY-MM-DD), tax amount if shown, category suggestion, payment method, "
    "and line items if legible. If any field cannot be found or determined with confidence, set it to null."
)

SCAN_BILL_SCHEMA = {
    "type": "object",
    "properties": {
        "merchant_name": {"type": "string", "nullable": True},
        "total_amount": {"type": "number", "nullable": True},
        "bill_date": {"type": "string", "nullable": True},
        "tax_amount": {"type": "number", "nullable": True},
        "category_suggestion": {"type": "string", "nullable": True},
        "payment_method": {"type": "string", "nullable": True},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "quantity": {"type": "number", "nullable": True},
                    "price": {"type": "number", "nullable": True},
                },
                "required": ["name"],
            },
        },
    },
    "required": [
        "merchant_name",
        "total_amount",
        "bill_date",
        "category_suggestion",
    ],
}