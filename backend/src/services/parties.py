import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from src.core.supabase import supabase_client
from src.repositories.party_repository import PartyRepository
from src.schemas.parties import PartyCreateRequest, PartyUpdateRequest

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
                    pname = (s.get("customer_name") or "").lower().trim() if isinstance(s.get("customer_name"), str) else ""
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
                    pname = (p.get("vendor_name") or "").lower().trim() if isinstance(p.get("vendor_name"), str) else ""
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
                    pname = (party.get("name") or "").lower().trim()
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
    def get_party(cls, store_id: str, party_id: str) -> Dict[str, Any]:
        party = PartyRepository.get_party_by_id(store_id=store_id, party_id=party_id)
        if not party:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Party not found or unauthorized",
            )
        return party

    @classmethod
    def create_party(cls, store_id: str, request: PartyCreateRequest) -> Dict[str, Any]:
        payload = request.model_dump()
        return PartyRepository.create_party(store_id=store_id, payload=payload)

    @classmethod
    def update_party(cls, store_id: str, party_id: str, request: PartyUpdateRequest) -> Dict[str, Any]:
        payload = {k: v for k, v in request.model_dump().items() if v is not None}
        return PartyRepository.update_party(store_id=store_id, party_id=party_id, payload=payload)
