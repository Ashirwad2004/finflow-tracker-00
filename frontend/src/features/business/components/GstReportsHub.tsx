import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    ShieldCheck, Scale, ArrowUpRight, ArrowDownRight,
    Building2, CheckCircle2, RefreshCw, HelpCircle
} from "lucide-react";
import { GSTR1Report } from "./GSTR1Report";
import { GSTR2BReport } from "./GSTR2BReport";
import { GSTR3BReport } from "./GSTR3BReport";

export type GstViewPreference = 'gstr1' | 'gstr2b' | 'gstr3b' | 'reconciliation';

// Indian States with 2-digit GST codes
export const INDIAN_GST_STATES = [
    { code: "01", name: "Jammu & Kashmir" },
    { code: "02", name: "Himachal Pradesh" },
    { code: "03", name: "Punjab" },
    { code: "04", name: "Chandigarh" },
    { code: "05", name: "Uttarakhand" },
    { code: "06", name: "Haryana" },
    { code: "07", name: "Delhi" },
    { code: "08", name: "Rajasthan" },
    { code: "09", name: "Uttar Pradesh" },
    { code: "10", name: "Bihar" },
    { code: "19", name: "West Bengal" },
    { code: "20", name: "Jharkhand" },
    { code: "21", name: "Odisha" },
    { code: "22", name: "Chhattisgarh" },
    { code: "23", name: "Madhya Pradesh" },
    { code: "24", name: "Gujarat" },
    { code: "27", name: "Maharashtra" },
    { code: "29", name: "Karnataka" },
    { code: "30", name: "Goa" },
    { code: "32", name: "Kerala" },
    { code: "33", name: "Tamil Nadu" },
    { code: "36", name: "Telangana" },
    { code: "37", name: "Andhra Pradesh" },
];

export const getDynamicGstPeriods = (refDate: Date = new Date()) => {
    const m0 = refDate;
    const m1 = subMonths(refDate, 1);
    const m2 = subMonths(refDate, 2);
    const m3 = subMonths(refDate, 3);

    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const fyStartYear = month >= 3 ? year : year - 1;
    const fyEndYear = fyStartYear + 1;

    return [
        { label: `${format(m0, "MMMM yyyy")} (Current)`, from: startOfMonth(m0), to: endOfMonth(m0) },
        { label: format(m1, "MMMM yyyy"), from: startOfMonth(m1), to: endOfMonth(m1) },
        { label: format(m2, "MMMM yyyy"), from: startOfMonth(m2), to: endOfMonth(m2) },
        { label: format(m3, "MMMM yyyy"), from: startOfMonth(m3), to: endOfMonth(m3) },
        { 
            label: `Q2 FY ${fyStartYear}-${String(fyEndYear).slice(-2)} (Jul–Sep)`, 
            from: new Date(fyStartYear, 6, 1), 
            to: new Date(fyStartYear, 8, 30) 
        },
        { 
            label: `Q1 FY ${fyStartYear}-${String(fyEndYear).slice(-2)} (Apr–Jun)`, 
            from: new Date(fyStartYear, 3, 1), 
            to: new Date(fyStartYear, 5, 30) 
        },
        { 
            label: `Full FY ${fyStartYear}-${String(fyEndYear).slice(-2)}`, 
            from: new Date(fyStartYear, 3, 1), 
            to: new Date(fyEndYear, 2, 31) 
        },
        { 
            label: `Full FY ${fyStartYear - 1}-${String(fyStartYear).slice(-2)} (Previous)`, 
            from: new Date(fyStartYear - 1, 3, 1), 
            to: new Date(fyStartYear, 2, 31) 
        },
    ];
};

export const GstReportsHub = () => {
    const { user } = useAuth();
    const { formatCurrency } = useCurrency();

    // Customer preference: persisted in localStorage
    const [activeTab, setActiveTab] = useState<GstViewPreference>(() => {
        const saved = localStorage.getItem("rupeebill_gst_preference");
        if (saved === 'gstr1' || saved === 'gstr2b' || saved === 'gstr3b' || saved === 'reconciliation') {
            return saved;
        }
        return 'gstr1';
    });

    const handleTabChange = (tab: GstViewPreference) => {
        setActiveTab(tab);
        localStorage.setItem("rupeebill_gst_preference", tab);
    };

    const periods = useMemo(() => getDynamicGstPeriods(new Date()), []);
    const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
    const activePeriod = periods[selectedPeriodIndex] || periods[0];

    // Fetch Business Profile
    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("*")
                .eq("user_id", user?.id || "")
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    // Effective GSTIN & State Code with fallback
    const [fallbackStateCode, setFallbackStateCode] = useState<string>(() => {
        return localStorage.getItem("rupeebill_fallback_state_code") || "27";
    });

    const bizGSTIN = (profile?.gst_number || "").trim();
    const effectiveStateCode = bizGSTIN.length >= 2 ? bizGSTIN.slice(0, 2) : fallbackStateCode;

    const handleStateCodeChange = (code: string) => {
        setFallbackStateCode(code);
        localStorage.setItem("rupeebill_fallback_state_code", code);
    };

    // CA Reconciliation Data: Query sales and purchases for the period
    const { data: reconciliationData, isLoading: isReconLoading, refetch: refetchRecon } = useQuery({
        queryKey: ["gst-reconciliation", user?.id, activePeriod.from.toISOString(), activePeriod.to.toISOString(), effectiveStateCode],
        queryFn: async () => {
            const startDateStr = format(activePeriod.from, "yyyy-MM-dd");
            const endDateStr = format(activePeriod.to, "yyyy-MM-dd");

            // Fetch Sales
            const { data: salesData } = await (supabase as any)
                .from("sales")
                .select("id, total_amount, subtotal, tax_amount, customer_gstin, place_of_supply, status, date")
                .eq("user_id", user?.id || "")
                .gte("date", startDateStr)
                .lte("date", endDateStr)
                .neq("status", "draft");

            // Fetch Purchases
            const { data: purchasesData } = await (supabase as any)
                .from("purchases")
                .select("id, total_amount, subtotal, tax_amount, vendor_gstin, place_of_supply, date")
                .eq("user_id", user?.id || "")
                .gte("date", startDateStr)
                .lte("date", endDateStr);

            const sales = salesData || [];
            const purchases = purchasesData || [];

            // Calculate Outward Tax (GSTR-1 / Output Liability)
            let outwardTaxable = 0;
            let outputIgst = 0;
            let outputCgst = 0;
            let outputSgst = 0;

            sales.forEach((s: any) => {
                const tax = Number(s.tax_amount) || 0;
                const taxable = Number(s.subtotal) || (Number(s.total_amount) || 0) - tax;
                outwardTaxable += taxable;

                const pos = s.place_of_supply || (s.customer_gstin ? s.customer_gstin.slice(0, 2) : effectiveStateCode);
                const isInter = pos !== effectiveStateCode;

                if (isInter) {
                    outputIgst += tax;
                } else {
                    outputCgst += tax / 2;
                    outputSgst += tax / 2;
                }
            });

            // Calculate Inward Tax Credit (GSTR-2B / Eligible ITC)
            let inwardTaxable = 0;
            let itcIgst = 0;
            let itcCgst = 0;
            let itcSgst = 0;

            purchases.forEach((p: any) => {
                const tax = Number(p.tax_amount) || 0;
                const taxable = Number(p.subtotal) || (Number(p.total_amount) || 0) - tax;
                inwardTaxable += taxable;

                const isRegistered = p.vendor_gstin && p.vendor_gstin.trim().length === 15;
                if (isRegistered || tax > 0) {
                    const pos = p.place_of_supply || (p.vendor_gstin ? p.vendor_gstin.slice(0, 2) : effectiveStateCode);
                    const isInter = pos !== effectiveStateCode;
                    if (isInter) {
                        itcIgst += tax;
                    } else {
                        itcCgst += tax / 2;
                        itcSgst += tax / 2;
                    }
                }
            });

            // Net Payable or Credit (GSTR-3B summary)
            const netIgst = outputIgst - itcIgst;
            const netCgst = outputCgst - itcCgst;
            const netSgst = outputSgst - itcSgst;
            const totalOutput = outputIgst + outputCgst + outputSgst;
            const totalItc = itcIgst + itcCgst + itcSgst;
            const netTotalPayable = Math.max(0, totalOutput - totalItc);
            const netCreditCarryForward = Math.max(0, totalItc - totalOutput);

            return {
                salesCount: sales.length,
                purchasesCount: purchases.length,
                outwardTaxable,
                inwardTaxable,
                output: { igst: outputIgst, cgst: outputCgst, sgst: outputSgst, total: totalOutput },
                itc: { igst: itcIgst, cgst: itcCgst, sgst: itcSgst, total: totalItc },
                net: { igst: netIgst, cgst: netCgst, sgst: netSgst, payable: netTotalPayable, credit: netCreditCarryForward }
            };
        },
        enabled: !!user
    });

    const recon = reconciliationData || {
        salesCount: 0,
        purchasesCount: 0,
        outwardTaxable: 0,
        inwardTaxable: 0,
        output: { igst: 0, cgst: 0, sgst: 0, total: 0 },
        itc: { igst: 0, cgst: 0, sgst: 0, total: 0 },
        net: { igst: 0, cgst: 0, sgst: 0, payable: 0, credit: 0 }
    };

    return (
        <div className="space-y-6">
            {/* Clean Segmented GST Switcher Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-xl p-2 shadow-xs">
                {/* Segmented Control for Returns */}
                <div className="bg-muted/70 p-1 rounded-lg border flex flex-wrap sm:flex-nowrap gap-1">
                    <button
                        type="button"
                        onClick={() => handleTabChange('gstr1')}
                        className={`py-1.5 px-3.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            activeTab === 'gstr1'
                                ? "bg-orange-500 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>GSTR-1</span>
                        <span className="text-[10px] opacity-85 hidden md:inline">(Sales)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('gstr2b')}
                        className={`py-1.5 px-3.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            activeTab === 'gstr2b'
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>GSTR-2B</span>
                        <span className="text-[10px] opacity-85 hidden md:inline">(ITC Purchases)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('gstr3b')}
                        className={`py-1.5 px-3.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            activeTab === 'gstr3b'
                                ? "bg-violet-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>GSTR-3B</span>
                        <span className="text-[10px] opacity-85 hidden md:inline">(Summary)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('reconciliation')}
                        className={`py-1.5 px-3.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            activeTab === 'reconciliation'
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Scale className="w-3.5 h-3.5" />
                        <span>CA Reconciliation</span>
                    </button>
                </div>

                {/* Right controls: Fallback state selector & Period (for Reconciliation) */}
                <div className="flex items-center gap-2 self-end sm:self-auto px-1">
                    {!bizGSTIN ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>State:</span>
                            <Select value={effectiveStateCode} onValueChange={handleStateCodeChange}>
                                <SelectTrigger className="h-7 w-36 text-xs">
                                    <SelectValue placeholder="Select State" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60 text-xs">
                                    {INDIAN_GST_STATES.map(s => (
                                        <SelectItem key={s.code} value={s.code} className="text-xs">
                                            {s.code} - {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <span className="text-[11px] font-mono text-muted-foreground hidden lg:inline">
                            GSTIN: {bizGSTIN}
                        </span>
                    )}

                    {activeTab === 'reconciliation' && (
                        <Select 
                            value={selectedPeriodIndex.toString()} 
                            onValueChange={(val) => setSelectedPeriodIndex(Number(val))}
                        >
                            <SelectTrigger className="h-7 min-w-[170px] text-xs font-medium">
                                <SelectValue placeholder="Select Period" />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                                {periods.map((p, idx) => (
                                    <SelectItem key={idx} value={idx.toString()} className="text-xs">
                                        {p.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {/* Active Return Content */}
            <div>
                {activeTab === 'gstr1' && (
                    <div className="animate-fade-in">
                        <GSTR1Report />
                    </div>
                )}

                {activeTab === 'gstr2b' && (
                    <div className="animate-fade-in">
                        <GSTR2BReport />
                    </div>
                )}

                {activeTab === 'gstr3b' && (
                    <div className="animate-fade-in">
                        <GSTR3BReport />
                    </div>
                )}

                {activeTab === 'reconciliation' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Executive CA Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="border-l-4 border-l-orange-500">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-muted-foreground">Output Tax (Sales)</p>
                                        <ArrowUpRight className="w-4 h-4 text-orange-500" />
                                    </div>
                                    <p className="text-2xl font-bold text-foreground mt-1">
                                        {formatCurrency(recon.output.total)}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Taxable: {formatCurrency(recon.outwardTaxable)} ({recon.salesCount} invoices)
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-l-blue-600">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-muted-foreground">Input Tax Credit (ITC)</p>
                                        <ArrowDownRight className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-foreground mt-1">
                                        {formatCurrency(recon.itc.total)}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Taxable: {formatCurrency(recon.inwardTaxable)} ({recon.purchasesCount} bills)
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className={`border-l-4 ${recon.net.payable > 0 ? "border-l-rose-500" : "border-l-emerald-500"}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-muted-foreground">Net Cash Tax Payable</p>
                                        <ShieldCheck className={`w-4 h-4 ${recon.net.payable > 0 ? "text-rose-500" : "text-emerald-500"}`} />
                                    </div>
                                    <p className="text-2xl font-bold text-foreground mt-1">
                                        {formatCurrency(recon.net.payable)}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        {recon.net.payable > 0 ? "To be paid in Cash Ledger" : "Fully covered by Input Tax Credit"}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-l-4 border-l-emerald-600">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-muted-foreground">ITC Balance Carried Forward</p>
                                        <Scale className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-foreground mt-1">
                                        {formatCurrency(recon.net.credit)}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Surplus credit available for future returns
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Side-by-side CA Comparative Ledger Table */}
                        <Card className="overflow-hidden">
                            <CardHeader className="py-4 bg-muted/30 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base font-bold flex items-center gap-2">
                                            <Scale className="w-4 h-4 text-primary" />
                                            GST Head-wise Tax Reconciliation Statement
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            Comparison of Outward Liability (GSTR-1) vs Inward Tax Credit (GSTR-2B) for {activePeriod.label}
                                        </CardDescription>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-xs gap-1.5 h-8"
                                        onClick={() => refetchRecon()}
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Recalculate
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-muted/60 border-b font-bold text-muted-foreground">
                                            <tr>
                                                <th className="p-3">Tax Head</th>
                                                <th className="p-3 text-right">Output Tax (GSTR-1)</th>
                                                <th className="p-3 text-right">Input Credit (GSTR-2B)</th>
                                                <th className="p-3 text-right">Net Position</th>
                                                <th className="p-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            <tr>
                                                <td className="p-3 font-semibold">Integrated Tax (IGST)</td>
                                                <td className="p-3 text-right font-mono">{formatCurrency(recon.output.igst)}</td>
                                                <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400">{formatCurrency(recon.itc.igst)}</td>
                                                <td className="p-3 text-right font-mono font-bold">
                                                    {recon.net.igst >= 0 ? formatCurrency(recon.net.igst) : `(${formatCurrency(Math.abs(recon.net.igst))})`}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {recon.net.igst > 0 ? (
                                                        <Badge variant="outline" className="text-[10px] text-rose-600 bg-rose-50 border-rose-200">Payable</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-200">Credit Surplus</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-semibold">Central Tax (CGST)</td>
                                                <td className="p-3 text-right font-mono">{formatCurrency(recon.output.cgst)}</td>
                                                <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400">{formatCurrency(recon.itc.cgst)}</td>
                                                <td className="p-3 text-right font-mono font-bold">
                                                    {recon.net.cgst >= 0 ? formatCurrency(recon.net.cgst) : `(${formatCurrency(Math.abs(recon.net.cgst))})`}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {recon.net.cgst > 0 ? (
                                                        <Badge variant="outline" className="text-[10px] text-rose-600 bg-rose-50 border-rose-200">Payable</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-200">Credit Surplus</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-semibold">State / UT Tax (SGST)</td>
                                                <td className="p-3 text-right font-mono">{formatCurrency(recon.output.sgst)}</td>
                                                <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400">{formatCurrency(recon.itc.sgst)}</td>
                                                <td className="p-3 text-right font-mono font-bold">
                                                    {recon.net.sgst >= 0 ? formatCurrency(recon.net.sgst) : `(${formatCurrency(Math.abs(recon.net.sgst))})`}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {recon.net.sgst > 0 ? (
                                                        <Badge variant="outline" className="text-[10px] text-rose-600 bg-rose-50 border-rose-200">Payable</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-200">Credit Surplus</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                            <tr className="bg-muted/40 font-bold border-t-2">
                                                <td className="p-3">Total GST Position</td>
                                                <td className="p-3 text-right font-mono">{formatCurrency(recon.output.total)}</td>
                                                <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400">{formatCurrency(recon.itc.total)}</td>
                                                <td className="p-3 text-right font-mono text-primary text-sm font-extrabold">
                                                    {recon.net.payable > 0 ? formatCurrency(recon.net.payable) : `Credit: ${formatCurrency(recon.net.credit)}`}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {recon.net.payable > 0 ? (
                                                        <Badge className="bg-rose-600 text-white text-[10px]">Net Tax To Pay</Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-600 text-white text-[10px]">Nil Payable / Refund</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Senior CA Compliance Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                                <CardHeader className="py-3 px-4">
                                    <CardTitle className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Statutory Filing Timelines (CBIC Rules)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pb-3 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                                    <p>• <strong>GSTR-1</strong>: File monthly outward supplies by the <strong>11th</strong> of the subsequent month (or 13th for QRMP quarterly filers).</p>
                                    <p>• <strong>GSTR-2B</strong>: Static auto-drafted ITC statement generated on the <strong>14th</strong> of the subsequent month.</p>
                                    <p>• <strong>GSTR-3B</strong>: Summary return & tax payment due on the <strong>20th</strong> of the subsequent month.</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                                <CardHeader className="py-3 px-4">
                                    <CardTitle className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <HelpCircle className="w-4 h-4 text-blue-500" />
                                        Input Tax Credit Utilization Order (Section 49)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pb-3 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                                    <p>• <strong>IGST Credit</strong> must be exhausted 100% first against IGST liability, then CGST & SGST in any proportion.</p>
                                    <p>• <strong>CGST Credit</strong> offsets CGST liability, then IGST. (Never against SGST).</p>
                                    <p>• <strong>SGST Credit</strong> offsets SGST liability, then IGST. (Never against CGST).</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
