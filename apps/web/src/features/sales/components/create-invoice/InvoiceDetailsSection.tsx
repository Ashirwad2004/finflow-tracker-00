import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormRegister, UseFormWatch, FieldErrors } from "react-hook-form";
import { useCurrency } from "@/core/contexts/CurrencyContext";

export interface InvoiceDetailsSectionProps {
    register: UseFormRegister<any>;
    watch: UseFormWatch<any>;
    errors: FieldErrors<any>;
    totalAmount: number;
    formatCurrency?: (amount: number) => string;
}

export const InvoiceDetailsSection: React.FC<InvoiceDetailsSectionProps> = ({
    register,
    watch,
    errors,
    totalAmount,
    formatCurrency: customFormatCurrency,
}) => {
    const { formatCurrency: defaultFormatCurrency } = useCurrency();
    const formatCurrency = customFormatCurrency || defaultFormatCurrency;

    const documentType = watch("document_type") || "invoice";
    const isAmendment = watch("is_amendment");
    const status = watch("status");
    const customerGstin = watch("customer_gstin");
    const amountPaid = Number(watch("amount_paid")) || 0;

    return (
        <div className="w-full md:w-[280px] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 border-b border-slate-100 pb-2">
                Invoice Details
            </h3>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                        Doc Type
                    </Label>

                    <select
                        {...register("document_type")}
                        className="flex h-9 w-[140px] rounded-sm border border-slate-300 bg-white px-3 py-1 text-sm"
                    >
                        <option value="invoice">
                            Tax Invoice
                        </option>
                        <option value="credit_note">
                            Credit Note
                        </option>
                        <option value="debit_note">
                            Debit Note
                        </option>
                    </select>
                </div>

                {documentType !== "invoice" && (
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">
                            Original Inv UUID
                        </Label>

                        <Input
                            {...register("original_invoice_id")}
                            placeholder="Optional UUID"
                            className="h-9 w-[140px] text-xs font-mono"
                        />
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                        Is Amendment?
                    </Label>

                    <input
                        type="checkbox"
                        {...register("is_amendment")}
                        className="w-4 h-4"
                    />
                </div>

                {isAmendment && (
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">
                            Amended UUID
                        </Label>

                        <Input
                            {...register("amended_invoice_id")}
                            placeholder="Target UUID"
                            className="h-9 w-[140px] text-xs font-mono"
                        />
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                        {documentType === "invoice" ? "Invoice No." : "Note No."}
                    </Label>

                    <Input
                        {...register("invoice_number", {
                            required: "Required",
                        })}
                        className="h-9 w-[140px] text-right font-medium"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                        Date
                    </Label>

                    <Input
                        type="date"
                        {...register("date")}
                        className="h-9 w-[140px]"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                        Due Date
                    </Label>

                    <Input
                        type="date"
                        {...register("due_date")}
                        className="h-9 w-[140px]"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                        Status
                    </Label>

                    <select
                        {...register("status")}
                        className="flex h-9 w-[140px] rounded-sm border border-slate-300 bg-white px-3 py-1 text-sm"
                    >
                        <option value="pending">
                            Pending
                        </option>
                        <option value="partial">
                            Partial
                        </option>
                        <option value="paid">
                            Paid
                        </option>
                    </select>
                </div>

                {/* Amount Paid — shown only for Partial status */}
                {status === "partial" && (
                    <div className="space-y-2 p-3 rounded-sm border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 mt-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                Amount Paid (₹)
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                step="any"
                                className="h-9 w-[140px] text-right font-semibold border-blue-300"
                                {...register("amount_paid", {
                                    valueAsNumber: true,
                                    min: { value: 0, message: "Cannot be negative" },
                                })}
                                placeholder="0.00"
                            />
                        </div>
                        {errors.amount_paid && (
                            <p className="text-destructive text-[10px] text-right">
                                {(errors.amount_paid as any).message}
                            </p>
                        )}
                        <div className="flex items-center justify-between pt-1 border-t border-blue-200">
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Balance Due</span>
                            <span className="text-xs font-bold text-rose-600">
                                {formatCurrency(Math.max(0, totalAmount - amountPaid))}
                            </span>
                        </div>
                    </div>
                )}

                {customerGstin?.length === 15 && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                                IRN
                            </Label>

                            <Input
                                className="h-9"
                                {...register("irn")}
                                placeholder="64-char hash"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                                E-Way Bill No
                            </Label>

                            <Input
                                className="h-9"
                                {...register("eway_bill_number")}
                                placeholder="e.g. 123456789"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvoiceDetailsSection;
