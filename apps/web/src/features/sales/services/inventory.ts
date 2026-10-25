import { nonNegativeNumber } from "@/core/utils/money";

interface SoldLine {
  product_id?: string;
  description: string;
  quantity: number;
}

interface StockProduct {
  id: string;
  name?: string;
  stock_quantity?: number | string | null;
}

/** Aggregate repeated product rows before applying a stock snapshot once. */
export function calculateInventoryDeductions<T extends StockProduct>(
  items: SoldLine[],
  products: T[]
): Array<{ product: T; quantity: number; updatedStock: number }> {
  const productsById = new Map<string, T>();
  const productsByName = new Map<string, T>();
  for (const product of products) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id)) continue;
    productsById.set(product.id, product);
    const name = product.name?.trim().toLowerCase();
    if (name && !productsByName.has(name)) productsByName.set(name, product);
  }
  const deductions = new Map<string, { product: T; quantity: number; updatedStock: number }>();
  for (const item of items) {
    const product = (item.product_id ? productsById.get(item.product_id) : undefined) ||
                    productsByName.get(item.description?.trim().toLowerCase());
    const quantity = nonNegativeNumber(item.quantity);
    if (!product || quantity === 0) continue;
    const deduction = deductions.get(product.id) || { product, quantity: 0, updatedStock: 0 };
    deduction.quantity += quantity;
    const stock = Number(product.stock_quantity);
    deduction.updatedStock = (Number.isFinite(stock) ? stock : 0) - deduction.quantity;
    deductions.set(product.id, deduction);
  }
  return [...deductions.values()];
}
