import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import {
  exportPartiesToExcel,
  exportPartiesToPDF,
  exportPartyStatementToExcel,
  exportPartyStatementToPDF,
} from "@/utils/exportParties";
import { Party } from "../types";

interface UsePartyExportsProps {
  activeParty: Party | null;
  parties: Party[];
  filteredParties: Party[];
  partyLedgerMap: Map<string, any>;
  profile: any;
  filterType: string;
  toast: any;
}

export function usePartyExports({
  activeParty,
  parties,
  filteredParties,
  partyLedgerMap,
  profile,
  filterType,
  toast,
}: UsePartyExportsProps) {
  const handleDownloadInvoicePDF = (invoice: any) => {
    const party =
      activeParty ||
      parties.find(
        (p: any) =>
          (invoice.party_id && p.id === invoice.party_id) ||
          (p.name && p.name.trim().toLowerCase() === (invoice.customer_name || "").trim().toLowerCase())
      );
    const ledger = party ? partyLedgerMap.get(party.id) : null;
    const curDue = Number(
      invoice.balance_due != null
        ? invoice.balance_due
        : Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0))
    );
    const partyTotalDue = ledger
      ? ledger.receivable - ledger.payable
      : Number(party?.opening_balance || 0) + curDue;
    const prevBal = partyTotalDue - curDue;

    generateInvoicePDF(
      {
        invoice_number: invoice.invoice_number,
        date: invoice.date || invoice.created_at,
        due_date: invoice.due_date,
        status: invoice.status,
        amount_paid: Number(
          invoice.amount_paid ?? (invoice.status === "paid" ? invoice.total_amount : 0)
        ),
        balance_due: curDue,
        payment_method: invoice.payment_method,
        previous_balance: prevBal,
        total_due_balance: partyTotalDue,
        party_pending_balance: partyTotalDue,
        customer_name: invoice.customer_name,
        customer_phone: invoice.customer_phone,
        customer_email: invoice.customer_email,
        customer_gstin: invoice.customer_gstin,
        items: (invoice.items || []).map((item: any) => ({
          description: item.description || item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total ?? item.amount ?? item.quantity * item.price,
          hsn_code: item.hsn_code,
          unit: item.unit,
        })),
        subtotal: invoice.subtotal ?? invoice.total_amount,
        discount_amount: invoice.discount_amount ?? 0,
        tax_amount: invoice.tax_amount ?? 0,
        total_amount: invoice.total_amount,
        tax_rate: invoice.tax_rate ?? 0,
        irn: invoice.irn,
        eway_bill_number: invoice.eway_bill_number,
        qr_code: invoice.qr_code,
        business_details: profile
          ? {
              name: (profile as any).business_name,
              address: (profile as any).business_address,
              phone: (profile as any).business_phone,
              gst: (profile as any).gst_number,
              logo_url: (profile as any).business_logo,
              signature_url: (profile as any).signature_url,
            }
          : undefined,
      },
      { action: "download", showPartyPendingBalance: true, showPartyPreviousBalance: true }
    );
  };

  const handlePreviewInvoicePDF = async (invoice: any) => {
    const party =
      activeParty ||
      parties.find(
        (p: any) =>
          (invoice.party_id && p.id === invoice.party_id) ||
          (p.name && p.name.trim().toLowerCase() === (invoice.customer_name || "").trim().toLowerCase())
      );
    const ledger = party ? partyLedgerMap.get(party.id) : null;
    const curDue = Number(
      invoice.balance_due != null
        ? invoice.balance_due
        : Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0))
    );
    const partyTotalDue = ledger
      ? ledger.receivable - ledger.payable
      : Number(party?.opening_balance || 0) + curDue;
    const prevBal = partyTotalDue - curDue;

    const url = await generateInvoicePDF(
      {
        invoice_number: invoice.invoice_number,
        date: invoice.date || invoice.created_at,
        due_date: invoice.due_date,
        status: invoice.status,
        amount_paid: Number(
          invoice.amount_paid ?? (invoice.status === "paid" ? invoice.total_amount : 0)
        ),
        balance_due: curDue,
        payment_method: invoice.payment_method,
        previous_balance: prevBal,
        total_due_balance: partyTotalDue,
        party_pending_balance: partyTotalDue,
        customer_name: invoice.customer_name,
        customer_phone: invoice.customer_phone,
        customer_email: invoice.customer_email,
        customer_gstin: invoice.customer_gstin,
        items: (invoice.items || []).map((item: any) => ({
          description: item.description || item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total ?? item.amount ?? item.quantity * item.price,
          hsn_code: item.hsn_code,
          unit: item.unit,
        })),
        subtotal: invoice.subtotal ?? invoice.total_amount,
        discount_amount: invoice.discount_amount ?? 0,
        tax_amount: invoice.tax_amount ?? 0,
        total_amount: invoice.total_amount,
        tax_rate: invoice.tax_rate ?? 0,
        irn: invoice.irn,
        eway_bill_number: invoice.eway_bill_number,
        qr_code: invoice.qr_code,
        business_details: profile
          ? {
              name: (profile as any).business_name,
              address: (profile as any).business_address,
              phone: (profile as any).business_phone,
              gst: (profile as any).gst_number,
              logo_url: (profile as any).business_logo,
              signature_url: (profile as any).signature_url,
            }
          : undefined,
      },
      { action: "preview", showPartyPendingBalance: true, showPartyPreviousBalance: true }
    );

    if (url) {
      window.open(String(url), "_blank");
    }
  };

  const handleDownloadPurchasePDF = (purchase: any) => {
    const curDue = Number(
      purchase.balance_due != null
        ? purchase.balance_due
        : Math.max(0, Number(purchase.total_amount || 0) - Number(purchase.amount_paid || 0))
    );
    generateInvoicePDF(
      {
        invoice_number: purchase.bill_number || `BILL-${purchase.id.substring(0, 6).toUpperCase()}`,
        date: purchase.date || purchase.created_at,
        due_date: purchase.due_date,
        status: purchase.status,
        amount_paid: Number(
          purchase.amount_paid ?? (purchase.status === "paid" ? purchase.total_amount : 0)
        ),
        balance_due: curDue,
        payment_method: "cash",
        customer_name: purchase.vendor_name || activeParty?.name || "Vendor",
        customer_phone: purchase.vendor_phone || activeParty?.phone,
        customer_email: purchase.vendor_email || activeParty?.email,
        customer_gstin: purchase.vendor_gstin || activeParty?.gst_number,
        items: (purchase.items || []).map((item: any) => ({
          description: item.description || item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total ?? item.amount ?? item.quantity * item.price,
          hsn_code: item.hsn_code,
          unit: item.unit,
        })),
        subtotal: purchase.subtotal ?? purchase.total_amount,
        discount_amount: purchase.discount_amount ?? 0,
        tax_amount: purchase.tax_amount ?? 0,
        total_amount: purchase.total_amount,
        tax_rate: purchase.tax_rate ?? 0,
        business_details: profile
          ? {
              name: (profile as any).business_name,
              address: (profile as any).business_address,
              phone: (profile as any).business_phone,
              gst: (profile as any).gst_number,
              logo_url: (profile as any).business_logo,
              signature_url: (profile as any).signature_url,
            }
          : undefined,
      },
      { action: "download", documentTitle: "PURCHASE BILL" }
    );
  };

  const handlePreviewPurchasePDF = async (purchase: any) => {
    const curDue = Number(
      purchase.balance_due != null
        ? purchase.balance_due
        : Math.max(0, Number(purchase.total_amount || 0) - Number(purchase.amount_paid || 0))
    );
    const url = await generateInvoicePDF(
      {
        invoice_number: purchase.bill_number || `BILL-${purchase.id.substring(0, 6).toUpperCase()}`,
        date: purchase.date || purchase.created_at,
        due_date: purchase.due_date,
        status: purchase.status,
        amount_paid: Number(
          purchase.amount_paid ?? (purchase.status === "paid" ? purchase.total_amount : 0)
        ),
        balance_due: curDue,
        payment_method: "cash",
        customer_name: purchase.vendor_name || activeParty?.name || "Vendor",
        customer_phone: purchase.vendor_phone || activeParty?.phone,
        customer_email: purchase.vendor_email || activeParty?.email,
        customer_gstin: purchase.vendor_gstin || activeParty?.gst_number,
        items: (purchase.items || []).map((item: any) => ({
          description: item.description || item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total ?? item.amount ?? item.quantity * item.price,
          hsn_code: item.hsn_code,
          unit: item.unit,
        })),
        subtotal: purchase.subtotal ?? purchase.total_amount,
        discount_amount: purchase.discount_amount ?? 0,
        tax_amount: purchase.tax_amount ?? 0,
        total_amount: purchase.total_amount,
        tax_rate: purchase.tax_rate ?? 0,
        business_details: profile
          ? {
              name: (profile as any).business_name,
              address: (profile as any).business_address,
              phone: (profile as any).business_phone,
              gst: (profile as any).gst_number,
              logo_url: (profile as any).business_logo,
              signature_url: (profile as any).signature_url,
            }
          : undefined,
      },
      { action: "preview", documentTitle: "PURCHASE BILL" }
    );

    if (url) {
      window.open(String(url), "_blank");
    }
  };

  const handleExportPartiesExcel = () => {
    try {
      const listToExport = filteredParties.length > 0 ? filteredParties : parties;
      if (listToExport.length === 0) {
        toast({
          title: "No Parties",
          description: "There are no parties available to export.",
          variant: "destructive",
        });
        return;
      }
      exportPartiesToExcel(
        listToExport,
        partyLedgerMap,
        profile
          ? {
              name: (profile as any).business_name || (profile as any).display_name,
              address: (profile as any).business_address,
              phone: (profile as any).business_phone || (profile as any).phone,
              gst: (profile as any).gst_number,
            }
          : undefined,
        filterType !== "All Types" ? filterType : undefined
      );
      toast({
        title: "Excel Export Complete",
        description: `Exported ${listToExport.length} parties to Excel.`,
      });
    } catch (err: any) {
      console.error("Failed to export parties to Excel:", err);
      toast({
        title: "Export Failed",
        description: err.message || "Failed to export Excel file.",
        variant: "destructive",
      });
    }
  };

  const handleExportPartiesPDF = () => {
    try {
      const listToExport = filteredParties.length > 0 ? filteredParties : parties;
      if (listToExport.length === 0) {
        toast({
          title: "No Parties",
          description: "There are no parties available to export.",
          variant: "destructive",
        });
        return;
      }
      exportPartiesToPDF(
        listToExport,
        partyLedgerMap,
        profile
          ? {
              name: (profile as any).business_name || (profile as any).display_name,
              address: (profile as any).business_address,
              phone: (profile as any).business_phone || (profile as any).phone,
              gst: (profile as any).gst_number,
            }
          : undefined,
        filterType !== "All Types" ? filterType : undefined
      );
      toast({
        title: "PDF Export Complete",
        description: `Exported ${listToExport.length} parties to PDF.`,
      });
    } catch (err: any) {
      console.error("Failed to export parties to PDF:", err);
      toast({
        title: "Export Failed",
        description: err.message || "Failed to export PDF file.",
        variant: "destructive",
      });
    }
  };

  const handleExportSinglePartyExcel = (party: Party) => {
    try {
      const metrics = partyLedgerMap.get(party.id);
      if (!metrics) {
        toast({
          title: "No Data",
          description: "Party transaction metrics not found.",
          variant: "destructive",
        });
        return;
      }
      exportPartyStatementToExcel(
        party,
        metrics,
        profile
          ? {
              name: (profile as any).business_name || (profile as any).display_name,
              address: (profile as any).business_address,
              phone: (profile as any).business_phone || (profile as any).phone,
              gst: (profile as any).gst_number,
            }
          : undefined
      );
      toast({
        title: "Statement Exported",
        description: `Exported ${party.name}'s statement to Excel.`,
      });
    } catch (err: any) {
      console.error("Failed to export party statement to Excel:", err);
      toast({
        title: "Export Failed",
        description: err.message || "Failed to export statement.",
        variant: "destructive",
      });
    }
  };

  const handleExportSinglePartyPDF = (party: Party) => {
    try {
      const metrics = partyLedgerMap.get(party.id);
      if (!metrics) {
        toast({
          title: "No Data",
          description: "Party transaction metrics not found.",
          variant: "destructive",
        });
        return;
      }
      exportPartyStatementToPDF(
        party,
        metrics,
        profile
          ? {
              name: (profile as any).business_name || (profile as any).display_name,
              address: (profile as any).business_address,
              phone: (profile as any).business_phone || (profile as any).phone,
              gst: (profile as any).gst_number,
            }
          : undefined
      );
      toast({
        title: "Statement Exported",
        description: `Exported ${party.name}'s statement to PDF.`,
      });
    } catch (err: any) {
      console.error("Failed to export party statement to PDF:", err);
      toast({
        title: "Export Failed",
        description: err.message || "Failed to export statement.",
        variant: "destructive",
      });
    }
  };

  return {
    handleDownloadInvoicePDF,
    handlePreviewInvoicePDF,
    handleDownloadPurchasePDF,
    handlePreviewPurchasePDF,
    handleExportPartiesExcel,
    handleExportPartiesPDF,
    handleExportSinglePartyExcel,
    handleExportSinglePartyPDF,
  };
}
