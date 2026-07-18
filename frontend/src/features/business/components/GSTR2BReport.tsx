import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    FileText, ShieldCheck, Download, ChevronDown, ChevronUp, AlertCircle
} from "lucide-react";

interface B2BPurchaseRecord {
    gstin: string;
    vendor_name: string;
    invoice_number: string;
    invoice_date: string;
    invoice_value: number;
    taxable_value: number;
    igst: number;
    cgst: number;
    sgst: number;
    place_of_supply: string;
}

const now = new Date(2026, 2, 21); // March 2026
const PERIODS = [
    { label: "March 2026 (Current)", from: startOfMonth(now), to: endOfMonth(now) },
    { label: "February 2026", from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) },
    { label: "January 2026", from: startOfMonth(subMonths(now, 2)), to: endOfMonth(subMonths(now, 2)) },
    { label: "December 2025", from: startOfMonth(subMonths(now, 3)), to: endOfMonth(subMonths(now, 3)) },
];

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

const SectionCard = ({ title, subtitle, icon: Icon, count, color, children }: any) => {
    const [open, setOpen] = useState(true);
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
                        <Badge variant="secondary" className="font-semibold">{count} record{count !== 1 ? "s" : ""}</Badge>
                        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                </div>
            </CardHeader>
            {open && <CardContent className="p-0 pb-2">{children}</CardContent>}
        </Card>
    );
};

export const GSTR2BReport = () => {
    const { user } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState(0);
    const period = PERIODS[selectedPeriod];

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any).from("profiles").select("*").eq("user_id", user?.id || "").single();
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    const bizGSTIN = profile?.gst_number || "";
    const bizStateCode = bizGSTIN ? bizGSTIN.substring(0, 2) : "";

    const { data: gstr2bData, isLoading } = useQuery({
        queryKey: ["gstr2b-data", user?.id, period.from.toISOString(), period.to.toISOString(), bizStateCode],
        queryFn: async () => {
            const { data, error } = await (supabase as any).rpc("generate_gstr2b_data", {
                p_user_id: user?.id,
                p_start_date: format(period.from, "yyyy-MM-dd"),
                p_end_date: format(period.to, "yyyy-MM-dd"),
                p_biz_state_code: bizStateCode
            });
            if (error) throw error;
            return data;
        },
        enabled: !!user && !!bizStateCode,
    });

    const b2bRecords: B2BPurchaseRecord[] = gstr2bData?.b2b || [];
    const summary = gstr2bData?.summary || { total_taxable: 0, total_igst: 0, total_cgst: 0, total_sgst: 0 };

    const exportCSV = () => downloadCSV(
        `GSTR2B_ITC_${period.label.replace(/\s/g, "_")}.csv`,
        ["Vendor GSTIN", "Vendor Name", "Bill No.", "Date", "Bill Value", "Taxable Value", "IGST", "CGST", "SGST", "POS"],
        b2bRecords.map(r => [r.gstin, r.vendor_name, r.invoice_number, r.invoice_date, r.invoice_value.toFixed(2), r.taxable_value.toFixed(2), r.igst.toFixed(2), r.cgst.toFixed(2), r.sgst.toFixed(2), r.place_of_supply])
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-bold text-blue-900 dark:text-blue-200">GSTR-2B (ITC Available)</h2>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        {bizGSTIN
                            ? <>GSTIN: <span className="font-mono font-bold">{bizGSTIN}</span></>
                            : <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400"><AlertCircle className="w-3.5 h-3.5" /> GSTIN not set in Profile</span>
                        }
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 h-9 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                    <select
                        value={selectedPeriod}
                        onChange={e => setSelectedPeriod(Number(e.target.value))}
                        className="h-9 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 dark:text-slate-200 min-w-[220px]"
                    >
                        {PERIODS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="bg-slate-50 dark:bg-slate-900/50 shadow-none border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                        <div className="text-xs text-slate-500 mb-1 font-semibold uppercase">Eligible ITC (Value)</div>
                        <div className="text-2xl font-bold">{formatINR(summary.total_taxable || 0)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 dark:bg-slate-900/50 shadow-none border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                        <div className="text-xs text-slate-500 mb-1 font-semibold uppercase">Total IGST</div>
                        <div className="text-2xl font-bold">{formatINR(summary.total_igst || 0)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 dark:bg-slate-900/50 shadow-none border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                        <div className="text-xs text-slate-500 mb-1 font-semibold uppercase">Total CGST</div>
                        <div className="text-2xl font-bold">{formatINR(summary.total_cgst || 0)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 dark:bg-slate-900/50 shadow-none border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                        <div className="text-xs text-slate-500 mb-1 font-semibold uppercase">Total SGST</div>
                        <div className="text-2xl font-bold">{formatINR(summary.total_sgst || 0)}</div>
                    </CardContent>
                </Card>
            </div>

            <SectionCard title="B2B Invoices (ITC Available)" subtitle="Purchases from registered vendors" icon={FileText} count={b2bRecords.length} color="border-l-blue-500">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                            <TableRow>
                                <TableHead>GSTIN of Supplier</TableHead>
                                <TableHead>Supplier Name</TableHead>
                                <TableHead>Bill No</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Taxable</TableHead>
                                <TableHead className="text-right text-purple-600 dark:text-purple-400">IGST</TableHead>
                                <TableHead className="text-right text-blue-600 dark:text-blue-400">CGST</TableHead>
                                <TableHead className="text-right text-blue-600 dark:text-blue-400">SGST</TableHead>
                                <TableHead className="text-center">POS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {b2bRecords.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                        No eligible ITC records found for this period. Ensure vendor GSTIN is provided on purchases.
                                    </TableCell>
                                </TableRow>
                            ) : b2bRecords.map((r, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-mono text-xs">{r.gstin}</TableCell>
                                    <TableCell className="font-medium">{r.vendor_name}</TableCell>
                                    <TableCell>{r.invoice_number}</TableCell>
                                    <TableCell>{format(new Date(r.invoice_date), "dd MMM yyyy")}</TableCell>
                                    <TableCell className="text-right">{formatINR(r.taxable_value)}</TableCell>
                                    <TableCell className="text-right font-medium text-purple-600 dark:text-purple-400">{r.igst > 0 ? formatINR(r.igst) : "-"}</TableCell>
                                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">{r.cgst > 0 ? formatINR(r.cgst) : "-"}</TableCell>
                                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">{r.sgst > 0 ? formatINR(r.sgst) : "-"}</TableCell>
                                    <TableCell className="text-center">{r.place_of_supply}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {b2bRecords.length > 0 && (
                    <div className="p-4 border-t flex justify-end">
                        <button onClick={exportCSV} className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                    </div>
                )}
            </SectionCard>
        </div>
    );
};
