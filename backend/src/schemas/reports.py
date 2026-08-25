from typing import Any
from pydantic import BaseModel, Field


class GSTR1InvoiceItem(BaseModel):
    rate: float
    taxable_value: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    total_amount: float


class GSTR1B2BRecord(BaseModel):
    customer_gstin: str
    customer_name: str
    invoice_number: str
    invoice_date: str
    invoice_value: float
    place_of_supply: str
    reverse_charge: str = "N"
    items: list[GSTR1InvoiceItem] = Field(default_factory=list)


class GSTR1B2CSRecord(BaseModel):
    place_of_supply: str
    rate: float
    taxable_value: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    total_amount: float


class GSTR1HSNRecord(BaseModel):
    hsn_code: str
    description: str
    uqc: str = "NOS"
    total_quantity: float
    total_value: float
    taxable_value: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float


class GSTR1ReportRequest(BaseModel):
    sales: list[dict[str, Any]] = Field(default_factory=list)
    parties: list[dict[str, Any]] = Field(default_factory=list)
    merchant_gstin: str | None = None
    month: str | None = None
    year: int | None = None


class GSTR1ReportResponse(BaseModel):
    gstin: str | None = None
    period: str | None = None
    total_invoices: int
    total_taxable_value: float
    total_cgst: float
    total_sgst: float
    total_igst: float
    total_tax_liability: float
    b2b: list[GSTR1B2BRecord] = Field(default_factory=list)
    b2cs: list[GSTR1B2CSRecord] = Field(default_factory=list)
    hsn_summary: list[GSTR1HSNRecord] = Field(default_factory=list)


class FinancialSummaryRequest(BaseModel):
    sales: list[dict[str, Any]] = Field(default_factory=list)
    purchases: list[dict[str, Any]] = Field(default_factory=list)
    expenses: list[dict[str, Any]] = Field(default_factory=list)
    lent: list[dict[str, Any]] = Field(default_factory=list)
    borrowed: list[dict[str, Any]] = Field(default_factory=list)
    currency: str = "INR"


class FinancialSummaryResponse(BaseModel):
    currency: str
    total_sales_revenue: float
    total_cost_of_goods: float
    gross_profit: float
    gross_margin_pct: float
    total_operating_expenses: float
    net_profit: float
    net_profit_margin_pct: float
    total_receivables: float
    total_payables: float
    net_debt_position: float
    operating_cash_flow_estimate: float
