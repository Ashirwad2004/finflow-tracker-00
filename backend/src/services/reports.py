from typing import Any
from src.schemas.reports import (
    FinancialSummaryRequest,
    FinancialSummaryResponse,
    GSTR1B2BRecord,
    GSTR1B2CSRecord,
    GSTR1HSNRecord,
    GSTR1InvoiceItem,
    GSTR1ReportRequest,
    GSTR1ReportResponse,
)


class ReportsService:
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
                # Approximate from sales totals if items array not expanded
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
                taxable_val = float(
                    item.get("taxable_value")
                    or item.get("subtotal")
                    or (float(item.get("total_amount") or 0) / (1 + rate / 100))
                )
                cgst = float(item.get("cgst_amount") or item.get("cgst") or 0.0)
                sgst = float(item.get("sgst_amount") or item.get("sgst") or 0.0)
                igst = float(item.get("igst_amount") or item.get("igst") or 0.0)
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
        operating_cash_flow = total_sales - total_purchases - total_expenses + (total_lent * 0.1)

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
