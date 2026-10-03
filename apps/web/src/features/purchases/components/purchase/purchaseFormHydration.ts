import { PurchaseFormValues } from "../../hooks";

export function getInitialPurchaseFormValues(
  purchaseToEdit: any,
  initialParty: any,
  getDefaultDueDate: (date: string) => string
): PurchaseFormValues {
  if (purchaseToEdit) {
    const initialDate = purchaseToEdit.date || new Date().toISOString().split("T")[0];
    const initialTotal = Number(purchaseToEdit.total_amount || 0);
    const initialPaid =
      purchaseToEdit.amount_paid !== undefined
        ? Number(purchaseToEdit.amount_paid)
        : purchaseToEdit.status === "paid"
        ? initialTotal
        : 0;

    let computedStatus: "paid" | "partial" | "pending" = "paid";
    if (initialPaid >= initialTotal && initialTotal > 0) {
      computedStatus = "paid";
    } else if (initialPaid > 0 && initialPaid < initialTotal) {
      computedStatus = "partial";
    } else {
      computedStatus = "pending";
    }

    return {
      vendor_name: purchaseToEdit.vendor_name || "",
      vendor_phone: purchaseToEdit.vendor_phone || "",
      vendor_gstin: purchaseToEdit.vendor_gstin || "",
      place_of_supply: purchaseToEdit.place_of_supply || "",
      bill_number: purchaseToEdit.bill_number || "",
      date: initialDate,
      due_date: purchaseToEdit.due_date || getDefaultDueDate(initialDate),
      payment_status: computedStatus,
      amount_paid: initialPaid,
      discount_amount: Number(purchaseToEdit.discount_amount || 0),
      tax_rate: Number(purchaseToEdit.tax_rate || 0),
      notes: purchaseToEdit.notes || "",
      attachment_url: purchaseToEdit.attachment_url || "",
      quick_item_name: "General Purchase Item",
      quick_total_amount: 0,
      items:
        purchaseToEdit.items && purchaseToEdit.items.length > 0
          ? purchaseToEdit.items.map((it: any) => ({
              description: it.description || "",
              quantity: Number(it.quantity || 1),
              price: Number(it.price || 0),
              unit: it.unit || "pc",
              discount: Number(it.discount || 0),
              tax_rate: Number(it.tax_rate ?? purchaseToEdit.tax_rate ?? 0),
              total: Number(it.total || 0),
            }))
          : [
              {
                description: "",
                quantity: 1,
                price: 0,
                unit: "pc",
                discount: 0,
                tax_rate: 0,
                total: 0,
              },
            ],
    };
  }

  const todayStr = new Date().toISOString().split("T")[0];
  return {
    vendor_name: initialParty?.name || "",
    vendor_phone: initialParty?.phone || "",
    vendor_gstin: initialParty?.gst_number || "",
    place_of_supply: initialParty?.address || "",
    bill_number: `BILL-${Date.now().toString().slice(-6)}`,
    date: todayStr,
    due_date: getDefaultDueDate(todayStr),
    payment_status: "paid",
    amount_paid: 0,
    discount_amount: 0,
    tax_rate: 0,
    notes: "",
    attachment_url: "",
    quick_item_name: "General Purchase Item",
    quick_total_amount: 0,
    items: [
      {
        description: "",
        quantity: 1,
        price: 0,
        unit: "pc",
        discount: 0,
        tax_rate: 0,
        total: 0,
      },
    ],
  };
}
