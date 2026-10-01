from typing import Any, Literal

from pydantic import BaseModel, Field


class AiMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str | list[Any]


class CompletionRequest(BaseModel):
    messages: list[AiMessage] = Field(min_length=1)
    model: str | None = None
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)
    maxOutputTokens: int | None = Field(default=None, ge=64, le=8192)
    response_format: dict[str, Any] | None = None
    stream: bool | None = False


class CompletionResponse(BaseModel):
    text: str
    choices: list[dict[str, Any]]


class ExpenseRecord(BaseModel):
    amount: float | int | str
    description: str
    date: str | None = None
    category_id: str | None = None
    categories: dict[str, Any] | None = None


class CategoryRecord(BaseModel):
    id: str
    name: str


class FinanceInsightRequest(BaseModel):
    mode: Literal[
        "dashboard",
        "explain-expenses",
        "losing-money",
        "tax-summary",
        "spending-prediction",
    ]
    expenses: list[dict[str, Any]] = Field(default_factory=list)
    categories: list[CategoryRecord] = Field(default_factory=list)
    currency: str = "INR"
    sales: list[dict[str, Any]] | None = None
    lent: list[dict[str, Any]] | None = None
    borrowed: list[dict[str, Any]] | None = None
    lowStockCount: int | None = None


class FinanceInsightResponse(BaseModel):
    headline: str
    summary: str
    topCategories: list[dict[str, Any]]
    suggestedAction: str
    predictions: list[str]
    risks: list[str]
    confidenceScore: str
    financialImpact: str
    predictedOutcome: str


class BusinessInsightRequest(BaseModel):
    sales: list[dict[str, Any]] = Field(default_factory=list)
    purchases: list[dict[str, Any]] = Field(default_factory=list)
    expenses: list[dict[str, Any]] = Field(default_factory=list)
    lent: list[dict[str, Any]] = Field(default_factory=list)
    borrowed: list[dict[str, Any]] = Field(default_factory=list)
    products: list[dict[str, Any]] = Field(default_factory=list)
    currency: str = "INR"
    onlineStore: list[dict[str, Any]] | None = None


class BusinessInsightResponse(BaseModel):
    headline: str
    summary: str
    taxAnalysis: str
    debtAnalysis: str
    suggestions: list[str]
    confidenceScore: str
    financialImpact: str
    predictedOutcome: str


class ProductSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    products: list[dict[str, Any]] = Field(default_factory=list)


class ProductSearchResponse(BaseModel):
    intent: str
    keywords: list[str]
    maxPrice: float | None = None
    minPrice: float | None = None
    categories: list[str]
    rankedProductIds: list[str]
    explanation: str


class ProductContentRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    price: float = Field(ge=0)
    costPrice: float | None = Field(default=None, ge=0)
    unit: str | None = None
    stockQuantity: int | None = Field(default=None, ge=0)


class ProductContentResponse(BaseModel):
    title: str
    description: str
    seoTitle: str
    seoDescription: str
    highlights: list[str]
    marketingCopy: str


class SmartExpenseParseRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    current_date: str | None = None


class SmartExpenseParseResponse(BaseModel):
    amount: float
    description: str
    category: str
    date: str
    merchant: str | None = None
    payment_mode: str | None = None
    confidence: float = 1.0


class MagicAddEntry(BaseModel):
    type: Literal["expense", "income", "lent", "borrowed", "transfer"]
    amount: float
    description: str
    category: str
    person_name: str | None = None
    due_date: str | None = None
    date: str


class MagicAddParseRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    current_date: str | None = None


class MagicAddParseResponse(BaseModel):
    entries: list[MagicAddEntry]
    summary: str


class BillItem(BaseModel):
    name: str
    quantity: float | None = None
    price: float | None = None


class ScanBillRequest(BaseModel):
    imageBase64: str = Field(min_length=1)
    mimeType: str = "image/jpeg"


class ScanBillData(BaseModel):
    merchant_name: str | None = None
    total_amount: float | None = None
    bill_date: str | None = None
    tax_amount: float | None = None
    category_suggestion: str | None = None
    payment_method: str | None = None
    items: list[BillItem] | None = None


class ScanBillResponse(BaseModel):
    success: bool = True
    data: ScanBillData