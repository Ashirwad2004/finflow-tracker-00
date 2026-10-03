import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { SaleOrderItem } from "../../types/orders";

export interface SaleOrderItemsTableProps {
    items: SaleOrderItem[];
    addItem: () => void;
    removeItem: (index: number) => void;
    updateItem: (index: number, field: keyof SaleOrderItem, value: any) => void;
    products: any[];
    activeProductIdx: number | null;
    setActiveProductIdx: (idx: number | null) => void;
    productDropdownRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
    getFilteredProducts: (query: string) => any[];
    handleSelectProduct: (index: number, matchedProduct: any) => void;
    handleProductInputChange: (index: number, productName: string) => void;
}

export const SaleOrderItemsTable: React.FC<SaleOrderItemsTableProps> = ({
    items,
    addItem,
    removeItem,
    updateItem,
    products,
    activeProductIdx,
    setActiveProductIdx,
    productDropdownRefs,
    getFilteredProducts,
    handleSelectProduct,
    handleProductInputChange,
}) => {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Ordered Products & Services</span>
                    <span className="text-xs font-normal text-slate-400">({items.length} items)</span>
                </h4>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className="h-8 text-xs gap-1 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add Line Item
                </Button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-visible shadow-sm bg-white dark:bg-slate-900">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="p-3 w-6 text-center">#</th>
                            <th className="p-3">Item / Inventory Product Name</th>
                            <th className="p-3 w-24 text-right">Qty</th>
                            <th className="p-3 w-20 text-center">Unit</th>
                            <th className="p-3 w-28 text-right">Rate (₹)</th>
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

                                    {/* Interactive Product Search Dropdown Cell */}
                                    <td className="p-2 relative">
                                        <div
                                            ref={(el) => {
                                                productDropdownRefs.current[idx] = el;
                                            }}
                                            className="relative"
                                        >
                                            <Input
                                                placeholder="Type or select inventory product..."
                                                value={item.name}
                                                onChange={(e) => {
                                                    handleProductInputChange(idx, e.target.value);
                                                    setActiveProductIdx(idx);
                                                }}
                                                onFocus={() => setActiveProductIdx(idx)}
                                                className="h-8 text-xs font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                                required
                                            />

                                            {/* Product Suggestions Menu */}
                                            {activeProductIdx === idx && (
                                                <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl py-1 divide-y divide-slate-100 dark:divide-slate-800 min-w-[260px]">
                                                    {getFilteredProducts(item.name).length > 0 ? (
                                                        getFilteredProducts(item.name).map((prod) => (
                                                            <button
                                                                key={prod.id}
                                                                type="button"
                                                                onClick={() => handleSelectProduct(idx, prod)}
                                                                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors flex items-center justify-between group"
                                                            >
                                                                <div>
                                                                    <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                                                        {prod.name}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                                        <span>
                                                                            Stock: {prod.stock_quantity ?? prod.stock ?? 0}{" "}
                                                                            {prod.unit || "pcs"}
                                                                        </span>
                                                                        {prod.hsn_code && <span>HSN: {prod.hsn_code}</span>}
                                                                        {prod.tax_rate != null && <span>GST: {prod.tax_rate}%</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                                        ₹{Number(prod.price ?? prod.sale_price ?? 0).toLocaleString("en-IN")}
                                                                    </div>
                                                                    <div className="text-[9px] text-slate-400">per {prod.unit || "pcs"}</div>
                                                                </div>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="p-3 text-center text-xs text-slate-400">
                                                            {products.length === 0
                                                                ? "No inventory products found."
                                                                : `No products matching "${item.name}"`}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    <td className="p-2">
                                        <Input
                                            type="number"
                                            min="0.01"
                                            step="any"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right font-medium"
                                            required
                                        />
                                    </td>

                                    <td className="p-2">
                                        <select
                                            value={item.unit || "pcs"}
                                            onChange={(e) => updateItem(idx, "unit", e.target.value)}
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
                                            onChange={(e) => updateItem(idx, "price", parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right font-mono"
                                            required
                                        />
                                    </td>

                                    <td className="p-2">
                                        <select
                                            value={item.tax_rate ?? 0}
                                            onChange={(e) => updateItem(idx, "tax_rate", parseFloat(e.target.value) || 0)}
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
                                            onClick={() => removeItem(idx)}
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
