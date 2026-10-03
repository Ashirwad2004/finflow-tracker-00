import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import { Party } from "../../types";

export function buildPartyInvoicePdfData(
  invoice: any,
  activeParty: Party | null,
  parties: Party[],
  partyLedgerMap: Map<string, any>,
  profile: any
) {
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

  return {
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
  };
}

export function downloadPartyInvoicePdf(
  invoice: any,
  activeParty: Party | null,
  parties: Party[],
  partyLedgerMap: Map<string, any>,
  profile: any
) {
  const data = buildPartyInvoicePdfData(invoice, activeParty, parties, partyLedgerMap, profile);
  generateInvoicePDF(data, {
    action: "download",
    showPartyPendingBalance: true,
    showPartyPreviousBalance: true,
  });
}

export async function previewPartyInvoicePdf(
  invoice: any,
  activeParty: Party | null,
  parties: Party[],
  partyLedgerMap: Map<string, any>,
  profile: any
) {
  const data = buildPartyInvoicePdfData(invoice, activeParty, parties, partyLedgerMap, profile);
  const url = await generateInvoicePDF(data, {
    action: "preview",
    showPartyPendingBalance: true,
    showPartyPreviousBalance: true,
  });

  if (url) {
    window.open(String(url), "_blank");
  }
}
