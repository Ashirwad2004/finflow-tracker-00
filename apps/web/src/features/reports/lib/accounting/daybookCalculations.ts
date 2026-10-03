export interface DaybookEntry {
  id: string;
  time: string;
  voucherType: "Sale" | "Purchase" | "Expense" | "Lent" | "Borrowed";
  voucherNo: string;
  particulars: string;
  debit: number;
  credit: number;
  paymentMode: string;
}

export interface DaybookResult {
  date: string;
  entries: DaybookEntry[];
  totalDebit: number;
  totalCredit: number;
  netCashMovement: number;
}

export function computeDaybook(
  allSales: any[],
  allPurchases: any[],
  allExpenses: any[],
  daybookDate: Date
): DaybookResult {
  const selectedDateStr = daybookDate.toISOString().slice(0, 10);
  const entries: DaybookEntry[] = [];

  let totalDebit = 0;
  let totalCredit = 0;

  // Sales on daybookDate (Cash/Bank Debit, Sales Credit)
  allSales.forEach((s: any) => {
    const sDate = (s.date || s.created_at || "").slice(0, 10);
    if (sDate === selectedDateStr && s.status !== "draft") {
      const amt = Number(s.amount_paid || s.total_amount || 0);
      entries.push({
        id: `sale-${s.id}`,
        time: s.created_at ? s.created_at.slice(11, 16) : "12:00",
        voucherType: "Sale",
        voucherNo: s.invoice_number || `INV-${s.id?.slice(0, 6)}`,
        particulars: `To Sales A/c - ${s.customer_name || "Cash Customer"}`,
        debit: amt, // Cash/Bank inflow (Debit)
        credit: 0,
        paymentMode: s.payment_method || "Cash",
      });
      totalDebit += amt;
    }
  });

  // Purchases on daybookDate (Purchases Debit, Cash/Bank Credit)
  allPurchases.forEach((p: any) => {
    const pDate = (p.date || p.created_at || "").slice(0, 10);
    if (pDate === selectedDateStr) {
      const amt = Number(p.amount_paid || p.total_amount || 0);
      entries.push({
        id: `pur-${p.id}`,
        time: p.created_at ? p.created_at.slice(11, 16) : "12:00",
        voucherType: "Purchase",
        voucherNo: p.bill_number || `BILL-${p.id?.slice(0, 6)}`,
        particulars: `By Purchases A/c - ${p.vendor_name || "Vendor"}`,
        debit: 0,
        credit: amt, // Cash/Bank outflow (Credit)
        paymentMode: p.payment_method || "Cash",
      });
      totalCredit += amt;
    }
  });

  // Expenses on daybookDate (Expense Debit, Cash/Bank Credit)
  allExpenses.forEach((e: any) => {
    const eDate = (e.date || e.created_at || "").slice(0, 10);
    if (eDate === selectedDateStr) {
      const amt = Number(e.amount || 0);
      entries.push({
        id: `exp-${e.id}`,
        time: e.created_at ? e.created_at.slice(11, 16) : "12:00",
        voucherType: "Expense",
        voucherNo: `EXP-${e.id?.slice(0, 6)}`,
        particulars: `By ${e.categories?.name || e.category || "Expense"} A/c - ${e.title || ""}`,
        debit: 0,
        credit: amt,
        paymentMode: e.payment_method || "Cash",
      });
      totalCredit += amt;
    }
  });

  return {
    date: selectedDateStr,
    entries,
    totalDebit,
    totalCredit,
    netCashMovement: totalDebit - totalCredit,
  };
}
