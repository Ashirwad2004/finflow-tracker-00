export interface MasterTransactionEntry {
  id: string;
  date: string;
  type: "Sale" | "Purchase" | "Expense" | "Lent" | "Borrowed";
  reference: string;
  partyName: string;
  category: string;
  paymentMode: string;
  amount: number;
  status: string;
}

export function computeAllTransactions(
  filteredSales: any[],
  filteredPurchases: any[],
  filteredExpenses: any[]
): MasterTransactionEntry[] {
  const list: MasterTransactionEntry[] = [];

  filteredSales.forEach((s: any) => {
    list.push({
      id: `sale-${s.id}`,
      date: (s.date || s.created_at || "").slice(0, 10),
      type: "Sale",
      reference: s.invoice_number || `INV-${s.id?.slice(0, 6)}`,
      partyName: s.customer_name || "Cash Customer",
      category: "Sales Revenue",
      paymentMode: s.payment_method || "Cash",
      amount: Number(s.total_amount || 0),
      status: s.status || "completed",
    });
  });

  filteredPurchases.forEach((p: any) => {
    list.push({
      id: `pur-${p.id}`,
      date: (p.date || p.created_at || "").slice(0, 10),
      type: "Purchase",
      reference: p.bill_number || `BILL-${p.id?.slice(0, 6)}`,
      partyName: p.vendor_name || "Vendor",
      category: "Inventory Purchase",
      paymentMode: p.payment_method || "Bank",
      amount: Number(p.total_amount || 0),
      status: p.status || "completed",
    });
  });

  filteredExpenses.forEach((e: any) => {
    list.push({
      id: `exp-${e.id}`,
      date: (e.date || e.created_at || "").slice(0, 10),
      type: "Expense",
      reference: `EXP-${e.id?.slice(0, 6)}`,
      partyName: e.vendor_name || "Direct Expense",
      category: e.categories?.name || e.category || "Operating Expense",
      paymentMode: e.payment_method || "Cash",
      amount: Number(e.amount || 0),
      status: "paid",
    });
  });

  return list.sort((a, b) => b.date.localeCompare(a.date));
}
