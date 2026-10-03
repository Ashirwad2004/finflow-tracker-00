import pytest
from unittest.mock import MagicMock, patch
from src.services.parties import PartyService
from src.services.settings import SettingsService


def test_calculate_party_pending_balance_no_customer():
    # Anonymous or missing customer should return None
    assert PartyService.calculate_party_pending_balance(store_id="store-1") is None
    assert PartyService.calculate_party_pending_balance(store_id="store-1", customer_name="") is None
    assert PartyService.calculate_party_pending_balance(store_id="store-1", customer_name="Cash Customer") is None


def test_calculate_party_pending_balance_with_ledger():
    mock_supabase = MagicMock()
    
    # Mock party record
    party_data = {
        "id": "party-123",
        "name": "ABC Traders",
        "opening_balance": 10000.0,
        "opening_balance_type": "to_receive",
        "type": "customer",
    }
    
    # Mock sales:
    # 1. Invoice 1: 5000 total, 2500 paid -> 2500 due
    # 2. Cancelled invoice: 2000 total, 0 paid -> Should be excluded
    sales_data = [
        {
            "id": "inv-1",
            "total_amount": 5000.0,
            "amount_paid": 2500.0,
            "balance_due": 2500.0,
            "status": "partial",
            "document_type": "invoice",
            "party_id": "party-123",
            "customer_name": "ABC Traders",
        },
        {
            "id": "inv-2",
            "total_amount": 2000.0,
            "amount_paid": 0.0,
            "balance_due": 2000.0,
            "status": "cancelled",
            "document_type": "invoice",
            "party_id": "party-123",
            "customer_name": "ABC Traders",
        },
    ]

    with patch("src.services.parties.supabase_client", mock_supabase):
        # Configure table queries
        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "parties":
                mock_select = MagicMock()
                mock_table.select.return_value = mock_select
                mock_select.eq.return_value = mock_select
                mock_select.maybe_single.return_value.execute.return_value.data = party_data
                mock_select.ilike.return_value.limit.return_value.execute.return_value.data = [party_data]
            elif table_name == "sales":
                mock_select = MagicMock()
                mock_table.select.return_value = mock_select
                mock_select.eq.return_value = mock_select
                mock_select.execute.return_value.data = sales_data
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        balance = PartyService.calculate_party_pending_balance(
            store_id="store-1",
            party_id="party-123",
            customer_name="ABC Traders",
        )
        # Expected: 10000 opening + 2500 due from inv-1 = 12500.0 (cancelled inv-2 ignored)
        assert balance == 12500.0


def test_settings_service_get_and_update():
    mock_supabase = MagicMock()
    mock_res = MagicMock()
    mock_res.data = {"show_party_pending_balance": False, "sales_settings": {"show_party_pending_balance": False}}

    with patch("src.services.settings.supabase_client", mock_supabase):
        mock_table = MagicMock()
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = mock_res
        mock_table.update.return_value.eq.return_value.execute.return_value.data = [{"user_id": "store-1"}]

        # Test get
        settings = SettingsService.get_sales_settings("store-1")
        assert settings["show_party_pending_balance"] is False

        # Test update
        updated = SettingsService.update_sales_settings("store-1", {"show_party_pending_balance": True})
        # After update calls get_sales_settings
        assert "show_party_pending_balance" in updated
