import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PurchaseOrderItem } from "../../types/orders";

interface PoItemsTableProps {
  items: PurchaseOrderItem[];
  products: any[];
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, field: keyof PurchaseOrderItem, value: any) => void;
  onProductSelect: (index: number, productName: string) => void;
}

export const PoItemsTable: React.FC<PoItemsTableProps> = ({
  items,
  products,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onProductSelect,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <span>Procurement Items</span>
          <span className="text-xs font-normal text-slate-400">({items.length} items)</span>
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddItem}
          className="h-8 text-xs gap-1 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Line Item
        </Button>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3 w-6 text-center">#</th>
              <th className="p-3">Item / Product Name</th>
              <th className="p-3 w-24 text-right">Qty</th>
              <th className="p-3 w-20 text-center">Unit</th>
              <th className="p-3 w-28 text-right">Purchase Rate (₹)</th>
              <th className="p-3 w-24 text-center">GST %</th>
              <th className="p-3 w-28 text-right">Total (₹)</th>
              <th className="p-3 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item, idx) => {
              const lineSub = (Number(item.quantity) || 0) * (Number(item.price) || 0);
              const lineTax = (lineSub * (Number(item.tax_rate) || 0)) / 100;
              const lineTot = lineSub + lineTax;

              return (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                  <td className="p-2">
                    <div className="space-y-1">
                      <Input
                        list={`po-products-list-${idx}`}
                        placeholder="Type or select product..."
                        value={item.name}
                        onChange={(e) => onProductSelect(idx, e.target.value)}
                        className="h-8 text-xs font-medium"
                        required
                      />
                      <datalist id={`po-products-list-${idx}`}>
                        {products.map((prod) => (
                          <option key={prod.id} value={prod.name}>
                            Purchase: ₹{prod.purchase_price || prod.sale_price} • Current Stock: {prod.stock_quantity}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => onUpdateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs text-right font-medium"
                      required
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={item.unit || "pcs"}
                      onChange={(e) => onUpdateItem(idx, "unit", e.target.value)}
                      className="w-full h-8 px-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="pcs">pcs</option>
                      <option value="box">box</option>
                      <option value="kg">kg</option>
                      <option value="mtr">mtr</option>
                      <option value="lit">lit</option>
                      <option value="set">set</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={item.price}
                      onChange={(e) => onUpdateItem(idx, "price", parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs text-right font-mono"
                      required
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={item.tax_rate ?? 0}
                      onChange={(e) => onUpdateItem(idx, "tax_rate", parseFloat(e.target.value) || 0)}
                      className="w-full h-8 px-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-center"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    ₹{lineTot.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
