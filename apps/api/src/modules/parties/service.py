import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from src.core.supabase import supabase_client
from .repository import PartyRepository
from .schemas import PartyCreateRequest, PartyUpdateRequest

logger = logging.getLogger(__name__)


class PartyService:
    @classmethod
    def list_parties(
        cls,
        store_id: str,
        party_type: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        parties = PartyRepository.list_parties(
            store_id=store_id,
            party_type=party_type,
            search=search,
            limit=limit,
            offset=offset,
        )

        # Enhance each party with server-authoritative balance calculations
        if supabase_client:
            try:
                # Fetch pending balances from sales and purchases in bulk
                sales_res = (
                    supabase_client.table("sales")
                    .select("party_id, customer_name, balance_due, total_amount, amount_paid, status, document_type")
                    .eq("user_id", store_id)
                    .neq("status", "draft")
                    .execute()
                )
                purchases_res = (
                    supabase_client.table("purchases")
                    .select("party_id, vendor_name, balance_due, total_amount, amount_paid, status")
                    .eq("user_id", store_id)
                    .execute()
                )
                sales = getattr(sales_res, "data", []) or []
                purchases = getattr(purchases_res, "data", []) or []

                sales_due_map: Dict[str, float] = {}
                sales_total_map: Dict[str, float] = {}
                purchases_due_map: Dict[str, float] = {}
                purchases_total_map: Dict[str, float] = {}

                for s in sales:
                    pid = s.get("party_id")
                    pname = (s.get("customer_name") or "").lower().strip() if isinstance(s.get("customer_name"), str) else ""
                    due = float(s.get("balance_due") if s.get("balance_due") is not None else max(0, float(s.get("total_amount") or 0) - float(s.get("amount_paid") or 0)))
                    tot = float(s.get("total_amount") or 0)
                    doc_type = (s.get("document_type") or "invoice").lower()

                    keys = []
                    if pid:
                        keys.append(str(pid))
                    if pname:
                        keys.append(pname)

                    for k in keys:
                        if doc_type == "credit_note":
                            sales_due_map[k] = sales_due_map.get(k, 0.0) - tot
                        elif doc_type == "debit_note":
                            sales_due_map[k] = sales_due_map.get(k, 0.0) + tot
                        elif doc_type != "receipt":
                            sales_due_map[k] = sales_due_map.get(k, 0.0) + due
                        sales_total_map[k] = sales_total_map.get(k, 0.0) + tot

                for p in purchases:
                    pid = p.get("party_id")
                    pname = (p.get("vendor_name") or "").lower().strip() if isinstance(p.get("vendor_name"), str) else ""
                    due = float(p.get("balance_due") if p.get("balance_due") is not None else max(0, float(p.get("total_amount") or 0) - float(p.get("amount_paid") or 0)))
                    tot = float(p.get("total_amount") or 0)

                    keys = []
                    if pid:
                        keys.append(str(pid))
                    if pname:
                        keys.append(pname)

                    for k in keys:
                        purchases_due_map[k] = purchases_due_map.get(k, 0.0) + due
                        purchases_total_map[k] = purchases_total_map.get(k, 0.0) + tot

                for party in parties:
                    pid = str(party.get("id"))
                    pname = (party.get("name") or "").lower().strip()
                    open_bal = float(party.get("opening_balance") or 0)
                    is_receivable = party.get("opening_balance_type") == "to_receive" if party.get("opening_balance_type") else party.get("type") != "vendor"

                    cust_due = sales_due_map.get(pid) or sales_due_map.get(pname, 0.0)
                    vend_due = purchases_due_map.get(pid) or purchases_due_map.get(pname, 0.0)

                    base_open = open_bal if is_receivable else -open_bal
                    party["current_balance"] = round(base_open + cust_due - vend_due, 2)
                    party["total_sales"] = round(sales_total_map.get(pid) or sales_total_map.get(pname, 0.0), 2)
                    party["total_purchases"] = round(purchases_total_map.get(pid) or purchases_total_map.get(pname, 0.0), 2)
            except Exception as exc:
                logger.warning("Failed to compute bulk party balances: %s", exc)

        return parties

    @classmethod
    def calculate_party_pending_balance(
        cls,
        store_id: str,
        party_id: Optional[str] = None,
        customer_name: Optional[str] = None,
    ) -> Optional[float]:
        """
        Calculates the authoritative total pending/outstanding balance for a party.
        Reuses the existing party ledger / sales balance calculation.
        Respects payments, credit/debit notes, cancelled invoices, and tenant isolation.
        Returns None if no customer or anonymous cash customer without an associated party.
        """
        if not party_id and not customer_name:
            return None

        c_name = (customer_name or "").strip()
        if not party_id and (not c_name or c_name.lower() == "cash customer"):
            return None

        if supabase_client is None:
            return None

        try:
            # 1. Resolve party record if party_id provided or by customer name
            party_record = None
            if party_id:
                party_res = (
                    supabase_client.table("parties")
                    .select("*")
                    .eq("id", party_id)
                    .eq("user_id", store_id)
                    .maybe_single()
                    .execute()
                )
                party_record = getattr(party_res, "data", None)

            if not party_record and c_name:
                party_res = (
                    supabase_client.table("parties")
                    .select("*")
                    .eq("user_id", store_id)
                    .ilike("name", c_name)
                    .limit(1)
                    .execute()
                )
                p_data = getattr(party_res, "data", [])
                if p_data and len(p_data) > 0:
                    party_record = p_data[0]

            # 2. If party record found, calculate using authoritative party ledger rules
            resolved_party_id = party_record.get("id") if party_record else None
            open_bal = float(party_record.get("opening_balance") or 0.0) if party_record else 0.0
            is_receivable = (
                party_record.get("opening_balance_type") == "to_receive"
                if party_record and party_record.get("opening_balance_type")
                else (party_record.get("type") != "vendor" if party_record else True)
            )
            running_bal = open_bal if is_receivable else -open_bal

            # Query sales for this store and party/customer
            sales_query = (
                supabase_client.table("sales")
                .select("id, total_amount, amount_paid, balance_due, status, document_type, party_id, customer_name")
                .eq("user_id", store_id)
            )
            if resolved_party_id:
                sales_query = sales_query.eq("party_id", str(resolved_party_id))
            else:
                sales_query = sales_query.ilike("customer_name", c_name)

            sales_res = sales_query.execute()
            sales = getattr(sales_res, "data", []) or []

            for s in sales:
                status_str = (s.get("status") or "").lower()
                if status_str in ["draft", "cancelled"]:
                    continue

                tot = float(s.get("total_amount") or 0.0)
                paid = float(s.get("amount_paid") if s.get("amount_paid") is not None else (tot if status_str == "paid" else 0.0))
                due = float(s.get("balance_due") if s.get("balance_due") is not None else max(0.0, tot - paid))
                doc_type = (s.get("document_type") or "invoice").lower()

                if doc_type == "credit_note":
                    running_bal -= tot
                elif doc_type == "debit_note":
                    running_bal += tot
                elif doc_type == "receipt":
                    running_bal -= (tot or paid)
                else:
                    running_bal += due

            # If party also has purchase transactions
            if resolved_party_id and party_record and party_record.get("type") in ["vendor", "both"]:
                purchases_res = (
                    supabase_client.table("purchases")
                    .select("total_amount, amount_paid, balance_due, status")
                    .eq("party_id", str(resolved_party_id))
                    .eq("user_id", store_id)
                    .execute()
                )
                purchases = getattr(purchases_res, "data", []) or []
                for p in purchases:
                    p_status = (p.get("status") or "").lower()
                    if p_status in ["draft", "cancelled"]:
                        continue
                    tot = float(p.get("total_amount") or 0.0)
                    paid = float(p.get("amount_paid") if p.get("amount_paid") is not None else (tot if p_status == "paid" else 0.0))
                    due = float(p.get("balance_due") if p.get("balance_due") is not None else max(0.0, tot - paid))
                    running_bal -= due

            return round(running_bal, 2)
        except Exception as exc:
            logger.warning("Error calculating party pending balance: %s", exc)
            return None

    @classmethod
    def get_party(cls, store_id: str, party_id: str) -> Dict[str, Any]:
        party = PartyRepository.get_party_by_id(store_id=store_id, party_id=party_id)
        if not party:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Party not found or unauthorized",
            )
        party["current_balance"] = cls.calculate_party_pending_balance(store_id=store_id, party_id=party_id)
        party["party_pending_balance"] = party["current_balance"]
        return party

    @classmethod
    def create_party(cls, store_id: str, request: PartyCreateRequest) -> Dict[str, Any]:
        payload = request.model_dump()
        return PartyRepository.create_party(store_id=store_id, payload=payload)

    @classmethod
    def update_party(cls, store_id: str, party_id: str, request: PartyUpdateRequest) -> Dict[str, Any]:
        payload = {k: v for k, v in request.model_dump().items() if v is not None}
        return PartyRepository.update_party(store_id=store_id, party_id=party_id, payload=payload)

