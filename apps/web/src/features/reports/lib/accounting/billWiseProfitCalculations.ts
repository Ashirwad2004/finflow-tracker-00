export interface BillWiseProfitItem {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  invoiceTotal: number;
  costOfInvoice: number;
  profit: number;
  marginPct: number;
  statusTier: "High" | "Normal" | "Low" | "Loss";
}

export function computeBillWiseProfit(
  filteredSales: any[],
  productCostMap: Map<string, number>
): BillWiseProfitItem[] {
  return filteredSales.map((s: any) => {
    const invoiceTotal = Number(s.total_amount || 0);
    const items = Array.isArray(s.items) ? s.items : [];

    let costOfInvoice = 0;
    items.forEach((it: any) => {
      const qty = Number(it.quantity || 1);
      let itemCost = Number(it.cost_price || 0);
      if (!itemCost && it.name) {
        itemCost = productCostMap.get(it.name.toLowerCase().trim()) || 0;
      }
      if (!itemCost && it.product_id) {
        itemCost = productCostMap.get(it.product_id) || 0;
      }
      costOfInvoice += qty * itemCost;
    });

    // If items cost isn't recorded, estimate standard merchant benchmark (e.g. 70% COGS)
    if (costOfInvoice === 0 && invoiceTotal > 0 && items.length === 0) {
      costOfInvoice = invoiceTotal * 0.7;
    }

    const profit = invoiceTotal - costOfInvoice;
    const marginPct = invoiceTotal > 0 ? (profit / invoiceTotal) * 100 : 0;

    let statusTier: "High" | "Normal" | "Low" | "Loss" = "Normal";
    if (marginPct >= 30) statusTier = "High";
    else if (marginPct >= 15) statusTier = "Normal";
    else if (marginPct >= 0) statusTier = "Low";
    else statusTier = "Loss";

    return {
      id: s.id,
      invoiceNumber: s.invoice_number || s.id?.slice(0, 8),
      date: s.date || s.created_at,
      customerName: s.customer_name || "Direct Customer",
      customerPhone: s.customer_phone || "",
      invoiceTotal,
      costOfInvoice,
      profit,
      marginPct,
      statusTier,
    };
  });
}
