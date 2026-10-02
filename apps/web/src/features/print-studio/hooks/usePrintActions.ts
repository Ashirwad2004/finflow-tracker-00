import { toast } from "sonner";
import {
  generateInvoicePDF,
  InvoiceDetails,
  InvoicePdfTheme,
  PageSize,
  BankDetailsInfo,
  UniversalDocumentType,
  resolveDocumentDescriptor,
} from "@/utils/generateInvoicePDF";
import { printThermalReceipt } from "@/utils/printThermalReceipt";
import { printInvoiceDirectly } from "@/utils/directPrint";
import { InvoiceTheme, themeMeta } from "../types";

interface UsePrintActionsOptions {
  selectedTheme: InvoiceTheme;
  selectedDocType: UniversalDocumentType;
  pageSize: PageSize;
  customTerms: string;
  fontSizeFactor: number;
  printBankDetails: boolean;
  activeBankAccount: BankDetailsInfo | null;
  selectedBankId: string;
  printUpiQr: boolean;
  upiIdInput: string;
  profile: any;
  showItemTaxRate: boolean;
  showPartyPreviousBalance: boolean;
  getPartyBalanceForSale: (sale: any) => { previous_balance: number; party_pending_balance: number };
}

export function usePrintActions(options: UsePrintActionsOptions) {
  const {
    selectedTheme,
    selectedDocType,
    pageSize,
    customTerms,
    fontSizeFactor,
    printBankDetails,
    activeBankAccount,
    selectedBankId,
    printUpiQr,
    upiIdInput,
    profile,
    showItemTaxRate,
    showPartyPreviousBalance,
    getPartyBalanceForSale,
  } = options;

  const buildInvoiceDetails = (sale: any, defaultPrefix = "INV"): InvoiceDetails => {
    const { previous_balance, party_pending_balance } = getPartyBalanceForSale(sale);
    return {
      invoice_number: sale.invoice_number || `${defaultPrefix}-${(sale.id || "000000").slice(0, 6).toUpperCase()}`,
      date: sale.date || sale.created_at,
      due_date: sale.due_date,
      status: sale.status,
      amount_paid: sale.amount_paid,
      balance_due: sale.balance_due,
      payment_method: sale.payment_method,
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone,
      customer_email: sale.customer_email,
      customer_address: sale.customer_address || sale.billing_address,
      place_of_supply: sale.place_of_supply,
      items: sale.items || [],
      subtotal: sale.subtotal || sale.total_amount,
      discount_amount: sale.discount_amount || 0,
      tax_rate: sale.tax_rate || 0,
      tax_amount: sale.tax_amount || 0,
      total_amount: sale.total_amount,
      previous_balance,
      total_due_balance: party_pending_balance,
      party_pending_balance,
      business_details: profile
        ? {
            name: profile.business_name || profile.display_name || "My Business",
            address: profile.business_address || undefined,
            phone: profile.business_phone || profile.phone || undefined,
            email: profile.email || undefined,
            state: profile.state || undefined,
            gst: profile.gst_number || undefined,
            logo_url: profile.business_logo || undefined,
            signature_url: profile.signature_url || undefined,
            bank_name: activeBankAccount?.bankName,
            bank_account_no: activeBankAccount?.accountNumber,
            bank_ifsc: activeBankAccount?.ifscCode,
            bank_branch: activeBankAccount?.branchName,
            upi_id: printUpiQr ? upiIdInput || profile?.upi_id || undefined : undefined,
          }
        : undefined,
    };
  };

  const handlePrintSale = async (sale: any) => {
    const invoiceDetails = buildInvoiceDetails(sale, "INV");

    if (selectedTheme === "thermal") {
      toast.loading(`Printing thermal POS receipt ${invoiceDetails.invoice_number}...`, { id: "ps-print" });
      await printThermalReceipt(invoiceDetails);
      toast.success("Thermal receipt dispatched to printer!", { id: "ps-print" });
    } else {
      toast.loading(`Sending ${themeMeta[selectedTheme].name} invoice to printer...`, { id: "ps-print" });
      await printInvoiceDirectly(invoiceDetails, {
        action: "print",
        theme: selectedTheme as InvoicePdfTheme,
        documentType: selectedDocType,
        pageSize,
        customTerms,
        fontSizeFactor,
        printBankDetails,
        bankDetails: activeBankAccount || undefined,
        selectedBankAccountId: selectedBankId,
        printUpiQr,
        upiId: upiIdInput || profile?.upi_id,
        showItemTaxRateOnBill: showItemTaxRate,
        showPartyPreviousBalance,
        showPartyPendingBalance: showPartyPreviousBalance,
        profile,
      });
      toast.success("Print job sent to printer machine!", { id: "ps-print" });
    }
  };

  const handleDownloadSale = async (sale: any) => {
    const invoiceDetails = buildInvoiceDetails(sale, "DOC");

    toast.loading(`Downloading PDF...`, { id: "ps-download" });
    await generateInvoicePDF(invoiceDetails, {
      action: "download",
      theme: selectedTheme === "thermal" ? "startup-gradient" : (selectedTheme as InvoicePdfTheme),
      documentType: selectedDocType,
      pageSize,
      customTerms,
      fontSizeFactor,
      printBankDetails,
      bankDetails: activeBankAccount || undefined,
      selectedBankAccountId: selectedBankId,
      printUpiQr,
      upiId: upiIdInput || profile?.upi_id,
      showItemTaxRateOnBill: showItemTaxRate,
      showPartyPreviousBalance,
      showPartyPendingBalance: showPartyPreviousBalance,
      profile,
    });
    toast.success("Invoice downloaded!", { id: "ps-download" });
  };

  const handlePreviewSale = async (sale: any) => {
    const desc = resolveDocumentDescriptor(selectedDocType, undefined, sale?.invoice_number);
    toast.success(`Printing ${desc.title} layout...`);
    const invoiceDetails = buildInvoiceDetails(sale, "DOC");

    await generateInvoicePDF(invoiceDetails, {
      action: "preview",
      theme: (selectedTheme === "thermal" ? "startup-gradient" : selectedTheme) as InvoicePdfTheme,
      documentType: selectedDocType,
      pageSize,
      customTerms,
      fontSizeFactor,
      printBankDetails,
      bankDetails: activeBankAccount || undefined,
      selectedBankAccountId: selectedBankId,
      printUpiQr,
      upiId: upiIdInput || profile?.upi_id,
      showItemTaxRateOnBill: showItemTaxRate,
      showPartyPreviousBalance,
      showPartyPendingBalance: showPartyPreviousBalance,
      profile,
    });
  };

  return {
    handlePrintSale,
    handleDownloadSale,
    handlePreviewSale,
  };
}
