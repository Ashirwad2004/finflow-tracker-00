import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import { Party } from "../../types";

export function buildPartyPurchasePdfData(
  purchase: any,
  activeParty: Party | null,
  profile: any
) {
  const curDue = Number(
    purchase.balance_due != null
      ? purchase.balance_due
      : Math.max(0, Number(purchase.total_amount || 0) - Number(purchase.amount_paid || 0))
  );

  return {
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
  };
}

export function downloadPartyPurchasePdf(
  purchase: any,
  activeParty: Party | null,
  profile: any
) {
  const data = buildPartyPurchasePdfData(purchase, activeParty, profile);
  generateInvoicePDF(data, {
    action: "download",
    documentTitle: "PURCHASE BILL",
  });
}

export async function previewPartyPurchasePdf(
  purchase: any,
  activeParty: Party | null,
  profile: any
) {
  const data = buildPartyPurchasePdfData(purchase, activeParty, profile);
  const url = await generateInvoicePDF(data, {
    action: "preview",
    documentTitle: "PURCHASE BILL",
  });

  if (url) {
    window.open(String(url), "_blank");
  }
}
