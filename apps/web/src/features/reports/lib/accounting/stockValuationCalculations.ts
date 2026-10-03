export interface StockItemRecord {
  id: string;
  name: string;
  sku: string;
  hsn: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  costPrice: number;
  sellingPrice: number;
  totalCost: number;
  totalRetail: number;
  marginPct: number;
  status: "Out of Stock" | "Low Stock" | "In Stock";
}

export interface StockSummaryResult {
  items: StockItemRecord[];
  totalProducts: number;
  totalStockQty: number;
  totalCostValuation: number;
  totalRetailValuation: number;
  potentialGrossProfit: number;
  lowStockCount: number;
}

export interface ItemWiseProfitRecord {
  name: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
}

export function computeStockSummary(allProducts: any[]): StockSummaryResult {
  let totalStockQty = 0;
  let totalCostValuation = 0;
  let totalRetailValuation = 0;
  let lowStockCount = 0;

  const items = allProducts.map((p: any) => {
    const qty = Math.max(0, Number(p.current_stock || p.stock_quantity || 0));
    const cost = Number(p.cost_price || p.purchase_price || 0);
    const price = Number(p.price || p.selling_price || 0);
    const minStock = Number(p.min_stock_level || 5);

    const totalCost = qty * cost;
    const totalRetail = qty * price;
    const marginPct = price > 0 ? ((price - cost) / price) * 100 : 0;

    totalStockQty += qty;
    totalCostValuation += totalCost;
    totalRetailValuation += totalRetail;

    const isLow = qty <= minStock;
    if (isLow) lowStockCount++;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku || p.barcode || "-",
      hsn: p.hsn_code || "-",
      category: p.category || "General",
      currentStock: qty,
      minStockLevel: minStock,
      costPrice: cost,
      sellingPrice: price,
      totalCost,
      totalRetail,
      marginPct,
      status: (qty === 0 ? "Out of Stock" : isLow ? "Low Stock" : "In Stock") as
        | "Out of Stock"
        | "Low Stock"
        | "In Stock",
    };
  });

  return {
    items,
    totalProducts: allProducts.length,
    totalStockQty,
    totalCostValuation,
    totalRetailValuation,
    potentialGrossProfit: totalRetailValuation - totalCostValuation,
    lowStockCount,
  };
}

export function computeItemWiseProfit(
  filteredSales: any[],
  productCostMap: Map<string, number>
): ItemWiseProfitRecord[] {
  const itemMap = new Map<
    string,
    {
      name: string;
      unitsSold: number;
      revenue: number;
      cost: number;
      profit: number;
      marginPct: number;
    }
  >();

  filteredSales.forEach((s: any) => {
    const items = Array.isArray(s.items) ? s.items : [];
    items.forEach((it: any) => {
      const name = it.name || "Custom Item";
      const qty = Number(it.quantity || 1);
      const price = Number(it.price || 0);
      let costPrice = Number(it.cost_price || 0);
      if (!costPrice) costPrice = productCostMap.get(name.toLowerCase().trim()) || 0;

      const rev = qty * price;
      const totalCost = qty * costPrice;

      if (!itemMap.has(name)) {
        itemMap.set(name, {
          name,
          unitsSold: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          marginPct: 0,
        });
      }

      const entry = itemMap.get(name)!;
      entry.unitsSold += qty;
      entry.revenue += rev;
      entry.cost += totalCost;
      entry.profit += rev - totalCost;
      entry.marginPct = entry.revenue > 0 ? (entry.profit / entry.revenue) * 100 : 0;
    });
  });

  return Array.from(itemMap.values()).sort((a, b) => b.profit - a.profit);
}
