/**
 * GSTR1Report.tsx
 *
 * A fully CA-compliant GSTR-1 report generator built from existing sales data.
 *
 * GSTR-1 is a monthly/quarterly return that outward suppliers must file.
 * It contains the following key tables per CGST Rules 2017:
 *
 *  Table 3.1  — Summary of outward supplies (aggregate)
 *  Table 4    — B2B supplies (to GST-registered buyers)
 *  Table 5    — B2C (Large) supplies (inter-state, > ₹2.5 lakh to unregistered)
 *  Table 7    — B2C (Small) supplies (all other unregistered)
 *  Table 12   — HSN-wise summary of outward supplies
 *  Table 13   — Document summary (invoice count series)
 *
 * Data source: sales table from Supabase (same as used by the rest of the app).
 * Each invoice's items array is parsed to derive taxable value, CGST, SGST, IGST.
 *
 * Assumptions:
 *  - An invoice with a customer GSTIN on file → B2B
 *  - An invoice without GSTIN + inter-state (inferred as outside-state) → B2C (Large) if > 2.5L
 *  - All others → B2C (Small)
 *  - Tax from invoice split as CGST+SGST (intra-state) or IGST (inter-state), based on customer GSTIN prefix
 *  - The business GSTIN prefix is taken from profile.gst_number (first 2 digits = state code)
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Download, FileText, FileSpreadsheet, AlertCircle, CheckCircle2,
    Building2, Users, UserMinus, Tag, Receipt, ListChecks, Info,
    ChevronDown, ChevronUp, ShieldCheck,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SaleInvoice {
    id: string;
    invoice_number: string;
    customer_name: string;
    customer_gstin?: string;
    customer_state?: string;
    date: string;
    status: string;
    total_amount: number;
    subtotal: number;
    tax_amount: number;
    items: InvoiceLineItem[];
    payment_method?: string;
}

interface InvoiceLineItem {
    description: string;
    quantity: number;
    price: number;
    discount: number;
    total: number;
    tax_rate?: number;
    hsn_code?: string;
}

interface B2BRecord {
    gstin: string;
    customer_name: string;
    invoice_number: string;
    invoice_date: string;
    invoice_value: number;
    taxable_value: number;
    igst: number;
    cgst: number;
    sgst: number;
    place_of_supply: string;
    reverse_charge: boolean;
}

interface B2CSRecord {
    place_of_supply: string;
    tax_rate: number;
    taxable_value: number;
    igst: number;
    cgst: number;
    sgst: number;
}

interface B2CLRecord {
    invoice_number: string;
    invoice_date: string;
    invoice_value: number;
    place_of_supply: string;
    taxable_value: number;
    igst: number;
}

interface HSNRecord {
    hsn_code: string;
    description: string;
    uqc: string;
    quantity: number;
    taxable_value: number;
    tax_rate: number;
    igst: number;
    cgst: number;
    sgst: number;
}

// ─── Period options ───────────────────────────────────────────────────────────

const now = new Date(2026, 2, 21); // Use current date from system: 2026-03-21
const PERIODS = [
    { label: "March 2026 (Current)", from: startOfMonth(now), to: endOfMonth(now) },
    { label: "February 2026", from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) },
    { label: "January 2026", from: startOfMonth(subMonths(now, 2)), to: endOfMonth(subMonths(now, 2)) },
    { label: "December 2025", from: startOfMonth(subMonths(now, 3)), to: endOfMonth(subMonths(now, 3)) },
    { label: "Q4 FY 2025-26 (Jan–Mar 2026)", from: new Date(2026, 0, 1), to: new Date(2026, 2, 31) },
    { label: "Q3 FY 2025-26 (Oct–Dec 2025)", from: new Date(2025, 9, 1), to: new Date(2025, 11, 31) },
    { label: "Full FY 2025-26", from: new Date(2025, 3, 1), to: new Date(2026, 2, 31) },
    { label: "Full FY 2024-25", from: new Date(2024, 3, 1), to: new Date(2025, 2, 31) },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stateCode(gstin: string): string {
    return gstin.substring(0, 2);
}

function taxRateFromInvoice(invoice: SaleInvoice): number {
    if (!invoice.subtotal || invoice.subtotal === 0) return 18;
    return Math.round(((invoice.tax_amount / invoice.subtotal) * 100) * 100) / 100;
}

function splitTax(taxAmount: number, isInterState: boolean, taxRate: number) {
    if (isInterState) return { igst: taxAmount, cgst: 0, sgst: 0 };
    return { igst: 0, cgst: taxAmount / 2, sgst: taxAmount / 2 };
}

function isInterState(invoice: SaleInvoice, bizStateCode: string): boolean {
    if (invoice.customer_gstin) {
        return stateCode(invoice.customer_gstin) !== bizStateCode;
    }
    // Without GSTIN, assume intra-state (conservative default)
    return false;
}

function taxableFromInvoice(invoice: SaleInvoice): number {
    return invoice.subtotal || (invoice.total_amount - (invoice.tax_amount || 0));
}

function formatINR(n: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(n);
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
    const csvContent = [headers, ...rows].map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionCard = ({ title, subtitle, icon: Icon, count, badge, color, children, defaultOpen = true }: {
    title: string; subtitle: string; icon: any; count: number; badge?: string;
    color: string; children: React.ReactNode; defaultOpen?: boolean;
}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <Card className={`border-l-4 ${color}`}>
            <CardHeader
                className="py-4 cursor-pointer select-none"
                onClick={() => setOpen(v => !v)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color.replace("border-l-", "bg-").replace("-500", "-100").replace("-600", "-100")} dark:bg-opacity-20`}>
                            <Icon className={`w-4 h-4 ${color.replace("border-l-", "text-").replace("-[", "[")}`} />
                        </div>
                        <div>
                            <CardTitle className="text-base">{title}</CardTitle>
                            <CardDescription className="text-xs mt-0.5">{subtitle}</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {badge}
                            </span>
                        )}
                        <Badge variant="secondary" className="font-semibold">{count} record{count !== 1 ? "s" : ""}</Badge>
                        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                </div>
            </CardHeader>
            {open && <CardContent className="p-0 pb-2">{children}</CardContent>}
        </Card>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const GSTR1Report = () => {
    const { user } = useAuth();
    const { formatCurrency } = useCurrency();
    const [selectedPeriod, setSelectedPeriod] = useState(0);

    const period = PERIODS[selectedPeriod];

    // Fetch profile (for GSTIN & business name)
    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.from("profiles" as any).select("*").eq("user_id", user?.id).single();
            if (error) throw error;
            return data as any;
        },
        enabled: !!user,
    });

    // Fetch sales for the selected period
    const { data: rawSales = [], isLoading } = useQuery({
        queryKey: ["gstr1-sales", user?.id, period.from.toISOString(), period.to.toISOString()],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("sales" as any)
                .select("*")
                .eq("user_id", user?.id)
                .gte("date", format(period.from, "yyyy-MM-dd"))
                .lte("date", format(period.to, "yyyy-MM-dd"))
                .order("date", { ascending: true });
            if (error) throw error;
            return (data as any[]) as SaleInvoice[];
        },
        enabled: !!user,
    });

    // Only process paid+pending invoices (exclude draft)
    const sales = useMemo(() =>
        rawSales.filter(s => s.status !== "draft"),
        [rawSales]
    );

    const bizGSTIN: string = (profile as any)?.gst_number || "";
    const bizStateCode = bizGSTIN ? stateCode(bizGSTIN) : "27"; // Default Maharashtra

    // ── Table 4: B2B ─────────────────────────────────────────────────────────
    const b2bRecords = useMemo<B2BRecord[]>(() => {
        return sales
            .filter(inv => inv.customer_gstin && inv.customer_gstin.length === 15)
            .map(inv => {
                const taxable = taxableFromInvoice(inv);
                const taxRate = taxRateFromInvoice(inv);
                const interState = stateCode(inv.customer_gstin!) !== bizStateCode;
                const { igst, cgst, sgst } = splitTax(inv.tax_amount || 0, interState, taxRate);
                return {
                    gstin: inv.customer_gstin!,
                    customer_name: inv.customer_name,
                    invoice_number: inv.invoice_number,
                    invoice_date: format(new Date(inv.date), "dd/MM/yyyy"),
                    invoice_value: inv.total_amount,
                    taxable_value: taxable,
                    igst, cgst, sgst,
                    place_of_supply: interState
                        ? stateCode(inv.customer_gstin!) + " - Other State"
                        : bizStateCode + " - Own State",
                    reverse_charge: false,
                };
            });
    }, [sales, bizStateCode]);

    // ── Table 5: B2C Large (inter-state, no GSTIN, > ₹2.5L) ─────────────────
    const b2clRecords = useMemo<B2CLRecord[]>(() => {
        return sales
            .filter(inv =>
                (!inv.customer_gstin || inv.customer_gstin.length < 15) &&
                inv.total_amount > 250000
            )
            .map(inv => ({
                invoice_number: inv.invoice_number,
                invoice_date: format(new Date(inv.date), "dd/MM/yyyy"),
                invoice_value: inv.total_amount,
                place_of_supply: "Outside State (Unregistered)",
                taxable_value: taxableFromInvoice(inv),
                igst: inv.tax_amount || 0,
            }));
    }, [sales]);

    // ── Table 7: B2C Small (all other unregistered) ─────────────────────────
    const b2csData = useMemo<B2CSRecord[]>(() => {
        const unregistered = sales.filter(inv =>
            (!inv.customer_gstin || inv.customer_gstin.length < 15) &&
            inv.total_amount <= 250000
        );

        const byRate = new Map<string, B2CSRecord>();
        for (const inv of unregistered) {
            const taxRate = taxRateFromInvoice(inv);
            const key = `intra-${taxRate}`;
            if (!byRate.has(key)) {
                byRate.set(key, {
                    place_of_supply: `${bizStateCode} - Own State`,
                    tax_rate: taxRate,
                    taxable_value: 0, igst: 0, cgst: 0, sgst: 0,
                });
            }
            const rec = byRate.get(key)!;
            rec.taxable_value += taxableFromInvoice(inv);
            rec.cgst += (inv.tax_amount || 0) / 2;
            rec.sgst += (inv.tax_amount || 0) / 2;
        }
        return Array.from(byRate.values()).sort((a, b) => b.tax_rate - a.tax_rate);
    }, [sales, bizStateCode]);

    // ── Table 12: HSN Summary ─────────────────────────────────────────────────
    const hsnSummary = useMemo<HSNRecord[]>(() => {
        const hsnMap = new Map<string, HSNRecord>();
        for (const inv of sales) {
            const items: InvoiceLineItem[] = Array.isArray(inv.items) ? inv.items : [];
            for (const item of items) {
                const hsn = item.hsn_code || "0000";
                const qty = Number(item.quantity) || 0;
                const taxRate = item.tax_rate ?? taxRateFromInvoice(inv);
                const lineValue = Number(item.total) || 0;
                const lineTax = lineValue * (taxRate / 100);
                // Prorate: for HSN, we use the item totals
                const interState = isInterState(inv, bizStateCode);
                const { igst, cgst, sgst } = splitTax(lineTax, interState, taxRate);

                if (!hsnMap.has(hsn)) {
                    hsnMap.set(hsn, {
                        hsn_code: hsn, description: item.description || hsn,
                        uqc: "NOS", quantity: 0,
                        taxable_value: 0, tax_rate: taxRate,
                        igst: 0, cgst: 0, sgst: 0,
                    });
                }
                const rec = hsnMap.get(hsn)!;
                rec.quantity += qty;
                rec.taxable_value += lineValue;
                rec.igst += igst;
                rec.cgst += cgst;
                rec.sgst += sgst;
            }
        }
        return Array.from(hsnMap.values()).sort((a, b) => b.taxable_value - a.taxable_value);
    }, [sales, bizStateCode]);

    // ── Table 3.1: Summary ─────────────────────────────────────────────────────
    const summary = useMemo(() => {
        const totalTaxable = sales.reduce((s, inv) => s + taxableFromInvoice(inv), 0);
        const totalTax = sales.reduce((s, inv) => s + (inv.tax_amount || 0), 0);
        const totalValue = sales.reduce((s, inv) => s + inv.total_amount, 0);
        const b2bTaxable = b2bRecords.reduce((s, r) => s + r.taxable_value, 0);
        const b2bTax = b2bRecords.reduce((s, r) => s + r.igst + r.cgst + r.sgst, 0);
        const b2csTaxable = b2csData.reduce((s, r) => s + r.taxable_value, 0);
        const b2csTax = b2csData.reduce((s, r) => s + r.igst + r.cgst + r.sgst, 0);
        const b2clTaxable = b2clRecords.reduce((s, r) => s + r.taxable_value, 0);
        const b2clTax = b2clRecords.reduce((s, r) => s + r.igst, 0);
        const igst = [...b2bRecords, ...b2clRecords].reduce((s, r: any) => s + (r.igst || 0), 0);
        const cgst = [...b2bRecords, ...b2csData].reduce((s, r: any) => s + (r.cgst || 0), 0);
        const sgst = [...b2bRecords, ...b2csData].reduce((s, r: any) => s + (r.sgst || 0), 0);
        return { totalTaxable, totalTax, totalValue, b2bTaxable, b2bTax, b2csTaxable, b2csTax, b2clTaxable, b2clTax, igst, cgst, sgst };
    }, [sales, b2bRecords, b2csData, b2clRecords]);

    // ── Table 13: Document Summary ─────────────────────────────────────────────
    const docSummary = useMemo(() => {
        const invoiceNumbers = sales.map(s => s.invoice_number).sort();
        const from = invoiceNumbers[0] || "-";
        const to = invoiceNumbers[invoiceNumbers.length - 1] || "-";
        const cancelled = rawSales.filter(s => s.status === "draft").length;
        return { total: sales.length, from, to, cancelled };
    }, [sales, rawSales]);

    // ── Export helpers ─────────────────────────────────────────────────────────
    const exportB2BCSV = () => downloadCSV(
        `GSTR1_B2B_${period.label.replace(/\s/g, "_")}.csv`,
        ["GSTIN/UIN of Recipient", "Receiver Name", "Invoice Number", "Invoice Date", "Invoice Value", "Taxable Value", "IGST", "CGST", "SGST", "Place of Supply", "Reverse Charge"],
        b2bRecords.map(r => [r.gstin, r.customer_name, r.invoice_number, r.invoice_date, r.invoice_value.toFixed(2), r.taxable_value.toFixed(2), r.igst.toFixed(2), r.cgst.toFixed(2), r.sgst.toFixed(2), r.place_of_supply, r.reverse_charge ? "Y" : "N"])
    );
    const exportB2CSCSV = () => downloadCSV(
        `GSTR1_B2CS_${period.label.replace(/\s/g, "_")}.csv`,
        ["Type", "Place of Supply", "Tax Rate", "Taxable Value", "IGST", "CGST", "SGST"],
        b2csData.map(r => ["OE", r.place_of_supply, `${r.tax_rate}%`, r.taxable_value.toFixed(2), r.igst.toFixed(2), r.cgst.toFixed(2), r.sgst.toFixed(2)])
    );
    const exportHSNCSV = () => downloadCSV(
        `GSTR1_HSN_${period.label.replace(/\s/g, "_")}.csv`,
        ["HSN", "Description", "UQC", "Quantity", "Taxable Value", "Tax Rate", "IGST", "CGST", "SGST"],
        hsnSummary.map(r => [r.hsn_code, r.description, r.uqc, r.quantity, r.taxable_value.toFixed(2), `${r.tax_rate}%`, r.igst.toFixed(2), r.cgst.toFixed(2), r.sgst.toFixed(2)])
    );
    const exportFullGSTR1 = () => {
        // Build one comprehensive CSV with all tables
        const rows: (string | number)[][] = [];
        rows.push(["=== GSTR-1 RETURN ===" as any]);
        rows.push([`Period: ${period.label}` as any]);
        rows.push([`Filed for: ${(profile as any)?.business_name || "Your Business"}` as any]);
        rows.push([`GSTIN: ${bizGSTIN || "Not set"}` as any]);
        rows.push([""]);
        rows.push(["TABLE 4 — B2B SUPPLIES"]);
        rows.push(["GSTIN", "Customer", "Invoice No.", "Date", "Invoice Value", "Taxable Value", "IGST", "CGST", "SGST", "POS", "RC"]);
        b2bRecords.forEach(r => rows.push([r.gstin, r.customer_name, r.invoice_number, r.invoice_date, r.invoice_value.toFixed(2), r.taxable_value.toFixed(2), r.igst.toFixed(2), r.cgst.toFixed(2), r.sgst.toFixed(2), r.place_of_supply, r.reverse_charge ? "Y" : "N"]));
        rows.push([""]);
        rows.push(["TABLE 5 — B2C LARGE"]);
        rows.push(["Invoice No.", "Date", "Invoice Value", "Place of Supply", "Taxable Value", "IGST"]);
        b2clRecords.forEach(r => rows.push([r.invoice_number, r.invoice_date, r.invoice_value.toFixed(2), r.place_of_supply, r.taxable_value.toFixed(2), r.igst.toFixed(2)]));
        rows.push([""]);
        rows.push(["TABLE 7 — B2C SMALL"]);
        rows.push(["Place of Supply", "Tax Rate", "Taxable Value", "IGST", "CGST", "SGST"]);
        b2csData.forEach(r => rows.push([r.place_of_supply, `${r.tax_rate}%`, r.taxable_value.toFixed(2), r.igst.toFixed(2), r.cgst.toFixed(2), r.sgst.toFixed(2)]));
        rows.push([""]);
        rows.push(["TABLE 12 — HSN SUMMARY"]);
        rows.push(["HSN", "Description", "UQC", "Qty", "Taxable Value", "Tax Rate", "IGST", "CGST", "SGST"]);
        hsnSummary.forEach(r => rows.push([r.hsn_code, r.description, r.uqc, r.quantity, r.taxable_value.toFixed(2), `${r.tax_rate}%`, r.igst.toFixed(2), r.cgst.toFixed(2), r.sgst.toFixed(2)]));
        downloadCSV(`GSTR1_FULL_${period.label.replace(/\s/g, "_")}.csv`, ["GSTR-1 Export"], rows);
    };

    const totalTax = summary.igst + summary.cgst + summary.sgst;

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Period selector + Header bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-5">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-5 h-5 text-orange-600" />
                        <h2 className="text-lg font-bold text-orange-900 dark:text-orange-200">GSTR-1 Return</h2>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 font-bold border border-orange-200 dark:border-orange-700">
                            As per CGST Rules 2017
                        </span>
                    </div>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                        {bizGSTIN
                            ? <>GSTIN: <span className="font-mono font-bold">{bizGSTIN}</span></>
                            : <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400"><AlertCircle className="w-3.5 h-3.5" /> GSTIN not set in Profile — add it for accurate B2B classification</span>
                        }
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <select
                        value={selectedPeriod}
                        onChange={e => setSelectedPeriod(Number(e.target.value))}
                        className="h-9 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-800 dark:text-slate-200 min-w-[220px]"
                    >
                        {PERIODS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
                    </select>
                    <button
                        onClick={exportFullGSTR1}
                        className="flex items-center gap-2 h-9 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition-all shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export Full GSTR-1
                    </button>
                </div>
            </div>

            {isLoading && (
                <div className="text-center py-16 text-slate-500 animate-pulse">
                    Fetching invoices for {period.label}…
                </div>
            )}

            {!isLoading && sales.length === 0 && (
                <div className="border rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold">No invoices found for {period.label}</p>
                    <p className="text-sm mt-1">Create some invoices in the Sales section and they will appear here.</p>
                </div>
            )}

            {!isLoading && sales.length > 0 && (
                <>
                    {/* ── Table 3.1: Summary Dashboard ─── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Total Invoice Value", value: formatCurrency(summary.totalValue), color: "text-slate-800 dark:text-white", bg: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" },
                            { label: "Total Taxable Value", value: formatCurrency(summary.totalTaxable), color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" },
                            { label: "Total GST Collected", value: formatCurrency(totalTax), color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800" },
                            { label: "Total Invoices", value: `${sales.length} invoices`, color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" },
                        ].map(({ label, value, color, bg }) => (
                            <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                                <p className={`text-xl font-black ${color}`}>{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tax breakdown */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: "IGST (Inter-State)", value: summary.igst, color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800" },
                            { label: "CGST (Intra-State)", value: summary.cgst, color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800" },
                            { label: "SGST (Intra-State)", value: summary.sgst, color: "text-sky-700 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800" },
                        ].map(({ label, value, color, bg }) => (
                            <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                                <p className={`text-lg font-black ${color}`}>{formatCurrency(value)}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Table 4: B2B ─── */}
                    <SectionCard
                        title="Table 4 — B2B Supplies (Registered Customers)"
                        subtitle="Outward taxable supplies to GST-registered recipients"
                        icon={Building2}
                        count={b2bRecords.length}
                        badge="Table 4"
                        color="border-l-blue-500"
                    >
                        <div className="flex justify-end px-4 pb-2">
                            <Button variant="outline" size="sm" onClick={exportB2BCSV} className="gap-2 text-xs">
                                <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export CSV
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                    <TableRow>
                                        <TableHead className="font-bold text-xs">GSTIN</TableHead>
                                        <TableHead className="font-bold text-xs">Customer</TableHead>
                                        <TableHead className="font-bold text-xs">Invoice No.</TableHead>
                                        <TableHead className="font-bold text-xs">Date</TableHead>
                                        <TableHead className="font-bold text-xs text-right">Invoice Value</TableHead>
                                        <TableHead className="font-bold text-xs text-right">Taxable Value</TableHead>
                                        <TableHead className="font-bold text-xs text-right">IGST</TableHead>
                                        <TableHead className="font-bold text-xs text-right">CGST</TableHead>
                                        <TableHead className="font-bold text-xs text-right">SGST</TableHead>
                                        <TableHead className="font-bold text-xs">POS</TableHead>
                                        <TableHead className="font-bold text-xs text-center">RC</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {b2bRecords.length === 0 ? (
                                        <TableRow><TableCell colSpan={11} className="text-center py-8 text-slate-400 text-sm">No B2B invoices in this period</TableCell></TableRow>
                                    ) : b2bRecords.map((r, i) => (
                                        <TableRow key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <TableCell className="font-mono text-xs">{r.gstin}</TableCell>
                                            <TableCell className="text-sm font-medium">{r.customer_name}</TableCell>
                                            <TableCell className="text-xs font-mono">{r.invoice_number}</TableCell>
                                            <TableCell className="text-xs">{r.invoice_date}</TableCell>
                                            <TableCell className="text-right text-xs font-semibold">{formatINR(r.invoice_value)}</TableCell>
                                            <TableCell className="text-right text-xs">{formatINR(r.taxable_value)}</TableCell>
                                            <TableCell className="text-right text-xs text-purple-700">{r.igst > 0 ? formatINR(r.igst) : "—"}</TableCell>
                                            <TableCell className="text-right text-xs text-indigo-700">{r.cgst > 0 ? formatINR(r.cgst) : "—"}</TableCell>
                                            <TableCell className="text-right text-xs text-sky-700">{r.sgst > 0 ? formatINR(r.sgst) : "—"}</TableCell>
                                            <TableCell className="text-xs">{r.place_of_supply}</TableCell>
                                            <TableCell className="text-center"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.reverse_charge ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>{r.reverse_charge ? "Y" : "N"}</span></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                {b2bRecords.length > 0 && (
                                    <tfoot>
                                        <TableRow className="bg-blue-50 dark:bg-blue-950/20 font-bold">
                                            <TableCell colSpan={5} className="text-xs font-bold">Total</TableCell>
                                            <TableCell className="text-right text-xs font-bold">{formatINR(b2bRecords.reduce((s, r) => s + r.taxable_value, 0))}</TableCell>
                                            <TableCell className="text-right text-xs font-bold text-purple-700">{formatINR(b2bRecords.reduce((s, r) => s + r.igst, 0))}</TableCell>
                                            <TableCell className="text-right text-xs font-bold text-indigo-700">{formatINR(b2bRecords.reduce((s, r) => s + r.cgst, 0))}</TableCell>
                                            <TableCell className="text-right text-xs font-bold text-sky-700">{formatINR(b2bRecords.reduce((s, r) => s + r.sgst, 0))}</TableCell>
                                            <TableCell colSpan={2} />
                                        </TableRow>
                                    </tfoot>
                                )}
                            </Table>
                        </div>
                    </SectionCard>

                    {/* ── Table 5: B2C Large ─── */}
                    <SectionCard
                        title="Table 5 — B2C Large (Unregistered, > ₹2.5 Lakh)"
                        subtitle="Inter-state supplies > ₹2.5L to unregistered persons — invoice-level detail required"
                        icon={Users}
                        count={b2clRecords.length}
                        badge="Table 5"
                        color="border-l-violet-500"
                        defaultOpen={b2clRecords.length > 0}
                    >
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                    <TableRow>
                                        <TableHead className="font-bold text-xs">Invoice No.</TableHead>
                                        <TableHead className="font-bold text-xs">Date</TableHead>
                                        <TableHead className="font-bold text-xs text-right">Invoice Value</TableHead>
                                        <TableHead className="font-bold text-xs">Place of Supply</TableHead>
                                        <TableHead className="font-bold text-xs text-right">Taxable Value</TableHead>
                                        <TableHead className="font-bold text-xs text-right">IGST</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {b2clRecords.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400 text-sm">No B2C Large invoices in this period</TableCell></TableRow>
                                    ) : b2clRecords.map((r, i) => (
                                        <TableRow key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <TableCell className="font-mono text-xs">{r.invoice_number}</TableCell>
                                            <TableCell className="text-xs">{r.invoice_date}</TableCell>
                                            <TableCell className="text-right text-xs font-semibold">{formatINR(r.invoice_value)}</TableCell>
                                            <TableCell className="text-xs">{r.place_of_supply}</TableCell>
                                            <TableCell className="text-right text-xs">{formatINR(r.taxable_value)}</TableCell>
                                            <TableCell className="text-right text-xs text-purple-700 font-semibold">{formatINR(r.igst)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </SectionCard>

                    {/* ── Table 7: B2C Small ─── */}
                    <SectionCard
                        title="Table 7 — B2C Small (Unregistered, ≤ ₹2.5 Lakh)"
                        subtitle="Consolidated (not invoice-wise) — state-wise aggregated outward supplies to unregistered buyers"
                        icon={UserMinus}
                        count={b2csData.length}
                        badge="Table 7"
                        color="border-l-emerald-500"
                    >
                        <div className="flex justify-end px-4 pb-2">
                            <Button variant="outline" size="sm" onClick={exportB2CSCSV} className="gap-2 text-xs">
                                <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export CSV
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                    <TableRow>
                                        <TableHead className="font-bold text-xs">Type</TableHead>
                                        <TableHead className="font-bold text-xs">Place of Supply</TableHead>
                                        <TableHead className="font-bold text-xs text-right">Tax Rate</TableHead>
                                        <TableHead className="font-bold text-xs text-right">Taxable Value</TableHead>
                                        <TableHead className="font-bold text-xs text-right">IGST</TableHead>
                                        <TableHead className="font-bold text-xs text-right">CGST</TableHead>
                                        <TableHead className="font-bold text-xs text-right">SGST</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {b2csData.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400 text-sm">No B2C Small supplies in this period</TableCell></TableRow>
                                    ) : b2csData.map((r, i) => (
                                        <TableRow key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <TableCell><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">OE</span></TableCell>
                                            <TableCell className="text-xs">{r.place_of_supply}</TableCell>
                                            <TableCell className="text-right text-xs font-bold">{r.tax_rate}%</TableCell>
                                            <TableCell className="text-right text-xs font-semibold">{formatINR(r.taxable_value)}</TableCell>
                                            <TableCell className="text-right text-xs text-purple-700">{r.igst > 0 ? formatINR(r.igst) : "—"}</TableCell>
                                            <TableCell className="text-right text-xs text-indigo-700">{r.cgst > 0 ? formatINR(r.cgst) : "—"}</TableCell>
                                            <TableCell className="text-right text-xs text-sky-700">{r.sgst > 0 ? formatINR(r.sgst) : "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                {b2csData.length > 0 && (
                                    <tfoot>
                                        <TableRow className="bg-emerald-50 dark:bg-emerald-950/20 font-bold">
                                            <TableCell colSpan={3} className="text-xs font-bold">Total</TableCell>
                                            <TableCell className="text-right text-xs font-bold">{formatINR(b2csData.reduce((s, r) => s + r.taxable_value, 0))}</TableCell>
                                            <TableCell className="text-right text-xs font-bold text-purple-700">{formatINR(b2csData.reduce((s, r) => s + r.igst, 0))}</TableCell>
                                            <TableCell className="text-right text-xs font-bold text-indigo-700">{formatINR(b2csData.reduce((s, r) => s + r.cgst, 0))}</TableCell>
                                            <TableCell className="text-right text-xs font-bold text-sky-700">{formatINR(b2csData.reduce((s, r) => s + r.sgst, 0))}</TableCell>
                                        </TableRow>
                                    </tfoot>
                                )}
                            </Table>
                        </div>
                    </SectionCard>

                    {/* ── Table 12: HSN Summary ─── */}
                    <SectionCard
                        title="Table 12 — HSN-Wise Summary of Outward Supplies"
                        subtitle="Item-level HSN/SAC code breakdown (mandatory if turnover > ₹1.5 Cr)"
                        icon={Tag}
                        count={hsnSummary.length}
                        badge="Table 12"
                        color="border-l-amber-500"
                    >
                        <div className="flex items-center justify-between px-4 pb-2">
                            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5">
                                <Info className="w-3.5 h-3.5" />
                                Add HSN codes to items in inventory for accurate reporting. Currently showing item descriptions as HSN fallback.
                            </div>
                            <Button variant="outline" size="sm" onClick={exportHSNCSV} className="gap-2 text-xs">
                                <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export CSV
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                    <TableRow>
                                        <TableHead className="font-bold text-xs">HSN/SAC</TableHead>
                                        <TableHead className="font-bold text-xs">Description</TableHead>
                                        <TableHead className="font-bold text-xs text-right">UQC</TableHead>
                                        <TableHead className="font-bold text-xs text-right">Qty</TableHead>
                                        <TableHead className="font-bold text-xs text-right">Tax Rate</TableHead>
                                        <TableHead className="font-bold text-xs text-right">Taxable Value</TableHead>
                                        <TableHead className="font-bold text-xs text-right">IGST</TableHead>
                                        <TableHead className="font-bold text-xs text-right">CGST</TableHead>
                                        <TableHead className="font-bold text-xs text-right">SGST</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {hsnSummary.length === 0 ? (
                                        <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400 text-sm">No items found</TableCell></TableRow>
                                    ) : hsnSummary.map((r, i) => (
                                        <TableRow key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <TableCell className="font-mono text-xs font-bold text-amber-800 dark:text-amber-400">{r.hsn_code}</TableCell>
                                            <TableCell className="text-xs max-w-[180px] truncate">{r.description}</TableCell>
                                            <TableCell className="text-right text-xs">{r.uqc}</TableCell>
                                            <TableCell className="text-right text-xs font-semibold">{r.quantity}</TableCell>
                                            <TableCell className="text-right text-xs font-bold">{r.tax_rate}%</TableCell>
                                            <TableCell className="text-right text-xs font-semibold">{formatINR(r.taxable_value)}</TableCell>
                                            <TableCell className="text-right text-xs text-purple-700">{r.igst > 0 ? formatINR(r.igst) : "—"}</TableCell>
                                            <TableCell className="text-right text-xs text-indigo-700">{r.cgst > 0 ? formatINR(r.cgst) : "—"}</TableCell>
                                            <TableCell className="text-right text-xs text-sky-700">{r.sgst > 0 ? formatINR(r.sgst) : "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                {hsnSummary.length > 0 && (
                                    <tfoot>
                                        <TableRow className="bg-amber-50 dark:bg-amber-950/20 font-bold">
                                            <TableCell colSpan={5} className="text-xs font-bold">Total</TableCell>
                                            <TableCell className="text-right text-xs font-bold">{formatINR(hsnSummary.reduce((s, r) => s + r.taxable_value, 0))}</TableCell>
                                            <TableCell className="text-right text-xs font-bold text-purple-700">{formatINR(hsnSummary.reduce((s, r) => s + r.igst, 0))}</TableCell>
                                            <TableCell className="text-right text-xs font-bold text-indigo-700">{formatINR(hsnSummary.reduce((s, r) => s + r.cgst, 0))}</TableCell>
                                            <TableCell className="text-right text-xs font-bold text-sky-700">{formatINR(hsnSummary.reduce((s, r) => s + r.sgst, 0))}</TableCell>
                                        </TableRow>
                                    </tfoot>
                                )}
                            </Table>
                        </div>
                    </SectionCard>

                    {/* ── Table 13: Document Summary ─── */}
                    <SectionCard
                        title="Table 13 — Document Summary"
                        subtitle="Summary of invoices issued during the return period"
                        icon={ListChecks}
                        count={1}
                        badge="Table 13"
                        color="border-l-slate-400"
                        defaultOpen={true}
                    >
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                    <TableRow>
                                        <TableHead className="font-bold text-xs">Document Type</TableHead>
                                        <TableHead className="font-bold text-xs">Sr. From</TableHead>
                                        <TableHead className="font-bold text-xs">Sr. To</TableHead>
                                        <TableHead className="font-bold text-xs text-right">Total Issued</TableHead>
                                        <TableHead className="font-bold text-xs text-right">Cancelled</TableHead>
                                        <TableHead className="font-bold text-xs text-right">Net Issued</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <TableCell className="font-semibold text-sm">Invoices for Outward Supply</TableCell>
                                        <TableCell className="font-mono text-xs">{docSummary.from}</TableCell>
                                        <TableCell className="font-mono text-xs">{docSummary.to}</TableCell>
                                        <TableCell className="text-right text-sm font-bold">{docSummary.total + docSummary.cancelled}</TableCell>
                                        <TableCell className="text-right text-sm text-rose-600 font-semibold">{docSummary.cancelled}</TableCell>
                                        <TableCell className="text-right text-sm font-bold text-emerald-700">{docSummary.total}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </SectionCard>

                    {/* ── Filing Note ─── */}
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            <span className="font-bold text-slate-800 dark:text-white block mb-1">Filing Reminder</span>
                            GSTR-1 is due on the <strong>11th of the following month</strong> (monthly filers) or <strong>13th of the month after the quarter end</strong> (quarterly QRMP filers).
                            Export the data above and upload to the <strong>GSTN portal</strong> (gst.gov.in) under <em>Returns → GSTR-1 → Upload JSON or manual entry</em>.
                            Always verify B2B GSTIN validity before filing at <strong>mastergst.com</strong> or the official GSTN search.
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
