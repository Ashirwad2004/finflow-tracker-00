from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# =============================================================================
# GST Report Models (GSTR-1, GSTR-2B, GSTR-3B, GSTR-9)
# =============================================================================

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
    merchant_gstin: Optional[str] = None
    month: Optional[str] = None
    year: Optional[int] = None


class GSTR1ReportResponse(BaseModel):
    gstin: Optional[str] = None
    period: Optional[str] = None
    total_invoices: int
    total_taxable_value: float
    total_cgst: float
    total_sgst: float
    total_igst: float
    total_tax_liability: float
    b2b: list[GSTR1B2BRecord] = Field(default_factory=list)
    b2cs: list[GSTR1B2CSRecord] = Field(default_factory=list)
    hsn_summary: list[GSTR1HSNRecord] = Field(default_factory=list)


class GSTR2BRecord(BaseModel):
    supplier_gstin: str
    supplier_name: str
    invoice_number: str
    invoice_date: str
    invoice_value: float
    taxable_value: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    itc_available: str = "Y"


class GSTR2BReportRequest(BaseModel):
    purchases: list[dict[str, Any]] = Field(default_factory=list)
    merchant_gstin: Optional[str] = None
    period: Optional[str] = None


class GSTR2BReportResponse(BaseModel):
    gstin: Optional[str] = None
    period: Optional[str] = None
    total_bills: int
    total_taxable_value: float
    total_cgst: float
    total_sgst: float
    total_igst: float
    total_itc_available: float
    records: list[GSTR2BRecord] = Field(default_factory=list)


class GSTR3BReportRequest(BaseModel):
    sales: list[dict[str, Any]] = Field(default_factory=list)
    purchases: list[dict[str, Any]] = Field(default_factory=list)
    merchant_gstin: Optional[str] = None
    period: Optional[str] = None


class GSTR3BSummaryResponse(BaseModel):
    gstin: Optional[str] = None
    period: Optional[str] = None
    outward_taxable_value: float
    outward_cgst: float
    outward_sgst: float
    outward_igst: float
    outward_total_tax: float
    eligible_itc_cgst: float
    eligible_itc_sgst: float
    eligible_itc_igst: float
    eligible_itc_total: float
    net_tax_payable_cgst: float
    net_tax_payable_sgst: float
    net_tax_payable_igst: float
    net_tax_payable_total: float


class GSTR9ReportRequest(BaseModel):
    sales: list[dict[str, Any]] = Field(default_factory=list)
    purchases: list[dict[str, Any]] = Field(default_factory=list)
    merchant_gstin: Optional[str] = None
    financial_year: str = "2024-25"


class GSTR9AnnualReportResponse(BaseModel):
    gstin: Optional[str] = None
    financial_year: str
    total_outward_turnover: float
    total_b2b_sales: float
    total_b2c_sales: float
    total_output_tax: float
    total_inward_purchases: float
    total_itc_availed: float
    net_tax_paid_or_payable: float


# =============================================================================
# Financial, Accounting & CA Audit Report Models
# =============================================================================

class ProfitAndLossRequest(BaseModel):
    sales: list[dict[str, Any]] = Field(default_factory=list)
    purchases: list[dict[str, Any]] = Field(default_factory=list)
    expenses: list[dict[str, Any]] = Field(default_factory=list)
    products: list[dict[str, Any]] = Field(default_factory=list)
    direct_expense_categories: Optional[list[str]] = None


class TrialBalanceRequest(BaseModel):
    sales: list[dict[str, Any]] = Field(default_factory=list)
    purchases: list[dict[str, Any]] = Field(default_factory=list)
    expenses: list[dict[str, Any]] = Field(default_factory=list)
    products: list[dict[str, Any]] = Field(default_factory=list)
    parties: list[dict[str, Any]] = Field(default_factory=list)
    lent: list[dict[str, Any]] = Field(default_factory=list)
    borrowed: list[dict[str, Any]] = Field(default_factory=list)


class BalanceSheetRequest(BaseModel):
    sales: list[dict[str, Any]] = Field(default_factory=list)
    purchases: list[dict[str, Any]] = Field(default_factory=list)
    expenses: list[dict[str, Any]] = Field(default_factory=list)
    products: list[dict[str, Any]] = Field(default_factory=list)
    parties: list[dict[str, Any]] = Field(default_factory=list)
    lent: list[dict[str, Any]] = Field(default_factory=list)
    borrowed: list[dict[str, Any]] = Field(default_factory=list)


class ReceivablesAgingRequest(BaseModel):
    sales: list[dict[str, Any]] = Field(default_factory=list)
    ref_date: Optional[str] = None


class CashFlowStatementRequest(BaseModel):
    sales: list[dict[str, Any]] = Field(default_factory=list)
    purchases: list[dict[str, Any]] = Field(default_factory=list)
    expenses: list[dict[str, Any]] = Field(default_factory=list)
    lent: list[dict[str, Any]] = Field(default_factory=list)
    borrowed: list[dict[str, Any]] = Field(default_factory=list)


class FinancialSummaryRequest(BaseModel):
    sales: list[dict[str, Any]] = Field(default_factory=list)
    purchases: list[dict[str, Any]] = Field(default_factory=list)
    expenses: list[dict[str, Any]] = Field(default_factory=list)
    lent: list[dict[str, Any]] = Field(default_factory=list)
    borrowed: list[dict[str, Any]] = Field(default_factory=list)
    products: list[dict[str, Any]] = Field(default_factory=list)
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


class ProfitAndLossResponse(BaseModel):
    revenue_from_operations: float
    sales_returns: float
    net_revenue: float
    opening_stock_value: float
    purchases_cost: float
    direct_expenses: float
    closing_stock_value: float
    cost_of_goods_sold: float
    gross_profit: float
    gross_profit_margin_pct: float
    indirect_expenses: dict[str, float] = Field(default_factory=dict)
    total_indirect_expenses: float
    net_profit_before_tax: float
    net_profit_margin_pct: float


class TrialBalanceItem(BaseModel):
    account_name: str
    account_type: str  # Asset, Liability, Income, Expense, Equity
    debit_amount: float
    credit_amount: float


class TrialBalanceResponse(BaseModel):
    items: list[TrialBalanceItem] = Field(default_factory=list)
    total_debit: float
    total_credit: float
    is_balanced: bool
    difference: float


class BalanceSheetResponse(BaseModel):
    current_assets: dict[str, float] = Field(default_factory=dict)
    total_current_assets: float
    non_current_assets: dict[str, float] = Field(default_factory=dict)
    total_non_current_assets: float
    total_assets: float
    current_liabilities: dict[str, float] = Field(default_factory=dict)
    total_current_liabilities: float
    non_current_liabilities: dict[str, float] = Field(default_factory=dict)
    total_liabilities: float
    proprietor_capital: float
    current_period_profit: float
    total_equity: float
    total_liabilities_and_equity: float
    is_balanced: bool


class AgingBucket(BaseModel):
    party_id: Optional[str] = None
    party_name: str
    contact_phone: Optional[str] = None
    total_outstanding: float
    bucket_0_30: float
    bucket_31_60: float
    bucket_61_90: float
    bucket_90_plus: float


class ReceivablesAgingResponse(BaseModel):
    total_outstanding: float
    total_0_30: float
    total_31_60: float
    total_61_90: float
    total_90_plus: float
    buckets: list[AgingBucket] = Field(default_factory=list)


class CashFlowStatementResponse(BaseModel):
    operating_inflows: float   # Collections from sales / customers
    operating_outflows: float  # Payments to vendors & expenses
    net_operating_cash_flow: float
    financing_inflows: float   # Loans borrowed
    financing_outflows: float  # Loans repaid / lent
    net_financing_cash_flow: float
    net_cash_generated: float
    closing_cash_and_bank_estimate: float
