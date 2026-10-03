import { useEffect } from "react";
import { UseFormReset } from "react-hook-form";
import { SalesSettings } from "@/core/hooks/use-sales-settings";
import { InvoiceFormValues } from "../../hooks";

export function getInitialInvoiceFormValues(
  invoiceToEdit: any,
  initialParty: any,
  salesSettings?: SalesSettings
): InvoiceFormValues {
  if (invoiceToEdit) {
    const items = (invoiceToEdit.items || []).map((it: any) => ({
      ...it,
      tax_rate:
        it.tax_rate !== undefined
          ? Number(it.tax_rate)
          : invoiceToEdit.tax_rate ?? salesSettings?.defaultTaxRate ?? 0,
    }));

    return {
      customer_name: invoiceToEdit.customer_name,
      customer_phone: invoiceToEdit.customer_phone,
      customer_email: invoiceToEdit.customer_email,
      customer_gstin: invoiceToEdit.customer_gstin || "",
      place_of_supply: invoiceToEdit.place_of_supply || "",
      is_reverse_charge: invoiceToEdit.is_reverse_charge || false,
      document_type: invoiceToEdit.document_type || "invoice",
      original_invoice_id: invoiceToEdit.original_invoice_id || "",
      invoice_number: invoiceToEdit.invoice_number,
      date: invoiceToEdit.date,
      items,
      tax_rate: (invoiceToEdit.tax_amount / (invoiceToEdit.subtotal || 1)) * 100,
      overall_discount: invoiceToEdit.overall_discount || 0,
      status: invoiceToEdit.status || "paid",
      amount_paid: Number(invoiceToEdit.amount_paid) || 0,
      irn: invoiceToEdit.irn || "",
      eway_bill_number: invoiceToEdit.eway_bill_number || "",
      qr_code: invoiceToEdit.qr_code || "",
      due_date: invoiceToEdit.due_date || "",
      notes: invoiceToEdit.notes || "",
      quick_item_name: "General Sale",
      quick_total_amount: 0,
    };
  }

  return {
    customer_name: initialParty?.name || "",
    customer_phone: initialParty?.phone || "",
    customer_email: initialParty?.email || "",
    customer_gstin: initialParty?.gst_number || "",
    place_of_supply: initialParty?.gst_number ? initialParty.gst_number.trim().substring(0, 2) : "",
    billing_address: initialParty?.address || "",
    shipping_address: initialParty?.address || "",
    is_reverse_charge: false,
    document_type: "invoice",
    original_invoice_id: "",
    invoice_number: "",
    date: new Date().toISOString().split("T")[0],
    items: [
      {
        description: "",
        quantity: 1,
        price: 0,
        discount: 0,
        tax_rate: salesSettings?.defaultTaxRate ?? 0,
        total: 0,
        hsn_code: "",
        unit: "",
      },
    ],
    tax_rate: salesSettings?.defaultTaxRate ?? 0,
    overall_discount: 0,
    status: salesSettings?.defaultStatus ?? "paid",
    amount_paid: 0,
    irn: "",
    eway_bill_number: "",
    qr_code: "",
    due_date: salesSettings?.defaultPaymentTermsDays
      ? new Date(
          new Date().getTime() + salesSettings.defaultPaymentTermsDays * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split("T")[0]
      : "",
    notes: salesSettings?.defaultTermsAndConditions || "",
    quick_item_name: "General Sale",
    quick_total_amount: 0,
  };
}

export function useInvoiceFormInit(
  open: boolean,
  invoiceToEdit: any,
  initialParty: any,
  salesSettings: SalesSettings | undefined,
  reset: UseFormReset<InvoiceFormValues>
) {
  useEffect(() => {
    if (open) {
      const initialValues = getInitialInvoiceFormValues(invoiceToEdit, initialParty, salesSettings);
      reset(initialValues);
    }
  }, [open, invoiceToEdit, initialParty, reset, salesSettings]);
}
