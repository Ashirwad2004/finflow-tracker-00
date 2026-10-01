from typing import Optional
from pydantic import BaseModel, ConfigDict


class SalesSettingsUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    show_party_pending_balance: Optional[bool] = None
    show_party_previous_balance: Optional[bool] = None
    defaultTaxRate: Optional[float] = None
    defaultStatus: Optional[str] = None
    invoiceNumberPrefix: Optional[str] = None
    defaultPaymentTermsDays: Optional[int] = None
    preventBackdating: Optional[bool] = None
    backdatingLimitDays: Optional[int] = None
    roundOffTotal: Optional[bool] = None
    gstMode: Optional[str] = None
    warnOnOutstandingBalance: Optional[bool] = None
    confirmBeforeDelete: Optional[bool] = None
    enableHsnCode: Optional[bool] = None
    defaultTermsAndConditions: Optional[str] = None
    enableQuickBilling: Optional[bool] = None
    enableItemWiseTax: Optional[bool] = None
    showItemTaxRateOnBill: Optional[bool] = None
    autoSendWhatsAppOnInvoice: Optional[bool] = None
