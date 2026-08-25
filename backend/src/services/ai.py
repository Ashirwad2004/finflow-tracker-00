import json
from datetime import date
from typing import Any

from src.core.ai_client import GeminiClient
from src.services.prompts import (
    BUSINESS_AUDITOR_SYSTEM,
    BUSINESS_INSIGHT_SCHEMA,
    FINANCE_ANALYST_SYSTEM,
    FINANCE_INSIGHT_SCHEMA,
    MAGIC_ADD_SCHEMA,
    MAGIC_ADD_SYSTEM,
    PRODUCT_CONTENT_SCHEMA,
    PRODUCT_CONTENT_SYSTEM,
    PRODUCT_SEARCH_SCHEMA,
    PRODUCT_SEARCH_SYSTEM,
    SCAN_BILL_SCHEMA,
    SCAN_BILL_SYSTEM,
    SMART_EXPENSE_SCHEMA,
    SMART_EXPENSE_SYSTEM,
)
from src.schemas.ai import (
    BusinessInsightRequest,
    BusinessInsightResponse,
    FinanceInsightRequest,
    FinanceInsightResponse,
    MagicAddParseRequest,
    MagicAddParseResponse,
    ProductContentRequest,
    ProductContentResponse,
    ProductSearchRequest,
    ProductSearchResponse,
    ScanBillData,
    ScanBillRequest,
    ScanBillResponse,
    SmartExpenseParseRequest,
    SmartExpenseParseResponse,
)


class InsightService:
    def __init__(self, client: GeminiClient) -> None:
        self.client = client

    async def generate_finance_insight(
        self, payload: FinanceInsightRequest
    ) -> FinanceInsightResponse:
        categories_by_id = {category.id: category.name for category in payload.categories}
        compact_expenses = [
            {
                "amount": float(expense.get("amount") or 0),
                "description": expense.get("description"),
                "date": expense.get("date"),
                "category": (
                    (expense.get("categories") or {}).get("name")
                    or categories_by_id.get(expense.get("category_id"), "Uncategorized")
                ),
            }
            for expense in payload.expenses[:30]
        ]

        total_expenses = sum(float(expense.get("amount") or 0) for expense in payload.expenses)
        total_sales = sum(
            float(sale.get("total_amount") or 0) for sale in (payload.sales or [])
        )
        total_lent = sum(
            float(item.get("amount") or 0)
            for item in (payload.lent or [])
            if item.get("status") != "paid"
        )
        total_borrowed = sum(
            float(item.get("amount") or 0)
            for item in (payload.borrowed or [])
            if item.get("status") != "paid"
        )

        summary_data = {
            "task": payload.mode,
            "today": date.today().isoformat(),
            "currency": payload.currency,
            "financials": {
                "salesTotal": total_sales,
                "expensesTotal": total_expenses,
                "netBalance": total_sales - total_expenses,
                "debtsOwedToUser": total_lent,
                "debtsUserOwesOthers": total_borrowed,
                "lowStockItemsCount": payload.lowStockCount or 0,
            },
            "recentExpenses": compact_expenses,
        }

        raw = await self.client.generate(
            [
                {"role": "system", "content": FINANCE_ANALYST_SYSTEM},
                {"role": "user", "content": json.dumps(summary_data)},
            ],
            temperature=0.15,
            max_output_tokens=2048,
            response_format={"json_schema": {"schema": FINANCE_INSIGHT_SCHEMA}},
        )
        return FinanceInsightResponse.model_validate(json.loads(raw))

    async def generate_business_insight(
        self, payload: BusinessInsightRequest
    ) -> BusinessInsightResponse:
        total_sales = sum(float(item.get("total_amount") or 0) for item in payload.sales)
        total_purchases = sum(float(item.get("total_amount") or 0) for item in payload.purchases)
        total_expenses = sum(float(item.get("amount") or 0) for item in payload.expenses)
        total_lent = sum(
            float(item.get("amount") or 0)
            for item in payload.lent
            if item.get("status") != "paid"
        )
        total_borrowed = sum(
            float(item.get("amount") or 0)
            for item in payload.borrowed
            if item.get("status") != "paid"
        )
        low_stock_count = sum(
            1
            for product in payload.products
            if float(product.get("stock_quantity", product.get("stock", 0)) or 0) <= 5
        )

        business_metrics = {
            "salesCount": len(payload.sales),
            "totalSales": total_sales,
            "totalPurchases": total_purchases,
            "totalExpenses": total_expenses,
            "receivables": total_lent,
            "payables": total_borrowed,
            "lowStockItems": low_stock_count,
            "productsCount": len(payload.products),
            "currency": payload.currency,
            "today": date.today().isoformat(),
        }

        raw = await self.client.generate(
            [
                {"role": "system", "content": BUSINESS_AUDITOR_SYSTEM},
                {"role": "user", "content": json.dumps(business_metrics)},
            ],
            temperature=0.15,
            max_output_tokens=2048,
            response_format={"json_schema": {"schema": BUSINESS_INSIGHT_SCHEMA}},
        )
        return BusinessInsightResponse.model_validate(json.loads(raw))


class CatalogService:
    def __init__(self, client: GeminiClient) -> None:
        self.client = client

    async def parse_product_search(
        self, payload: ProductSearchRequest
    ) -> ProductSearchResponse:
        products = [
            {
                "id": product.get("id"),
                "name": product.get("name"),
                "price": float(product.get("price") or 0),
                "category": product.get("category") or "",
                "description": product.get("online_description") or "",
                "stock_quantity": product.get("stock_quantity"),
            }
            for product in payload.products[:80]
        ]

        raw = await self.client.generate(
            [
                {"role": "system", "content": PRODUCT_SEARCH_SYSTEM},
                {
                    "role": "user",
                    "content": json.dumps({"query": payload.query, "products": products}),
                },
            ],
            temperature=0.1,
            max_output_tokens=1200,
            response_format={"json_schema": {"schema": PRODUCT_SEARCH_SCHEMA}},
        )
        return ProductSearchResponse.model_validate(json.loads(raw))

    async def generate_product_content(
        self, payload: ProductContentRequest
    ) -> ProductContentResponse:
        raw = await self.client.generate(
            [
                {"role": "system", "content": PRODUCT_CONTENT_SYSTEM},
                {"role": "user", "content": payload.model_dump_json()},
            ],
            temperature=0.45,
            max_output_tokens=1200,
            response_format={"json_schema": {"schema": PRODUCT_CONTENT_SCHEMA}},
        )
        return ProductContentResponse.model_validate(json.loads(raw))


class ExpenseParserService:
    def __init__(self, client: GeminiClient) -> None:
        self.client = client

    async def parse_smart_expense(
        self, payload: SmartExpenseParseRequest
    ) -> SmartExpenseParseResponse:
        current_date_str = payload.current_date or date.today().isoformat()
        user_prompt = f"Today's date: {current_date_str}\nExpense input: {payload.text}"

        raw = await self.client.generate(
            [
                {"role": "system", "content": SMART_EXPENSE_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_output_tokens=500,
            response_format={"json_schema": {"schema": SMART_EXPENSE_SCHEMA}},
        )
        return SmartExpenseParseResponse.model_validate(json.loads(raw))

    async def parse_magic_add(
        self, payload: MagicAddParseRequest
    ) -> MagicAddParseResponse:
        current_date_str = payload.current_date or date.today().isoformat()
        user_prompt = f"Today's date: {current_date_str}\nInput statement: {payload.text}"

        raw = await self.client.generate(
            [
                {"role": "system", "content": MAGIC_ADD_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_output_tokens=1500,
            response_format={"json_schema": {"schema": MAGIC_ADD_SCHEMA}},
        )
        return MagicAddParseResponse.model_validate(json.loads(raw))


class BillOcrService:
    def __init__(self, client: GeminiClient) -> None:
        self.client = client

    async def scan_bill(self, payload: ScanBillRequest) -> ScanBillResponse:
        messages = [
            {"role": "system", "content": SCAN_BILL_SYSTEM},
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Extract all data from this bill/receipt into structured JSON format.",
                    },
                    {
                        "type": "image",
                        "data": payload.imageBase64,
                        "mime_type": payload.mimeType or "image/jpeg",
                    },
                ],
            },
        ]

        raw = await self.client.generate(
            messages,
            temperature=0.1,
            max_output_tokens=1500,
            response_format={"json_schema": {"schema": SCAN_BILL_SCHEMA}},
        )
        parsed_data = json.loads(raw)
        return ScanBillResponse(success=True, data=ScanBillData.model_validate(parsed_data))