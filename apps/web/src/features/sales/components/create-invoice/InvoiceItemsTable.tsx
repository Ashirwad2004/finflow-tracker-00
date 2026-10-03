import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Percent, Trash2, Plus } from "lucide-react";
import { ProductCombobox, ProductItem } from "@/features/purchases/components/purchase/ProductCombobox";
import { FieldArrayWithId, UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { useCurrency } from "@/core/contexts/CurrencyContext";

export interface InvoiceItemsTableProps {
    fields: FieldArrayWithId<any, "items", "id">[];
    register: UseFormRegister<any>;
    errors: FieldErrors<any>;
    watch: UseFormWatch<any>;
    watchItems?: any[];
    setValue: UseFormSetValue<any>;
    products: ProductItem[];
    salesSettings?: any;
    handleProductSelect: (index: number, product: ProductItem) => void;
    handleQuickAddProduct: (product: ProductItem) => void | Promise<void>;
    descriptionRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    handleItemKeyDown: (e: React.KeyboardEvent<any>, index: number) => void;
    remove: (index: number) => void;
    addEmptyItemRow: () => void;
    formatCurrency?: (amount: number) => string;
}

export const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
    fields,
    register,
    errors,
    watch,
    watchItems,
    setValue,
    products,
    salesSettings,
    handleProductSelect,
    handleQuickAddProduct,
    descriptionRefs,
    handleItemKeyDown,
    remove,
    addEmptyItemRow,
    formatCurrency: customFormatCurrency,
}) => {
    const { formatCurrency: defaultFormatCurrency } = useCurrency();
    const formatCurrency = customFormatCurrency || defaultFormatCurrency;

    const hsnEnabled = !!salesSettings?.enableHsnCode;
    const itemTaxEnabled = !!(salesSettings?.enableItemWiseTax || salesSettings?.showItemTaxRateOnBill);

    return (
        <div className="space-y-2">
            {errors.items && !Array.isArray(errors.items) && (
                <p className="text-destructive text-sm mb-2">
                    {(errors.items as any).message}
                </p>
            )}

            <div className="border border-slate-200 rounded-lg">
                {/* Header */}
                <div
                    className={`hidden sm:grid ${
                        hsnEnabled && itemTaxEnabled
                            ? "grid-cols-[1fr_90px_80px_90px_80px_80px_100px_40px]"
                            : hsnEnabled
                                ? "grid-cols-[1fr_100px_100px_100px_100px_120px_40px]"
                                : itemTaxEnabled
                                    ? "grid-cols-[1fr_80px_100px_80px_80px_100px_40px]"
                                    : "grid-cols-[1fr_100px_120px_100px_120px_40px]"
                    } gap-0 border-b border-slate-200 bg-slate-100/50 text-xs font-semibold text-slate-600 uppercase tracking-wider rounded-t-lg`}
                >
                    <div className="py-2.5 px-3">
                        Item Description
                    </div>

                    {hsnEnabled && (
                        <div className="py-2.5 px-3 border-l border-slate-200">
                            HSN
                        </div>
                    )}

                    <div className="py-2.5 px-3 border-l border-slate-200 text-right">
                        Qty
                    </div>

                    <div className="py-2.5 px-3 border-l border-slate-200 text-right">
                        Rate
                    </div>

                    <div className="py-2.5 px-3 border-l border-slate-200 text-right">
                        Disc %
                    </div>

                    {itemTaxEnabled && (
                        <div className="py-2.5 px-3 border-l border-slate-200 text-right">
                            Tax %
                        </div>
                    )}

                    <div className="py-2.5 px-3 border-l border-slate-200 text-right">
                        Amount
                    </div>

                    <div className="py-2.5 px-0 border-l border-slate-200" />
                </div>

                {/* Table Body */}
                <div className="divide-y divide-slate-100">
                    {fields.map((field, index) => {
                        const qty = watch(`items.${index}.quantity`) || 0;
                        const price = watch(`items.${index}.price`) || 0;
                        const disc = watch(`items.${index}.discount`) || 0;
                        const lineTotal = qty * price * (1 - disc / 100);

                        return (
                            <div
                                key={field.id}
                                style={{ zIndex: fields.length - index + 20 }}
                                className={`relative grid grid-cols-1 ${
                                    hsnEnabled && itemTaxEnabled
                                        ? "sm:grid-cols-[1fr_90px_80px_90px_80px_80px_100px_40px]"
                                        : hsnEnabled
                                            ? "sm:grid-cols-[1fr_100px_100px_100px_100px_120px_40px]"
                                            : itemTaxEnabled
                                                ? "sm:grid-cols-[1fr_80px_100px_80px_80px_100px_40px]"
                                                : "sm:grid-cols-[1fr_100px_120px_100px_120px_40px]"
                                } gap-1 sm:gap-0 p-3 sm:p-0 items-start sm:items-stretch bg-white`}
                            >
                                {/* DESCRIPTION */}
                                <div className="sm:p-0 relative">
                                    <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">
                                        Item Description
                                    </div>

                                    <ProductCombobox
                                        value={watch(`items.${index}.description`) ?? watchItems?.[index]?.description ?? ""}
                                        products={products}
                                        onChange={(val) => {
                                            setValue(
                                                `items.${index}.description`,
                                                val,
                                                {
                                                    shouldValidate: true,
                                                    shouldDirty: true,
                                                }
                                            );
                                        }}
                                        onSelectProduct={(p) =>
                                            handleProductSelect(index, p)
                                        }
                                        onQuickAddProduct={handleQuickAddProduct}
                                        inputRef={(el) => {
                                            descriptionRefs.current[index] = el;
                                        }}
                                        onKeyDown={(e) =>
                                            handleItemKeyDown(e, index)
                                        }
                                        placeholder="Type or select product..."
                                        mode="sale"
                                        className={`h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 bg-transparent ${
                                            errors.items?.[index]?.description
                                                ? "border-destructive sm:border-destructive"
                                                : ""
                                        }`}
                                    />
                                </div>

                                {/* HSN */}
                                {hsnEnabled && (
                                    <div className="sm:p-0">
                                        <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">
                                            HSN
                                        </div>

                                        <Input
                                            className="h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 bg-transparent"
                                            {...register(`items.${index}.hsn_code` as const)}
                                            placeholder="HSN"
                                        />
                                    </div>
                                )}

                                {/* QUANTITY */}
                                <div className="sm:p-0 flex items-center border-slate-200 sm:border-r bg-transparent">
                                    <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">
                                        Quantity
                                    </div>

                                    <Input
                                        type="number"
                                        className="h-9 sm:h-auto border-0 flex-1 px-2 text-right bg-transparent focus-visible:ring-0"
                                        {...register(`items.${index}.quantity` as const, {
                                            valueAsNumber: true,
                                            min: 1,
                                        })}
                                        min="1"
                                        onKeyDown={(e) => handleItemKeyDown(e, index)}
                                    />

                                    <Input
                                        type="text"
                                        className="h-9 sm:h-auto border-0 w-12 px-1 text-center bg-transparent text-slate-500 text-xs border-l border-slate-100"
                                        {...register(`items.${index}.unit` as const)}
                                        placeholder="Unit"
                                    />
                                </div>

                                {/* RATE */}
                                <div className="sm:p-0">
                                    <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">
                                        Rate
                                    </div>

                                    <Input
                                        type="number"
                                        className={`h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 text-right bg-transparent ${
                                            errors.items?.[index]?.price
                                                ? "border-destructive"
                                                : ""
                                        }`}
                                        {...register(`items.${index}.price` as const, {
                                            required: true,
                                            valueAsNumber: true,
                                            min: 0,
                                        })}
                                        min="0"
                                        step="0.01"
                                        onKeyDown={(e) => handleItemKeyDown(e, index)}
                                    />
                                </div>

                                {/* DISCOUNT */}
                                <div className="sm:p-0 relative">
                                    <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">
                                        Discount %
                                    </div>

                                    <Input
                                        type="number"
                                        className="h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 text-right pr-6 bg-transparent"
                                        {...register(`items.${index}.discount` as const)}
                                        min="0"
                                        max="100"
                                        onKeyDown={(e) => handleItemKeyDown(e, index)}
                                    />

                                    <Percent className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none hidden sm:block" />
                                </div>

                                {/* ITEM TAX */}
                                {itemTaxEnabled && (
                                    <div className="sm:p-0 relative">
                                        <div className="sm:hidden text-xs font-semibold text-slate-500 uppercase mt-2 mb-1">
                                            Tax %
                                        </div>

                                        <Input
                                            type="number"
                                            className="h-9 sm:h-auto sm:border-0 sm:border-r border-slate-200 rounded-sm sm:rounded-none px-3 text-right pr-6 bg-transparent"
                                            {...register(`items.${index}.tax_rate` as const, {
                                                valueAsNumber: true,
                                                min: 0,
                                                max: 100,
                                            })}
                                            min="0"
                                            max="100"
                                            step="0.1"
                                        />

                                        <Percent className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none hidden sm:block" />
                                    </div>
                                )}

                                {/* AMOUNT */}
                                <div className="flex items-center justify-end px-3 sm:border-r border-slate-200 font-medium text-slate-800 text-sm h-9 sm:h-auto bg-slate-50/50">
                                    {formatCurrency(lineTotal)}
                                </div>

                                {/* DELETE */}
                                <div className="flex items-center justify-center p-1 sm:p-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-sm"
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-between pt-1">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEmptyItemRow}
                    className="text-xs flex items-center gap-1.5 border-dashed border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 bg-white shadow-none h-8"
                >
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    Add Line Item
                </Button>
                <span className="text-[11px] text-slate-400">
                    Press <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono">Enter</kbd> to add next row or jump fields
                </span>
            </div>
        </div>
    );
};

export default InvoiceItemsTable;
