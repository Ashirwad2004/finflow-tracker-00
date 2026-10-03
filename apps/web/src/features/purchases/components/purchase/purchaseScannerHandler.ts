import { UseFormSetValue } from "react-hook-form";
import { ExtractedPurchaseBill } from "./PurchaseBillScanner";
import { PurchaseFormValues } from "../../hooks";

export interface ApplyScannerParams {
  data: ExtractedPurchaseBill;
  vendorParties: any[];
  getDefaultDueDate: (date: string) => string;
  setValue: UseFormSetValue<PurchaseFormValues>;
  replace: (items: any[]) => void;
  createPurchaseMutation: any;
  toast: any;
  setScannedNotification: (notification: any) => void;
  autoSaveImmediately?: boolean;
}

export function applyScannerExtraction({
  data,
  vendorParties,
  getDefaultDueDate,
  setValue,
  replace,
  createPurchaseMutation,
  toast,
  setScannedNotification,
  autoSaveImmediately,
}: ApplyScannerParams): void {
  if (data.vendor_name) {
    setValue("vendor_name", data.vendor_name, { shouldValidate: true, shouldDirty: true });
    const matched = vendorParties.find(
      (p: any) =>
        p.name?.toLowerCase() === data.vendor_name?.trim().toLowerCase() ||
        (data.vendor_gstin && p.gst_number && p.gst_number.toLowerCase() === data.vendor_gstin.toLowerCase())
    );
    if (matched) {
      if (matched.gst_number) setValue("vendor_gstin", matched.gst_number);
      if (matched.phone) setValue("vendor_phone", matched.phone);
    } else {
      if (data.vendor_gstin) setValue("vendor_gstin", data.vendor_gstin);
      if (data.vendor_phone) setValue("vendor_phone", data.vendor_phone);
    }
  }
  if (data.place_of_supply) {
    setValue("place_of_supply", data.place_of_supply, { shouldValidate: true, shouldDirty: true });
  }
  if (data.bill_number) {
    setValue("bill_number", data.bill_number, { shouldValidate: true, shouldDirty: true });
  }
  if (data.date) {
    setValue("date", data.date, { shouldValidate: true, shouldDirty: true });
    setValue("due_date", data.due_date || getDefaultDueDate(data.date), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }
  if (data.discount_amount !== undefined) {
    setValue("discount_amount", data.discount_amount, { shouldValidate: true, shouldDirty: true });
  }
  if (data.tax_rate !== undefined) {
    setValue("tax_rate", data.tax_rate, { shouldValidate: true, shouldDirty: true });
  }
  if (data.notes) {
    setValue("notes", data.notes, { shouldValidate: true, shouldDirty: true });
  }
  if (data.file_name) {
    setValue("attachment_url", data.file_name, { shouldValidate: true, shouldDirty: true });
  }
  if (data.items && data.items.length > 0) {
    replace(data.items);
    setValue("items", data.items, { shouldValidate: true, shouldDirty: true });
    setScannedNotification({
      vendor: data.vendor_name,
      itemCount: data.items.length,
      fileName: data.file_name,
      isPdf: data.is_pdf,
    });
  }

  const calcSubtotal = (data.items || []).reduce(
    (s, it) => s + Number(it.quantity || 1) * Number(it.price || 0),
    0
  );
  const calcDisc = (data.items || []).reduce(
    (s, it) => s + (Number(it.quantity || 1) * Number(it.price || 0) * Number(it.discount || 0)) / 100,
    0
  );
  const calcTax = (data.items || []).reduce((s, it) => {
    const line = Number(it.quantity || 1) * Number(it.price || 0);
    const lineDisc = (line * Number(it.discount || 0)) / 100;
    return s + ((line - lineDisc) * Number(it.tax_rate ?? data.tax_rate ?? 0)) / 100;
  }, 0);
  const finalCalculatedTotal =
    data.total_amount || Math.max(0, calcSubtotal - calcDisc - Number(data.discount_amount || 0) + calcTax);

  const status = data.payment_status || "paid";
  setValue("payment_status", status, { shouldValidate: true, shouldDirty: true });
  if (status === "paid") {
    setValue("amount_paid", finalCalculatedTotal, { shouldValidate: true, shouldDirty: true });
  } else if (status === "partial") {
    setValue("amount_paid", data.amount_paid || 0, { shouldValidate: true, shouldDirty: true });
  } else {
    setValue("amount_paid", 0, { shouldValidate: true, shouldDirty: true });
  }

  if (autoSaveImmediately) {
    const submissionPayload: PurchaseFormValues = {
      vendor_name: data.vendor_name || "Supplier",
      vendor_phone: data.vendor_phone || "",
      vendor_gstin: data.vendor_gstin || "",
      place_of_supply:
        data.place_of_supply || (data.vendor_gstin ? data.vendor_gstin.substring(0, 2) : ""),
      bill_number: data.bill_number || `BILL-${Date.now().toString().slice(-6)}`,
      date: data.date || new Date().toISOString().split("T")[0],
      due_date: data.due_date || getDefaultDueDate(data.date),
      payment_status: status,
      amount_paid: status === "paid" ? finalCalculatedTotal : data.amount_paid || 0,
      discount_amount: data.discount_amount || 0,
      tax_rate: data.tax_rate || 0,
      notes: data.notes || "",
      attachment_url: data.file_name || "",
      items: data.items,
    };
    createPurchaseMutation.mutate(submissionPayload);
  } else {
    toast({
      title: "Items loaded into table! ⚡",
      description: `${(data.items || []).length} products populated with rates. You can edit any field below.`,
    });
  }
}

export interface ApplySmartParseParams {
  data: {
    vendorName?: string;
    billNumber?: string;
    date?: string;
    items?: Array<{ description: string; quantity: number; price: number }>;
  };
  vendorParties: any[];
  getDefaultDueDate: (date: string) => string;
  watchDefaultTaxRate: number;
  setValue: UseFormSetValue<PurchaseFormValues>;
  replace: (items: any[]) => void;
  toast: any;
  setIsAiFillOpen: (open: boolean) => void;
}

export function applySmartParse({
  data,
  vendorParties,
  getDefaultDueDate,
  watchDefaultTaxRate,
  setValue,
  replace,
  toast,
  setIsAiFillOpen,
}: ApplySmartParseParams): void {
  if (data.vendorName) {
    setValue("vendor_name", data.vendorName, { shouldValidate: true, shouldDirty: true });
    const matched = vendorParties.find(
      (p: any) => p.name?.toLowerCase() === data.vendorName?.trim().toLowerCase()
    );
    if (matched) {
      if (matched.gst_number) setValue("vendor_gstin", matched.gst_number);
      if (matched.phone) setValue("vendor_phone", matched.phone);
    }
  }
  if (data.billNumber) {
    setValue("bill_number", data.billNumber, { shouldValidate: true, shouldDirty: true });
  }
  if (data.date) {
    setValue("date", data.date, { shouldValidate: true, shouldDirty: true });
    setValue("due_date", getDefaultDueDate(data.date), { shouldValidate: true, shouldDirty: true });
  }

  if (data.items && data.items.length > 0) {
    const mappedItems = data.items.map((item) => ({
      description: item.description,
      quantity: item.quantity || 1,
      price: item.price || 0,
      unit: "pc",
      discount: 0,
      tax_rate: watchDefaultTaxRate,
      total: (item.quantity || 1) * (item.price || 0),
    }));
    replace(mappedItems);
    setValue("items", mappedItems, { shouldValidate: true, shouldDirty: true });
  }

  toast({
    title: "AI Magic ✨",
    description: "Bill details populated from natural language text.",
  });
  setIsAiFillOpen(false);
}
