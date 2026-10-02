import React from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, SlidersHorizontal } from "lucide-react";
import { ColumnMapping } from "../../types/partyImportExportTypes";

interface ImportMapColumnsSectionProps {
    file: File | null;
    rawRows: any[][];
    rawHeaders: string[];
    mapping: ColumnMapping;
    setMapping: React.Dispatch<React.SetStateAction<ColumnMapping>>;
    onBackToUpload: () => void;
    onConfirmMapping: () => void;
}

export const ImportMapColumnsSection: React.FC<ImportMapColumnsSectionProps> = ({
    file,
    rawRows,
    rawHeaders,
    mapping,
    setMapping,
    onBackToUpload,
    onConfirmMapping,
}) => {
    const fields = [
        {
            key: "name" as const,
            label: "Party / Customer / Vendor Name",
            required: true,
            desc: "Full business or person name. Cannot be blank.",
        },
        {
            key: "type" as const,
            label: "Party Type",
            required: false,
            desc: "customer, vendor, or both (defaults to customer if blank)",
        },
        {
            key: "phone" as const,
            label: "Phone / Mobile Number",
            required: false,
            desc: "10-digit mobile number for WhatsApp and calling",
        },
        {
            key: "email" as const,
            label: "Email Address",
            required: false,
            desc: "Email address for digital invoices and communications",
        },
        {
            key: "gstin" as const,
            label: "GSTIN (Tax Identification)",
            required: false,
            desc: "15-character Indian GSTIN (e.g. 07AAAAA0000A1Z5)",
        },
        {
            key: "address" as const,
            label: "Billing Address",
            required: false,
            desc: "Physical shop, registered office, or billing address",
        },
        {
            key: "opening_balance" as const,
            label: "Opening Balance Amount",
            required: false,
            desc: "Initial outstanding balance (numeric, defaults to 0)",
        },
        {
            key: "opening_balance_type" as const,
            label: "Balance Nature / Type",
            required: false,
            desc: "to_receive (Dr / Receivable) or to_pay (Cr / Payable)",
        },
    ];

    return (
        <div className="space-y-4">
            {/* File Info Header */}
            <div className="bg-slate-100/80 dark:bg-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="font-bold text-foreground">
                            {file?.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                            {rawRows.length} data rows detected &bull; {rawHeaders.length} columns found
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                        Verify column mappings before validation
                    </span>
                </div>
            </div>

            {/* Mapping Grid Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-card">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold flex items-center gap-1.5 text-foreground">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                        Match Spreadsheet Columns to Party Details
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                        * Required Field
                    </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {fields.map((field) => {
                        const selectedColIdx = mapping[field.key];
                        const sampleValues =
                            selectedColIdx !== -1
                                ? rawRows
                                      .slice(0, 3)
                                      .map((r) => r[selectedColIdx])
                                      .filter((v) => v !== null && v !== undefined && v !== "")
                                : [];

                        return (
                            <div
                                key={field.key}
                                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                            >
                                <div className="sm:w-1/2">
                                    <p className="font-bold text-xs text-foreground flex items-center gap-1">
                                        {field.label}
                                        {field.required && (
                                            <span className="text-rose-500 font-black">*</span>
                                        )}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {field.desc}
                                    </p>
                                    {sampleValues.length > 0 && (
                                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                            <span className="text-[10px] text-slate-400 font-semibold">
                                                Sample data:
                                            </span>
                                            {sampleValues.map((val, sIdx) => (
                                                <span
                                                    key={sIdx}
                                                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono truncate max-w-[140px]"
                                                >
                                                    {String(val)}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="sm:w-1/2 max-w-xs">
                                    <select
                                        value={selectedColIdx}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            setMapping((prev) => ({ ...prev, [field.key]: val }));
                                        }}
                                        className={`w-full h-9 px-3 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary ${
                                            field.required && selectedColIdx === -1
                                                ? "border-rose-300 bg-rose-50/30 text-rose-700"
                                                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-foreground"
                                        }`}
                                    >
                                        <option value="-1">— Do Not Map (Ignore) —</option>
                                        {rawHeaders.map((headerName, idx) => (
                                            <option key={idx} value={idx}>
                                                Column {idx + 1}: {headerName || `(Unnamed Column ${idx + 1})`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBackToUpload}
                    className="text-xs rounded-xl"
                >
                    &larr; Choose Different File
                </Button>
                <Button
                    size="sm"
                    onClick={onConfirmMapping}
                    disabled={mapping.name === -1}
                    className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl gap-1.5"
                >
                    Confirm Mapping & Validate &rarr;
                </Button>
            </div>
        </div>
    );
};
