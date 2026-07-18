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
import {
    ShieldCheck, AlertCircle, FileText, ChevronUp, ChevronDown, Download
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

const SectionCard = ({ title, subtitle, icon: Icon, color, children }: any) => {
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
                    <div>
                        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                </div>
            </CardHeader>
            {open && <CardContent className="p-4 pt-0">{children}</CardContent>}
        </Card>
    );
};

export const GSTR3BReport = () => {
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

    const { data: gstr3bData, isLoading } = useQuery({
        queryKey: ["gstr3b-data", user?.id, period.from.toISOString(), period.to.toISOString(), bizStateCode],
        queryFn: async () => {
            const { data, error } = await (supabase as any).rpc("generate_gstr3b_data", {
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

    const outward = gstr3bData?.outward || { total_taxable_value: 0, total_igst: 0, total_cgst: 0, total_sgst: 0 };
    const inward = gstr3bData?.inward || { total_taxable_value: 0, total_igst: 0, total_cgst: 0, total_sgst: 0 };

    const netIgst = Math.max(0, (outward.total_igst || 0) - (inward.total_igst || 0));
    const netCgst = Math.max(0, (outward.total_cgst || 0) - (inward.total_cgst || 0));
    const netSgst = Math.max(0, (outward.total_sgst || 0) - (inward.total_sgst || 0));
    
    // Note: This is a simplified ITC offset calculation. In reality, IGST ITC is used to offset IGST, then CGST, then SGST.
    // For this dashboard, we just show direct offset for simplicity.

    const exportCSV = () => downloadCSV(
        `GSTR3B_Summary_${period.label.replace(/\s/g, "_")}.csv`,
        ["Category", "Total Taxable Value", "Integrated Tax (IGST)", "Central Tax (CGST)", "State/UT Tax (SGST)"],
        [
            ["(a) Outward taxable supplies", outward.total_taxable_value.toFixed(2), outward.total_igst.toFixed(2), outward.total_cgst.toFixed(2), outward.total_sgst.toFixed(2)],
            ["(A) ITC Available (all other ITC)", inward.total_taxable_value.toFixed(2), inward.total_igst.toFixed(2), inward.total_cgst.toFixed(2), inward.total_sgst.toFixed(2)]
        ]
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/20 dark:to-fuchsia-950/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-5">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-5 h-5 text-violet-600" />
                        <h2 className="text-lg font-bold text-violet-900 dark:text-violet-200">GSTR-3B Return</h2>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 font-bold border border-violet-200 dark:border-violet-700">
                            Monthly Summary
                        </span>
                    </div>
                    <p className="text-sm text-violet-700 dark:text-violet-300">
                        {bizGSTIN
                            ? <>GSTIN: <span className="font-mono font-bold">{bizGSTIN}</span></>
                            : <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400"><AlertCircle className="w-3.5 h-3.5" /> GSTIN not set in Profile</span>
                        }
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 h-9 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                    <select
                        value={selectedPeriod}
                        onChange={e => setSelectedPeriod(Number(e.target.value))}
                        className="h-9 rounded-lg border border-violet-300 dark:border-violet-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-800 dark:text-slate-200 min-w-[220px]"
                    >
                        {PERIODS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
                    </select>
                </div>
            </div>

            <SectionCard title="3.1 Details of Outward Supplies" subtitle="Sales output tax liability" icon={FileText} color="border-l-orange-500">
                <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                        <TableRow>
                            <TableHead>Nature of Supplies</TableHead>
                            <TableHead className="text-right">Total Taxable Value</TableHead>
                            <TableHead className="text-right text-purple-600 dark:text-purple-400">Integrated Tax (IGST)</TableHead>
                            <TableHead className="text-right text-blue-600 dark:text-blue-400">Central Tax (CGST)</TableHead>
                            <TableHead className="text-right text-blue-600 dark:text-blue-400">State/UT Tax (SGST)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">(a) Outward taxable supplies</TableCell>
                            <TableCell className="text-right">{formatINR(outward.total_taxable_value || 0)}</TableCell>
                            <TableCell className="text-right font-medium text-purple-600 dark:text-purple-400">{formatINR(outward.total_igst || 0)}</TableCell>
                            <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">{formatINR(outward.total_cgst || 0)}</TableCell>
                            <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">{formatINR(outward.total_sgst || 0)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </SectionCard>

            <SectionCard title="4. Eligible ITC" subtitle="Input Tax Credit from purchases" icon={FileText} color="border-l-blue-500">
                <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                        <TableRow>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right text-purple-600 dark:text-purple-400">Integrated Tax (IGST)</TableHead>
                            <TableHead className="text-right text-blue-600 dark:text-blue-400">Central Tax (CGST)</TableHead>
                            <TableHead className="text-right text-blue-600 dark:text-blue-400">State/UT Tax (SGST)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">(A) ITC Available (All other ITC)</TableCell>
                            <TableCell className="text-right font-medium text-purple-600 dark:text-purple-400">{formatINR(inward.total_igst || 0)}</TableCell>
                            <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">{formatINR(inward.total_cgst || 0)}</TableCell>
                            <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">{formatINR(inward.total_sgst || 0)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </SectionCard>

            <SectionCard title="6.1 Payment of Tax" subtitle="Net tax liability after ITC offset" icon={FileText} color="border-l-green-500">
                <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                        <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right text-purple-600 dark:text-purple-400">IGST Payable</TableHead>
                            <TableHead className="text-right text-blue-600 dark:text-blue-400">CGST Payable</TableHead>
                            <TableHead className="text-right text-blue-600 dark:text-blue-400">SGST Payable</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">Total Tax Payable (Cash/Bank)</TableCell>
                            <TableCell className="text-right font-bold text-purple-700 dark:text-purple-400">{formatINR(netIgst)}</TableCell>
                            <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400">{formatINR(netCgst)}</TableCell>
                            <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400">{formatINR(netSgst)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </SectionCard>
        </div>
    );
};
