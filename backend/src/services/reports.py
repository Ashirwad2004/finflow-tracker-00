from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from src.schemas.reports import (
    AgingBucket,
    BalanceSheetResponse,
    CashFlowStatementResponse,
    FinancialSummaryRequest,
    FinancialSummaryResponse,
    GSTR1B2BRecord,
    GSTR1B2CSRecord,
    GSTR1HSNRecord,
    GSTR1InvoiceItem,
    GSTR1ReportRequest,
    GSTR1ReportResponse,
    GSTR2BRecord,
    GSTR2BReportResponse,
    GSTR3BSummaryResponse,
    GSTR9AnnualReportResponse,
    ProfitAndLossResponse,
    ReceivablesAgingResponse,
    TrialBalanceItem,
    TrialBalanceResponse,
)


class ReportsService:
    # =========================================================================
    # GST Returns (GSTR-1, GSTR-2B, GSTR-3B, GSTR-9)
    # =========================================================================

    @staticmethod
    def generate_gstr1_report(payload: GSTR1ReportRequest) -> GSTR1ReportResponse:
        parties_by_id = {
            str(p.get("id")): p for p in payload.parties if p.get("id")
        }

        b2b_records: list[GSTR1B2BRecord] = []
        b2cs_map: dict[tuple[str, float], dict[str, float]] = {}
        hsn_map: dict[str, dict[str, Any]] = {}

        total_taxable = 0.0
        total_cgst = 0.0
        total_sgst = 0.0
        total_igst = 0.0
        total_invoices = len(payload.sales)

        for sale in payload.sales:
            party_id = str(sale.get("party_id") or sale.get("customer_id") or "")
            party = parties_by_id.get(party_id, {})
            customer_gstin = str(
                party.get("gstin")
                or sale.get("customer_gstin")
                or sale.get("gstin")
                or ""
            ).strip()

            customer_name = (
                party.get("name")
                or sale.get("customer_name")
                or "Direct Consumer"
            )
            invoice_num = sale.get("invoice_number") or sale.get("id") or "INV-UNKNOWN"
            invoice_date = (
                sale.get("sale_date")
                or sale.get("date")
                or sale.get("created_at", "")[:10]
            )
            pos = sale.get("place_of_supply") or "27-Maharashtra"
            total_val = float(sale.get("total_amount") or 0.0)

            items_raw = sale.get("items") or sale.get("sales_items") or []
            if not items_raw:
                taxable = float(sale.get("subtotal") or (total_val / 1.18))
                cgst = float(sale.get("cgst_amount") or sale.get("cgst") or 0.0)
                sgst = float(sale.get("sgst_amount") or sale.get("sgst") or 0.0)
                igst = float(sale.get("igst_amount") or sale.get("igst") or 0.0)
                rate = round(
                    ((cgst + sgst + igst) / taxable * 100) if taxable > 0 else 18.0, 2
                )
                items_raw = [
                    {
                        "rate": rate or 18.0,
                        "taxable_value": taxable,
                        "cgst_amount": cgst,
                        "sgst_amount": sgst,
                        "igst_amount": igst,
                        "total_amount": total_val,
                        "hsn_code": "9983",
                        "description": "General Supply",
                        "quantity": 1.0,
                    }
                ]

            sale_items: list[GSTR1InvoiceItem] = []
            for item in items_raw:
                rate = float(item.get("tax_rate") or item.get("rate") or 18.0)
                tot_item = float(
                    item.get("total_amount")
                    or (float(item.get("price") or 0.0) * float(item.get("quantity") or 1.0))
                )
                taxable_val = float(
                    item.get("taxable_value")
                    or item.get("subtotal")
                    or (tot_item / (1 + rate / 100) if tot_item > 0 else 0.0)
                )
                cgst = float(item.get("cgst_amount") or item.get("cgst") or 0.0)
                sgst = float(item.get("sgst_amount") or item.get("sgst") or 0.0)
                igst = float(item.get("igst_amount") or item.get("igst") or 0.0)
                if cgst == 0 and sgst == 0 and igst == 0 and taxable_val > 0:
                    cgst = round((taxable_val * rate / 100) / 2, 2)
                    sgst = round((taxable_val * rate / 100) / 2, 2)
                item_total = float(item.get("total_amount") or (taxable_val + cgst + sgst + igst))

                total_taxable += taxable_val
                total_cgst += cgst
                total_sgst += sgst
                total_igst += igst

                invoice_item = GSTR1InvoiceItem(
                    rate=rate,
                    taxable_value=round(taxable_val, 2),
                    cgst_amount=round(cgst, 2),
                    sgst_amount=round(sgst, 2),
                    igst_amount=round(igst, 2),
                    total_amount=round(item_total, 2),
                )
                sale_items.append(invoice_item)

                # Aggregate HSN
                hsn = str(item.get("hsn_code") or item.get("hsn") or "9983")
                qty = float(item.get("quantity") or 1.0)
                if hsn not in hsn_map:
                    hsn_map[hsn] = {
                        "hsn_code": hsn,
                        "description": item.get("description") or item.get("name") or "Goods/Services",
                        "uqc": item.get("unit") or "NOS",
                        "total_quantity": 0.0,
                        "total_value": 0.0,
                        "taxable_value": 0.0,
                        "cgst_amount": 0.0,
                        "sgst_amount": 0.0,
                        "igst_amount": 0.0,
                    }
                hsn_map[hsn]["total_quantity"] += qty
                hsn_map[hsn]["total_value"] += item_total
                hsn_map[hsn]["taxable_value"] += taxable_val
                hsn_map[hsn]["cgst_amount"] += cgst
                hsn_map[hsn]["sgst_amount"] += sgst
                hsn_map[hsn]["igst_amount"] += igst

                # If B2C, aggregate by (POS, Rate)
                if not customer_gstin or len(customer_gstin) < 15:
                    b2cs_key = (pos, rate)
                    if b2cs_key not in b2cs_map:
                        b2cs_map[b2cs_key] = {
                            "taxable_value": 0.0,
                            "cgst_amount": 0.0,
                            "sgst_amount": 0.0,
                            "igst_amount": 0.0,
                            "total_amount": 0.0,
                        }
                    b2cs_map[b2cs_key]["taxable_value"] += taxable_val
                    b2cs_map[b2cs_key]["cgst_amount"] += cgst
                    b2cs_map[b2cs_key]["sgst_amount"] += sgst
                    b2cs_map[b2cs_key]["igst_amount"] += igst
                    b2cs_map[b2cs_key]["total_amount"] += item_total

            # If B2B (registered customer with valid GSTIN)
            if customer_gstin and len(customer_gstin) >= 15:
                b2b_records.append(
                    GSTR1B2BRecord(
                        customer_gstin=customer_gstin,
                        customer_name=customer_name,
                        invoice_number=invoice_num,
                        invoice_date=invoice_date,
                        invoice_value=round(total_val, 2),
                        place_of_supply=pos,
                        reverse_charge="N",
                        items=sale_items,
                    )
                )

        b2cs_records = [
            GSTR1B2CSRecord(
                place_of_supply=key[0],
                rate=key[1],
                taxable_value=round(val["taxable_value"], 2),
                cgst_amount=round(val["cgst_amount"], 2),
                sgst_amount=round(val["sgst_amount"], 2),
                igst_amount=round(val["igst_amount"], 2),
                total_amount=round(val["total_amount"], 2),
            )
            for key, val in b2cs_map.items()
        ]

        hsn_records = [
            GSTR1HSNRecord(
                hsn_code=val["hsn_code"],
                description=val["description"],
                uqc=val["uqc"],
                total_quantity=round(val["total_quantity"], 2),
                total_value=round(val["total_value"], 2),
                taxable_value=round(val["taxable_value"], 2),
                cgst_amount=round(val["cgst_amount"], 2),
                sgst_amount=round(val["sgst_amount"], 2),
                igst_amount=round(val["igst_amount"], 2),
            )
            for val in hsn_map.values()
        ]

        period_str = f"{payload.month or 'All'}-{payload.year or ''}".strip("-")

        return GSTR1ReportResponse(
            gstin=payload.merchant_gstin,
            period=period_str,
            total_invoices=total_invoices,
            total_taxable_value=round(total_taxable, 2),
            total_cgst=round(total_cgst, 2),
            total_sgst=round(total_sgst, 2),
            total_igst=round(total_igst, 2),
            total_tax_liability=round(total_cgst + total_sgst + total_igst, 2),
            b2b=b2b_records,
            b2cs=b2cs_records,
            hsn_summary=hsn_records,
        )

    @staticmethod
    def generate_gstr2b_report(
        purchases: list[dict[str, Any]],
        merchant_gstin: Optional[str] = None,
        period: Optional[str] = None,
    ) -> GSTR2BReportResponse:
        records: list[GSTR2BRecord] = []
        tot_taxable = 0.0
        tot_cgst = 0.0
        tot_sgst = 0.0
        tot_igst = 0.0

        for p in purchases:
            total_val = float(p.get("total_amount") or 0.0)
            subtotal = float(p.get("subtotal") or (total_val / 1.18))
            cgst = float(p.get("cgst") or 0.0)
            sgst = float(p.get("sgst") or 0.0)
            igst = float(p.get("igst") or 0.0)

            tot_taxable += subtotal
            tot_cgst += cgst
            tot_sgst += sgst
            tot_igst += igst

            records.append(
                GSTR2BRecord(
                    supplier_gstin=str(p.get("vendor_gstin") or "URP"),
                    supplier_name=str(p.get("vendor_name") or "Vendor"),
                    invoice_number=str(p.get("bill_number") or p.get("id") or "BILL-001"),
                    invoice_date=str(p.get("date") or p.get("created_at", "")[:10]),
                    invoice_value=round(total_val, 2),
                    taxable_value=round(subtotal, 2),
                    cgst_amount=round(cgst, 2),
                    sgst_amount=round(sgst, 2),
                    igst_amount=round(igst, 2),
                    itc_available="Y",
                )
            )

        return GSTR2BReportResponse(
            gstin=merchant_gstin,
            period=period,
            total_bills=len(purchases),
            total_taxable_value=round(tot_taxable, 2),
            total_cgst=round(tot_cgst, 2),
            total_sgst=round(tot_sgst, 2),
            total_igst=round(tot_igst, 2),
            total_itc_available=round(tot_cgst + tot_sgst + tot_igst, 2),
            records=records,
        )

    @staticmethod
    def generate_gstr3b_summary(
        sales: list[dict[str, Any]],
        purchases: list[dict[str, Any]],
        merchant_gstin: Optional[str] = None,
        period: Optional[str] = None,
    ) -> GSTR3BSummaryResponse:
        outward_taxable = sum(float(s.get("subtotal") or 0.0) for s in sales)
        outward_cgst = sum(float(s.get("cgst") or 0.0) for s in sales)
        outward_sgst = sum(float(s.get("sgst") or 0.0) for s in sales)
        outward_igst = sum(float(s.get("igst") or 0.0) for s in sales)
        outward_total = outward_cgst + outward_sgst + outward_igst

        itc_cgst = sum(float(p.get("cgst") or 0.0) for p in purchases)
        itc_sgst = sum(float(p.get("sgst") or 0.0) for p in purchases)
        itc_igst = sum(float(p.get("igst") or 0.0) for p in purchases)
        itc_total = itc_cgst + itc_sgst + itc_igst

        net_cgst = max(0.0, outward_cgst - itc_cgst)
        net_sgst = max(0.0, outward_sgst - itc_sgst)
        net_igst = max(0.0, outward_igst - itc_igst)

        return GSTR3BSummaryResponse(
            gstin=merchant_gstin,
            period=period,
            outward_taxable_value=round(outward_taxable, 2),
            outward_cgst=round(outward_cgst, 2),
            outward_sgst=round(outward_sgst, 2),
            outward_igst=round(outward_igst, 2),
            outward_total_tax=round(outward_total, 2),
            eligible_itc_cgst=round(itc_cgst, 2),
            eligible_itc_sgst=round(itc_sgst, 2),
            eligible_itc_igst=round(itc_igst, 2),
            eligible_itc_total=round(itc_total, 2),
            net_tax_payable_cgst=round(net_cgst, 2),
            net_tax_payable_sgst=round(net_sgst, 2),
            net_tax_payable_igst=round(net_igst, 2),
            net_tax_payable_total=round(net_cgst + net_sgst + net_igst, 2),
        )

    @staticmethod
    def generate_gstr9_report(
        sales: list[dict[str, Any]],
        purchases: list[dict[str, Any]],
        financial_year: str = "2025-26",
        merchant_gstin: Optional[str] = None,
    ) -> GSTR9AnnualReportResponse:
        total_turnover = sum(float(s.get("total_amount") or 0.0) for s in sales)
        b2b_sales = sum(
            float(s.get("total_amount") or 0.0)
            for s in sales
            if s.get("customer_gstin") and len(str(s.get("customer_gstin"))) >= 15
        )
        b2c_sales = total_turnover - b2b_sales

        out_tax = sum(
            float(s.get("tax_amount") or (float(s.get("cgst") or 0) + float(s.get("sgst") or 0) + float(s.get("igst") or 0)))
            for s in sales
        )
        in_purchases = sum(float(p.get("total_amount") or 0.0) for p in purchases)
        in_itc = sum(
            float(p.get("tax_amount") or (float(p.get("cgst") or 0) + float(p.get("sgst") or 0) + float(p.get("igst") or 0)))
            for p in purchases
        )

        return GSTR9AnnualReportResponse(
            gstin=merchant_gstin,
            financial_year=financial_year,
            total_outward_turnover=round(total_turnover, 2),
            total_b2b_sales=round(b2b_sales, 2),
            total_b2c_sales=round(b2c_sales, 2),
            total_output_tax=round(out_tax, 2),
            total_inward_purchases=round(in_purchases, 2),
            total_itc_availed=round(in_itc, 2),
            net_tax_paid_or_payable=round(max(0.0, out_tax - in_itc), 2),
        )

    # =========================================================================
    # Financial Statements & CA Standards (P&L, Balance Sheet, Trial Balance)
    # =========================================================================

    @staticmethod
    def generate_financial_summary(payload: FinancialSummaryRequest) -> FinancialSummaryResponse:
        total_sales = sum(float(s.get("total_amount") or 0) for s in payload.sales)
        total_purchases = sum(float(p.get("total_amount") or 0) for p in payload.purchases)
        total_expenses = sum(float(e.get("amount") or 0) for e in payload.expenses)

        total_lent = sum(
            float(l.get("amount") or 0)
            for l in payload.lent
            if l.get("status") != "paid"
        )
        total_borrowed = sum(
            float(b.get("amount") or 0)
            for b in payload.borrowed
            if b.get("status") != "paid"
        )

        gross_profit = total_sales - total_purchases
        gross_margin = (gross_profit / total_sales * 100) if total_sales > 0 else 0.0
        net_profit = gross_profit - total_expenses
        net_margin = (net_profit / total_sales * 100) if total_sales > 0 else 0.0
        net_debt = total_borrowed - total_lent
        operating_cash_flow = total_sales - total_purchases - total_expenses

        return FinancialSummaryResponse(
            currency=payload.currency,
            total_sales_revenue=round(total_sales, 2),
            total_cost_of_goods=round(total_purchases, 2),
            gross_profit=round(gross_profit, 2),
            gross_margin_pct=round(gross_margin, 2),
            total_operating_expenses=round(total_expenses, 2),
            net_profit=round(net_profit, 2),
            net_profit_margin_pct=round(net_margin, 2),
            total_receivables=round(total_lent, 2),
            total_payables=round(total_borrowed, 2),
            net_debt_position=round(net_debt, 2),
            operating_cash_flow_estimate=round(operating_cash_flow, 2),
        )

    @staticmethod
    def generate_profit_and_loss(
        sales: list[dict[str, Any]],
        purchases: list[dict[str, Any]],
        expenses: list[dict[str, Any]],
        products: list[dict[str, Any]],
        direct_expense_categories: Optional[list[str]] = None,
    ) -> ProfitAndLossResponse:
        gross_sales = sum(float(s.get("total_amount") or 0.0) for s in sales)
        sales_returns = sum(
            float(s.get("total_amount") or 0.0)
            for s in sales
            if s.get("document_type") in ("credit_note", "sales_return")
        )
        net_revenue = gross_sales - sales_returns

        # Closing stock valuation
        closing_stock = sum(
            float(p.get("current_stock") or p.get("stock_quantity") or 0.0) * float(p.get("cost_price") or p.get("price") or 0.0)
            for p in products
        )
        purchases_cost = sum(float(p.get("total_amount") or 0.0) for p in purchases)

        direct_cats = ("freight", "packaging", "labor", "direct", "raw materials", "production")
        if direct_expense_categories:
            direct_cats = tuple(c.lower() for c in direct_expense_categories)

        direct_exp = 0.0
        indirect_map: dict[str, float] = {}

        for e in expenses:
            cat_name = str(e.get("category") or e.get("category_id") or e.get("description") or "Administrative").strip()
            amt = float(e.get("amount") or 0.0)
            is_dir = any(dc in cat_name.lower() for dc in direct_cats)
            if is_dir:
                direct_exp += amt
            else:
                display_cat = cat_name.title() or "Administrative"
                indirect_map[display_cat] = round(indirect_map.get(display_cat, 0.0) + amt, 2)

        cogs = max(0.0, purchases_cost + direct_exp - (closing_stock * 0.1 if closing_stock > 0 else 0.0))
        gross_profit = net_revenue - cogs
        gp_margin = (gross_profit / net_revenue * 100) if net_revenue > 0 else 0.0

        tot_indirect = sum(indirect_map.values())
        net_profit = gross_profit - tot_indirect
        np_margin = (net_profit / net_revenue * 100) if net_revenue > 0 else 0.0

        return ProfitAndLossResponse(
            revenue_from_operations=round(gross_sales, 2),
            sales_returns=round(sales_returns, 2),
            net_revenue=round(net_revenue, 2),
            opening_stock_value=round(closing_stock * 0.9, 2),
            purchases_cost=round(purchases_cost, 2),
            direct_expenses=round(direct_exp, 2),
            closing_stock_value=round(closing_stock, 2),
            cost_of_goods_sold=round(cogs, 2),
            gross_profit=round(gross_profit, 2),
            gross_profit_margin_pct=round(gp_margin, 2),
            indirect_expenses=indirect_map,
            total_indirect_expenses=round(tot_indirect, 2),
            net_profit_before_tax=round(net_profit, 2),
            net_profit_margin_pct=round(np_margin, 2),
        )

    @staticmethod
    def generate_trial_balance(
        sales: list[dict[str, Any]],
        purchases: list[dict[str, Any]],
        expenses: list[dict[str, Any]],
        products: Optional[list[dict[str, Any]]] = None,
        parties: Optional[list[dict[str, Any]]] = None,
        lent: Optional[list[dict[str, Any]]] = None,
        borrowed: Optional[list[dict[str, Any]]] = None,
    ) -> TrialBalanceResponse:
        products = products or []
        lent = lent or []
        borrowed = borrowed or []
        items: list[TrialBalanceItem] = []

        tot_sales = sum(float(s.get("total_amount") or 0.0) for s in sales)
        tot_purchases = sum(float(p.get("total_amount") or 0.0) for p in purchases)
        tot_expenses = sum(float(e.get("amount") or 0.0) for e in expenses)

        # Debtors (Unpaid sales balance)
        sundry_debtors = sum(
            float(s.get("balance_due") if s.get("balance_due") is not None else (float(s.get("total_amount") or 0) - float(s.get("amount_paid") or 0)))
            for s in sales
        )
        # Creditors (Unpaid purchases balance)
        sundry_creditors = sum(
            float(p.get("balance_due") if p.get("balance_due") is not None else float(p.get("total_amount") or 0))
            for p in purchases
        )

        stock_val = sum(
            float(pr.get("stock_quantity") or 0) * float(pr.get("cost_price") or pr.get("price") or 0)
            for pr in products
        )

        tot_lent = sum(float(l.get("amount") or 0) for l in lent if l.get("status") != "paid")
        tot_borrowed = sum(float(b.get("amount") or 0) for b in borrowed if b.get("status") != "paid")

        # Cash & Bank estimate
        cash_collected = sum(float(s.get("amount_paid") or s.get("total_amount") or 0) for s in sales)
        cash_paid = sum(float(p.get("total_amount") or 0) for p in purchases) + tot_expenses
        bank_cash_bal = max(0.0, cash_collected - cash_paid)

        # Assets & Expenses (Debit)
        items.append(TrialBalanceItem(account_name="Purchases Account", account_type="Expense", debit_amount=round(tot_purchases, 2), credit_amount=0.0))
        items.append(TrialBalanceItem(account_name="Direct & Indirect Expenses", account_type="Expense", debit_amount=round(tot_expenses, 2), credit_amount=0.0))
        items.append(TrialBalanceItem(account_name="Sundry Debtors (Receivables)", account_type="Asset", debit_amount=round(sundry_debtors, 2), credit_amount=0.0))
        items.append(TrialBalanceItem(account_name="Closing Stock Inventory", account_type="Asset", debit_amount=round(stock_val, 2), credit_amount=0.0))
        items.append(TrialBalanceItem(account_name="Cash & Bank Balances", account_type="Asset", debit_amount=round(bank_cash_bal, 2), credit_amount=0.0))
        if tot_lent > 0:
            items.append(TrialBalanceItem(account_name="Loans & Advances (Lent)", account_type="Asset", debit_amount=round(tot_lent, 2), credit_amount=0.0))

        # Incomes & Liabilities (Credit)
        items.append(TrialBalanceItem(account_name="Sales Revenue Account", account_type="Income", debit_amount=0.0, credit_amount=round(tot_sales, 2)))
        items.append(TrialBalanceItem(account_name="Sundry Creditors (Payables)", account_type="Liability", debit_amount=0.0, credit_amount=round(sundry_creditors, 2)))
        if tot_borrowed > 0:
            items.append(TrialBalanceItem(account_name="Borrowings & Loans", account_type="Liability", debit_amount=0.0, credit_amount=round(tot_borrowed, 2)))

        total_debit = sum(i.debit_amount for i in items)
        total_credit = sum(i.credit_amount for i in items)

        # Capital balancing account
        capital_diff = total_debit - total_credit
        if capital_diff > 0:
            items.append(TrialBalanceItem(account_name="Proprietor's Capital / Equity", account_type="Equity", debit_amount=0.0, credit_amount=round(capital_diff, 2)))
            total_credit += round(capital_diff, 2)
        elif capital_diff < 0:
            items.append(TrialBalanceItem(account_name="Proprietor's Drawings / Debit", account_type="Equity", debit_amount=round(abs(capital_diff), 2), credit_amount=0.0))
            total_debit += round(abs(capital_diff), 2)

        return TrialBalanceResponse(
            items=items,
            total_debit=round(total_debit, 2),
            total_credit=round(total_credit, 2),
            is_balanced=round(total_debit, 2) == round(total_credit, 2),
            difference=round(abs(total_debit - total_credit), 2),
        )

    @staticmethod
    def generate_receivables_aging(
        sales: list[dict[str, Any]],
        ref_date: Optional[str] = None,
    ) -> ReceivablesAgingResponse:
        now = datetime.now(timezone.utc)
        if ref_date:
            try:
                now = datetime.fromisoformat(ref_date.replace("Z", "+00:00"))
            except Exception:
                pass

        party_buckets: dict[str, AgingBucket] = {}
        tot_all = 0.0
        tot_0_30 = 0.0
        tot_31_60 = 0.0
        tot_61_90 = 0.0
        tot_90_plus = 0.0

        for sale in sales:
            bal = float(
                sale.get("balance_due")
                if sale.get("balance_due") is not None
                else (float(sale.get("total_amount") or 0) - float(sale.get("amount_paid") or 0))
            )
            if bal <= 0:
                continue

            party_id = str(sale.get("party_id") or sale.get("customer_name") or "Direct Customer")
            party_name = str(sale.get("customer_name") or "Direct Customer")
            phone = sale.get("customer_phone")

            if party_id not in party_buckets:
                party_buckets[party_id] = AgingBucket(
                    party_id=party_id,
                    party_name=party_name,
                    contact_phone=phone,
                    total_outstanding=0.0,
                    bucket_0_30=0.0,
                    bucket_31_60=0.0,
                    bucket_61_90=0.0,
                    bucket_90_plus=0.0,
                )

            # Calculate days overdue
            inv_date_str = sale.get("due_date") or sale.get("date") or sale.get("created_at", "")[:10]
            try:
                date_clean = str(inv_date_str).strip()
                if "T" in date_clean:
                    inv_dt = datetime.fromisoformat(date_clean.replace("Z", "+00:00"))
                else:
                    inv_dt = datetime.fromisoformat(date_clean[:10]).replace(tzinfo=timezone.utc)
                if inv_dt.tzinfo is None:
                    inv_dt = inv_dt.replace(tzinfo=timezone.utc)
                days = (now - inv_dt).days
            except Exception:
                days = 15

            b = party_buckets[party_id]
            b.total_outstanding += bal
            tot_all += bal

            if days <= 30:
                b.bucket_0_30 += bal
                tot_0_30 += bal
            elif days <= 60:
                b.bucket_31_60 += bal
                tot_31_60 += bal
            elif days <= 90:
                b.bucket_61_90 += bal
                tot_61_90 += bal
            else:
                b.bucket_90_plus += bal
                tot_90_plus += bal

        # Round all buckets
        result_buckets: list[AgingBucket] = []
        for b in party_buckets.values():
            result_buckets.append(
                AgingBucket(
                    party_id=b.party_id,
                    party_name=b.party_name,
                    contact_phone=b.contact_phone,
                    total_outstanding=round(b.total_outstanding, 2),
                    bucket_0_30=round(b.bucket_0_30, 2),
                    bucket_31_60=round(b.bucket_31_60, 2),
                    bucket_61_90=round(b.bucket_61_90, 2),
                    bucket_90_plus=round(b.bucket_90_plus, 2),
                )
            )

        return ReceivablesAgingResponse(
            total_outstanding=round(tot_all, 2),
            total_0_30=round(tot_0_30, 2),
            total_31_60=round(tot_31_60, 2),
            total_61_90=round(tot_61_90, 2),
            total_90_plus=round(tot_90_plus, 2),
            buckets=result_buckets,
        )

    @staticmethod
    def generate_balance_sheet(
        sales: list[dict[str, Any]],
        purchases: list[dict[str, Any]],
        expenses: list[dict[str, Any]],
        products: list[dict[str, Any]],
        parties: list[dict[str, Any]],
        lent: list[dict[str, Any]],
        borrowed: list[dict[str, Any]],
    ) -> BalanceSheetResponse:
        sundry_debtors = 0.0
        for s in sales:
            bal = float(
                s.get("balance_due")
                if s.get("balance_due") is not None
                else (float(s.get("total_amount") or 0) - float(s.get("amount_paid") or 0))
            )
            if bal > 0:
                sundry_debtors += bal

        closing_stock = 0.0
        for prod in products:
            qty = max(0.0, float(prod.get("current_stock") or prod.get("stock_quantity") or 0.0))
            cost = float(prod.get("cost_price") or prod.get("purchase_price") or prod.get("price") or 0.0)
            closing_stock += (qty * cost)

        loans_given = 0.0
        for l in lent:
            bal = float(l.get("amount") or 0.0) - float(l.get("recovered_amount") or l.get("paid_amount") or 0.0)
            if bal > 0:
                loans_given += bal

        cash_inflows = sum(float(s.get("amount_paid") or 0.0) for s in sales)
        cash_outflows = sum(float(p.get("amount_paid") or 0.0) for p in purchases) + sum(float(e.get("amount") or 0.0) for e in expenses)
        borrowings_in = sum(float(b.get("amount") or 0.0) for b in borrowed)
        lent_out = sum(float(l.get("amount") or 0.0) for l in lent)
        estimated_cash_bank = max(0.0, cash_inflows - cash_outflows + borrowings_in - lent_out)

        current_assets = {
            "Cash & Bank Balance": round(estimated_cash_bank, 2),
            "Sundry Debtors (Trade Receivables)": round(sundry_debtors, 2),
            "Closing Stock (Inventory at Cost)": round(closing_stock, 2),
            "Loans & Advances Given": round(loans_given, 2),
        }
        total_current_assets = sum(current_assets.values())
        non_current_assets = {
            "Fixed Assets & Equipment": 0.0
        }
        total_non_current_assets = sum(non_current_assets.values())
        total_assets = total_current_assets + total_non_current_assets

        sundry_creditors = 0.0
        for p in purchases:
            bal = float(
                p.get("balance_due")
                if p.get("balance_due") is not None
                else (float(p.get("total_amount") or 0) - float(p.get("amount_paid") or 0))
            )
            if bal > 0:
                sundry_creditors += bal

        tot_output_gst = sum(float(s.get("tax_amount") or s.get("gst_amount") or 0.0) for s in sales)
        tot_input_gst = sum(float(p.get("cgst") or 0) + float(p.get("sgst") or 0) + float(p.get("igst") or 0) for p in purchases)
        net_gst_payable = max(0.0, tot_output_gst - tot_input_gst)

        current_liabilities = {
            "Sundry Creditors (Trade Payables)": round(sundry_creditors, 2),
            "Statutory Dues (GST Payable)": round(net_gst_payable, 2),
        }
        total_current_liabilities = sum(current_liabilities.values())

        borrowings_due = 0.0
        for b in borrowed:
            bal = float(b.get("amount") or 0.0) - float(b.get("repaid_amount") or 0.0)
            if bal > 0:
                borrowings_due += bal

        non_current_liabilities = {
            "Loans & Borrowings Payable": round(borrowings_due, 2),
        }
        total_non_current_liabilities = sum(non_current_liabilities.values())
        total_liabilities = total_current_liabilities + total_non_current_liabilities

        total_revenue = sum(float(s.get("total_amount") or 0.0) for s in sales)
        total_cost = sum(float(p.get("total_amount") or 0.0) for p in purchases)
        total_exp = sum(float(e.get("amount") or 0.0) for e in expenses)
        period_net_profit = total_revenue - total_cost - total_exp

        proprietor_capital = max(0.0, total_assets - total_liabilities - period_net_profit)
        total_equity = proprietor_capital + period_net_profit
        total_liab_and_equity = total_liabilities + total_equity

        return BalanceSheetResponse(
            current_assets=current_assets,
            total_current_assets=round(total_current_assets, 2),
            non_current_assets=non_current_assets,
            total_non_current_assets=round(total_non_current_assets, 2),
            total_assets=round(total_assets, 2),
            current_liabilities=current_liabilities,
            total_current_liabilities=round(total_current_liabilities, 2),
            non_current_liabilities=non_current_liabilities,
            total_non_current_liabilities=round(total_non_current_liabilities, 2),
            total_liabilities=round(total_liabilities, 2),
            proprietor_capital=round(proprietor_capital, 2),
            current_period_profit=round(period_net_profit, 2),
            total_equity=round(total_equity, 2),
            total_liabilities_and_equity=round(total_liab_and_equity, 2),
            is_balanced=round(total_assets, 2) == round(total_liab_and_equity, 2),
        )

    @staticmethod
    def generate_cash_flow(
        sales: list[dict[str, Any]],
        purchases: list[dict[str, Any]],
        expenses: list[dict[str, Any]],
        lent: list[dict[str, Any]],
        borrowed: list[dict[str, Any]],
    ) -> CashFlowStatementResponse:
        operating_inflows = sum(float(s.get("amount_paid") or 0.0) for s in sales)
        operating_outflows = (
            sum(float(p.get("amount_paid") or 0.0) for p in purchases)
            + sum(float(e.get("amount") or 0.0) for e in expenses)
        )
        net_operating = operating_inflows - operating_outflows

        financing_inflows = sum(float(b.get("amount") or 0.0) for b in borrowed)
        financing_outflows = sum(float(l.get("amount") or 0.0) for l in lent)
        net_financing = financing_inflows - financing_outflows

        net_cash = net_operating + net_financing
        closing_estimate = max(0.0, net_cash)

        return CashFlowStatementResponse(
            operating_inflows=round(operating_inflows, 2),
            operating_outflows=round(operating_outflows, 2),
            net_operating_cash_flow=round(net_operating, 2),
            financing_inflows=round(financing_inflows, 2),
            financing_outflows=round(financing_outflows, 2),
            net_financing_cash_flow=round(net_financing, 2),
            net_cash_generated=round(net_cash, 2),
            closing_cash_and_bank_estimate=round(closing_estimate, 2),
        )
