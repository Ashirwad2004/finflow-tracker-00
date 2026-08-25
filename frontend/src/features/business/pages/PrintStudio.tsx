import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useMemo } from "react";
import { 
    Printer, 
    LayoutTemplate, 
    History, 
    FileText, 
    CheckCircle2, 
    Download, 
    Share2, 
    User, 
    Phone, 
    MapPin, 
    Mail,
    Check,
    CreditCard,
    Building2,
    Calendar,
    Sparkles,
    Eye,
    TrendingUp,
    FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { format } from "date-fns";
import { generateInvoicePDF, InvoiceDetails, InvoicePdfTheme, PageSize } from "@/utils/generateInvoicePDF";
import { printThermalReceipt } from "@/utils/printThermalReceipt";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/core/lib/utils";

export type InvoiceTheme = InvoicePdfTheme | 'thermal';

const themeMeta: Record<InvoiceTheme, { name: string; desc: string; color: string; class: string }> = {
    "startup-gradient": { 
        name: "Startup Gradient", 
        desc: "Trendy tech layout with vibrant indigo-pink gradients and modern typography.", 
        color: "bg-gradient-to-r from-indigo-500 to-pink-500 text-white",
        class: "border-indigo-200 hover:border-indigo-400"
    },
    "tally-accounting": { 
        name: "Tally ERP Standard", 
        desc: "Classic Indian GST Tax invoice with dual quadrants, HSN summary, and bank details.", 
        color: "bg-zinc-800 text-white border border-black",
        class: "border-slate-300 hover:border-slate-500"
    },
    thermal: { 
        name: "Thermal POS Receipt", 
        desc: "Compact receipt format with barcode styling for 58mm/80mm thermal rolls.", 
        color: "bg-stone-300 text-stone-800 font-mono",
        class: "border-stone-300 hover:border-stone-400"
    }
};

const invoiceThemes = Object.keys(themeMeta) as InvoiceTheme[];

// Sample sale used for preview when no recent sales exist
const sampleSale = {
    id: "sample-id-12345",
    invoice_number: "INV-2026-089",
    created_at: new Date().toISOString(),
    customer_name: "Acme Corporates Ltd.",
    customer_phone: "+91 98765 01234",
    customer_email: "billing@acme.com",
    customer_gstin: "27AAAAA1111A1Z1",
    subtotal: 14500,
    discount_amount: 1500,
    tax_rate: 18,
    tax_amount: 2340,
    total_amount: 15340,
    items: [
        { description: "Premium Software Subscription (Annual)", quantity: 1, price: 12000, total: 12000, hsn_code: "998313", unit: "pcs" },
        { description: "Developer API Integration Consultancy", quantity: 2, price: 1250, total: 2500, hsn_code: "998314", unit: "Hours" }
    ]
};

// ── INTERACTIVE MOCK PREVIEW COMPONENT ──
const InvoiceMockPreview = ({ 
    sale, 
    profile, 
    theme, 
    formatCurrency,
    pageSize,
    customTerms
}: { 
    sale: any; 
    profile: any; 
    theme: InvoiceTheme; 
    formatCurrency: (n: number) => string;
    pageSize: PageSize;
    customTerms: string;
}) => {
    const bizName = profile?.business_name || profile?.display_name || "RupeeBill Ventures";
    const parsedDate = sale.created_at ? new Date(sale.created_at) : new Date();
    const dateFormatted = isNaN(parsedDate.getTime()) ? format(new Date(), "dd MMM yyyy") : format(parsedDate, "dd MMM yyyy");
    
    const items = sale.items || [];
    const taxAmount = sale.tax_amount || 0;
    const discount = sale.discount_amount || 0;
    const subtotal = sale.subtotal || sale.total_amount;
    const totalAmount = sale.total_amount;

    let taxRate = Number(sale.tax_rate) || 0;
    if (taxRate === 0 && taxAmount > 0) {
        const taxableAmount = Math.max(1, Number(subtotal || 0) - Number(discount || 0));
        taxRate = Math.round((Number(taxAmount) / taxableAmount) * 100);
    }
    // Fallback: read tax_rate from first item if still 0
    if (taxRate === 0 && items.length > 0 && items[0].tax_rate) {
        taxRate = Number(items[0].tax_rate) || 0;
    }
    
    const cgst = taxAmount > 0 ? (taxAmount / 2).toFixed(2) : "0.00";
    const sgst = taxAmount > 0 ? (taxAmount / 2).toFixed(2) : "0.00";

    const [bankAccount, setBankAccount] = useState<{bankName: string; accountNumber: string; ifscCode: string; branchName: string} | null>(null);

    useEffect(() => {
        try {
            const saved = localStorage.getItem("rupeebill_bank_accounts");
            if (saved) {
                const list = JSON.parse(saved);
                const defaultAcc = list.find((a: any) => a.isDefault) || list[0];
                if (defaultAcc) {
                    setBankAccount(defaultAcc);
                }
            }
        } catch {}
    }, []);

    // 1. TALLY ERP GST TAX INVOICE PREVIEW
    if (theme === 'tally-accounting') {
        return (
            <div className={cn(
                "bg-white text-black p-6 mx-auto font-sans text-xs border border-black shadow-lg w-full flex flex-col justify-between select-none transition-all duration-300",
                pageSize === 'a5' ? "max-w-[500px] min-h-[530px]" : "max-w-[680px] min-h-[750px]"
            )}>
                {/* Header label */}
                <div className="text-center font-bold text-sm tracking-wide border-b border-black pb-2 mb-2">
                    TAX INVOICE
                </div>
                
                {/* Seller & Invoice Details Grid (Quadrants) */}
                <div className="grid grid-cols-2 border border-black">
                    {/* Top Left: Seller Details */}
                    <div className="p-3 border-r border-b border-black space-y-1">
                        <span className="text-[9px] uppercase text-slate-500 font-bold block">Sender / Company Details</span>
                        <div className="font-extrabold text-xs">{bizName}</div>
                        {profile?.business_address && <p className="text-[10px] text-slate-700 leading-tight">{profile.business_address}</p>}
                        {profile?.business_phone && <p className="text-[10px] text-slate-700">Phone: {profile.business_phone}</p>}
                        {profile?.gst_number && <p className="text-[10px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded w-max mt-0.5">GSTIN: {profile.gst_number}</p>}
                    </div>
                    
                    {/* Top Right: Invoice Metadata */}
                    <div className="p-3 border-b border-black grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] content-start">
                        <div>
                            <span className="text-slate-500 block text-[9px] font-bold">Invoice No.</span>
                            <span className="font-bold text-xs">{sale.invoice_number}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[9px] font-bold">Dated</span>
                            <span className="font-bold">{dateFormatted}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[9px] font-bold">Delivery Note</span>
                            <span>Direct Delivery</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[9px] font-bold">Mode/Terms of Payment</span>
                            <span>Immediate / Paid</span>
                        </div>
                    </div>
                    
                    {/* Bottom Left: Buyer details */}
                    <div className="p-3 border-r border-black space-y-1">
                        <span className="text-[9px] uppercase text-slate-500 font-bold block">Buyer (Bill to)</span>
                        <div className="font-bold text-[11px]">{sale.customer_name || "Walk-in Guest"}</div>
                        {sale.customer_phone && <p className="text-[10px] text-slate-700">Phone: {sale.customer_phone}</p>}
                        {sale.customer_email && <p className="text-[10px] text-slate-700">Email: {sale.customer_email}</p>}
                        {sale.customer_gstin && <p className="text-[10px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded w-max mt-0.5">GSTIN: {sale.customer_gstin}</p>}
                    </div>
                    
                    {/* Bottom Right: Consignee Details */}
                    <div className="p-3 space-y-1">
                        <span className="text-[9px] uppercase text-slate-500 font-bold block">Consignee (Ship to)</span>
                        <div className="font-bold text-[11px]">{sale.customer_name || "Walk-in Guest"}</div>
                        <p className="text-[10px] text-slate-600 italic">Same as billing address</p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mt-4 border border-black overflow-hidden flex-1 flex flex-col justify-start">
                    <table className="w-full h-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-100/50 border-b border-black text-[9px] font-bold tracking-wider text-black">
                                <th className="p-2 border-r border-black text-center w-10">S.No</th>
                                <th className="p-2 border-r border-black">Description of Goods</th>
                                <th className="p-2 border-r border-black text-center w-12">Qty</th>
                                <th className="p-2 border-r border-black text-center w-12">Tax%</th>
                                <th className="p-2 border-r border-black text-right w-24">Rate</th>
                                <th className="p-2 border-r border-black text-center w-12">per</th>
                                <th className="p-2 text-right w-28">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/30 text-slate-950 font-mono text-[10px]">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-muted-foreground italic">No items listed.</td>
                                </tr>
                            ) : (
                                items.map((item: any, idx: number) => (
                                    <tr key={idx} className="align-top">
                                        <td className="p-2 border-r border-b border-black text-center">{idx + 1}</td>
                                        <td className="p-2 border-r border-b border-black font-sans">
                                            <div className="font-bold text-slate-800">{item.description}</div>
                                            {item.hsn_code && <span className="text-[8px] text-slate-500 font-mono">HSN: {item.hsn_code}</span>}
                                        </td>
                                        <td className="p-2 border-r border-b border-black text-center">{item.quantity ?? 1}</td>
                                        <td className="p-2 border-r border-b border-black text-center text-[9px]">{item.tax_rate !== undefined ? `${item.tax_rate}%` : taxRate > 0 ? `${taxRate}%` : '—'}</td>
                                        <td className="p-2 border-r border-b border-black text-right">{formatCurrency(item.price).replace("Rs. ","")}</td>
                                        <td className="p-2 border-r border-b border-black text-center font-sans">{item.unit || ""}</td>
                                        <td className="p-2 border-b border-black text-right font-bold text-slate-900">{formatCurrency(item.total ?? (Number(item.quantity ?? 1) * Number(item.price))).replace("Rs. ","")}</td>
                                    </tr>
                                ))
                            )}
                            {/* Empty spacer row to stretch and draw vertical lines to the bottom of the table in Tally style */}
                            <tr className="h-full">
                                <td className="p-2 border-r border-black"></td>
                                <td className="p-2 border-r border-black"></td>
                                <td className="p-2 border-r border-black"></td>
                                <td className="p-2 border-r border-black"></td>
                                <td className="p-2 border-r border-black"></td>
                                <td className="p-2"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer Section split vertically */}
                <div className="mt-4 grid grid-cols-12 border border-black min-h-[160px]">
                    {/* Left 8 columns: Words, Bank Details, Declaration */}
                    <div className="col-span-8 p-3 border-r border-black flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                            <span className="text-[8px] text-slate-500 font-bold block uppercase">Amount Chargeable (in words)</span>
                            <span className="font-bold text-[10px] uppercase">INR {formatCurrency(totalAmount).replace("Rs. ", "")} ONLY</span>
                        </div>
                        <div className="border-t border-black/10 pt-2 space-y-1 text-[9px] text-slate-700">
                            <p className="font-bold text-[10px] text-slate-900">Company Bank Details</p>
                            <p>Bank Name: {bankAccount?.bankName || "State Bank of India"}</p>
                            <p>A/c No: {bankAccount?.accountNumber || "332405891234"}  |  IFSC: {bankAccount?.ifscCode || "SBI0001609"}</p>
                        </div>
                        <div className="border-t border-black/10 pt-2 text-[8px] text-slate-500">
                            <span className="font-bold text-[9px] text-slate-700 block mb-0.5">Declaration</span>
                            {customTerms || "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."}
                        </div>
                    </div>
                    
                    {/* Right 4 columns: Totals summary and Signatory box */}
                    <div className="col-span-4 flex flex-col justify-between">
                        {/* Summary details */}
                        <div className="p-3 space-y-1.5 text-[10px] border-b border-black bg-slate-50/50">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Subtotal</span>
                                <span>{formatCurrency(subtotal).replace("Rs. ","")}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-rose-755 font-bold">
                                    <span>Discount</span>
                                    <span>-{formatCurrency(discount).replace("Rs. ","")}</span>
                                </div>
                            )}
                            {taxAmount > 0 && (
                                <>
                                    <div className="flex justify-between text-slate-500">
                                        <span>CGST ({taxRate/2}%)</span>
                                        <span>{formatCurrency(parseFloat(cgst)).replace("Rs. ","")}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>SGST ({taxRate/2}%)</span>
                                        <span>{formatCurrency(parseFloat(sgst)).replace("Rs. ","")}</span>
                                    </div>
                                </>
                            )}
                            <div className="border-t border-black/20 my-1"></div>
                            <div className="flex justify-between font-extrabold text-[11px]">
                                <span>Total</span>
                                <span>{formatCurrency(totalAmount).replace("Rs. ","")}</span>
                            </div>
                        </div>
                        
                        {/* Signatory Box */}
                        <div className="p-3 text-center space-y-1 flex flex-col justify-between h-full bg-white">
                            <span className="text-[9px] font-bold block text-left">for {bizName.toUpperCase()}</span>
                            {profile?.signature_url && (
                                <img src={profile.signature_url} alt="Signature" className="h-8 object-contain mx-auto my-1" />
                            )}
                            <span className="text-[9px] font-bold block text-slate-500">Authorized Signatory</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. THERMAL RECEIPT PREVIEW
    if (theme === 'thermal') {
        return (
            <div className="bg-white text-black p-6 mx-auto font-mono text-xs shadow-inner border border-dashed border-slate-300 max-w-[340px] tracking-tight leading-normal min-h-[480px]">
                <div className="text-center space-y-1 mb-4">
                    <h3 className="font-bold text-base uppercase">{bizName}</h3>
                    {profile?.business_address && <p className="text-[10px]">{profile.business_address}</p>}
                    {profile?.business_phone && <p className="text-[10px]">PH: {profile.business_phone}</p>}
                    {profile?.gst_number && <p className="text-[10px]">GSTIN: {profile.gst_number}</p>}
                </div>
                
                <div className="border-b border-dashed border-black my-2"></div>
                
                <div className="space-y-0.5 text-[11px] mb-2">
                    <div className="flex justify-between"><span>BILL NO: {sale.invoice_number}</span></div>
                    <div className="flex justify-between"><span>DATE: {dateFormatted}</span></div>
                    <div className="flex justify-between"><span>CUSTOMER: {sale.customer_name || "CASH"}</span></div>
                </div>
                
                <div className="border-b border-dashed border-black my-2"></div>
                
                <div className="space-y-2 mb-3">
                    <div className="flex justify-between font-bold">
                        <span className="flex-1">ITEM</span>
                        <span className="w-8 text-center">QTY</span>
                        <span className="w-14 text-right">PRICE</span>
                        <span className="w-16 text-right">TOTAL</span>
                    </div>
                    <div className="border-b border-dashed border-black/40"></div>
                    {items.map((item: any, idx: number) => (
                        <div key={idx} className="flex flex-col text-[11px]">
                            <span className="font-bold">{item.description}</span>
                            <div className="flex justify-between text-slate-700">
                                <span></span>
                                <span className="w-8 text-center">{item.quantity}</span>
                                <span className="w-14 text-right">{Number(item.price).toFixed(2)}</span>
                                <span className="w-16 text-right font-bold text-black">₹{Number(item.total).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="border-b border-dashed border-black my-2"></div>
                
                <div className="space-y-1 text-[11px] mb-4">
                    <div className="flex justify-between"><span>SUBTOTAL</span><span>₹{subtotal.toFixed(2)}</span></div>
                    {discount > 0 && <div className="flex justify-between"><span>DISCOUNT</span><span>-₹{discount.toFixed(2)}</span></div>}
                    {taxAmount > 0 && (
                        <>
                            <div className="flex justify-between"><span>CGST ({taxRate/2}%)</span><span>₹{cgst}</span></div>
                            <div className="flex justify-between"><span>SGST ({taxRate/2}%)</span><span>₹{sgst}</span></div>
                        </>
                    )}
                    <div className="border-b border-dashed border-black/40 my-1"></div>
                    <div className="flex justify-between font-bold text-sm"><span>TOTAL AMOUNT</span><span>₹{totalAmount.toFixed(2)}</span></div>
                </div>
                
                <div className="border-b border-dashed border-black my-2"></div>
                <div className="text-center text-[10px] space-y-1 my-4">
                    <p className="font-bold">*** THANK YOU ***</p>
                    <p>PLEASE VISIT AGAIN</p>
                </div>
                
                {/* CSS Barcode Mock */}
                <div className="flex flex-col items-center justify-center opacity-85 mt-4">
                    <div className="flex h-8 w-36 mb-1 items-end justify-center mix-blend-multiply">
                        {[...Array(24)].map((_, i) => (
                            <div
                                key={i}
                                className="bg-black h-full"
                                style={{
                                    width: `${Math.max(1, (i % 3 === 0) ? 2 : 1)}px`,
                                    marginRight: `${Math.max(1, (i % 4 === 0) ? 2 : 1)}px`
                                }}
                            />
                        ))}
                    </div>
                    <p className="text-[9px] tracking-widest">{sale.invoice_number}</p>
                </div>
            </div>
        );
    }

    // Dynamic Style Mappings for PDF mockup representation
    const styles: {
        header: string;
        accentText: string;
        accentBg: string;
        tableHead: string;
        totalBox: string;
        font: string;
    } = {
        "startup-gradient": {
            header: "bg-gradient-to-r from-indigo-500 to-pink-500 text-white",
            accentText: "text-pink-600",
            accentBg: "bg-indigo-50",
            tableHead: "bg-indigo-600 text-white",
            totalBox: "border-pink-500 bg-pink-50/30",
            font: "font-sans"
        },
        "tally-accounting": {
            header: "bg-zinc-800 text-white border border-black",
            accentText: "text-slate-900",
            accentBg: "bg-slate-100",
            tableHead: "bg-zinc-800 text-white",
            totalBox: "border-black bg-white",
            font: "font-sans"
        },
        thermal: {
            header: "bg-stone-200 text-stone-900",
            accentText: "text-stone-800",
            accentBg: "bg-stone-100",
            tableHead: "bg-stone-300 text-stone-900",
            totalBox: "border-stone-400 bg-white",
            font: "font-mono"
        }
    }[theme] || {
        header: "bg-gradient-to-r from-indigo-500 to-pink-500 text-white",
        accentText: "text-pink-600",
        accentBg: "bg-indigo-50",
        tableHead: "bg-indigo-600 text-white",
        totalBox: "border-pink-500 bg-pink-50/30",
        font: "font-sans"
    };

    return (
        <div className={cn(
            "bg-white border rounded-xl overflow-hidden shadow-lg transition-all duration-300 w-full flex flex-col justify-between p-0", 
            pageSize === 'a5' ? "max-w-[500px] min-h-[530px]" : "max-w-[680px] min-h-[700px]",
            styles.font
        )}>
            
            {/* INVOICE TOP BAR */}
            <div className={cn("p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", styles.header)}>
                <div>
                    <h2 className="text-2xl font-bold uppercase tracking-tight">{bizName}</h2>
                    {profile?.business_address && <p className="text-xs opacity-90 mt-1 max-w-[280px]">{profile.business_address}</p>}
                    <p className="text-xs opacity-90 mt-0.5">
                        {[
                            profile?.business_phone ? `Phone: ${profile.business_phone}` : '',
                            profile?.gst_number ? `GSTIN: ${profile.gst_number}` : ''
                        ].filter(Boolean).join(" | ")}
                    </p>
                </div>
                
                <div className="text-right sm:text-right flex flex-col items-start sm:items-end">
                    <h1 className="text-3xl font-black tracking-tight leading-none uppercase">INVOICE</h1>
                    <p className="text-xs font-semibold opacity-90 mt-2">No. {sale.invoice_number}</p>
                    <p className="text-xs opacity-90 mt-0.5">Date: {dateFormatted}</p>
                </div>
            </div>

            {/* BILL DETAILS */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100">
                <div className="space-y-1">
                    <h4 className={cn("text-xs font-bold uppercase tracking-wider", styles.accentText)}>Billed To</h4>
                    <div className="text-sm font-bold text-slate-800">{sale.customer_name || "Walk-in Guest"}</div>
                    {sale.customer_phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {sale.customer_phone}</div>}
                    {sale.customer_email && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {sale.customer_email}</div>}
                    {sale.customer_gstin && <div className="text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded w-max mt-1">GSTIN: {sale.customer_gstin}</div>}
                </div>
                
                <div className="space-y-1 text-left md:text-right flex flex-col md:items-end justify-center">
                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Payment Status</div>
                    <Badge className="bg-emerald-500/10 hover:bg-emerald-500/10 border-transparent text-emerald-700 dark:text-emerald-400 font-bold uppercase text-[10px] tracking-wider mt-1 px-3 py-1">
                        PAID / SETTLED
                    </Badge>
                </div>
            </div>

            {/* TABLE ITEMS */}
            <div className="p-6 flex-1">
                <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className={cn("text-[10px] uppercase font-bold tracking-wider", styles.tableHead)}>
                                <th className="p-3">Item Description</th>
                                <th className="p-3 text-center">Qty</th>
                                <th className="p-3 text-center">Tax %</th>
                                <th className="p-3 text-right">Unit Price</th>
                                <th className="p-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-muted-foreground italic">No items listed in this invoice.</td>
                                </tr>
                            ) : (
                                items.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3">
                                            <div className="font-semibold text-slate-800">{item.description}</div>
                                            {item.hsn_code && <div className="text-[9px] text-muted-foreground mt-0.5">HSN: {item.hsn_code}</div>}
                                        </td>
                                        <td className="p-3 text-center font-medium">{item.quantity ?? 1}</td>
                                        <td className="p-3 text-center font-medium text-slate-600">{item.tax_rate !== undefined ? `${item.tax_rate}%` : taxRate > 0 ? `${taxRate}%` : '—'}</td>
                                        <td className="p-3 text-right font-medium">{formatCurrency(item.price)}</td>
                                        <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(item.total ?? (Number(item.quantity ?? 1) * Number(item.price)))}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TOTALS & SIGNATURE */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 bg-slate-50/40 rounded-b-xl">
                {/* Payment & Terms Note */}
                <div className="text-[11px] text-slate-500 space-y-1.5 flex flex-col justify-end">
                    <p className="font-bold text-slate-700 uppercase tracking-wider">Terms & Declarations</p>
                    <p className="leading-relaxed">1. All claims and returns must refer to the Invoice Number.</p>
                    <p className="leading-relaxed">2. Computer generated ledger statement, signature only required where applicable.</p>
                </div>
                
                {/* Financial Summary */}
                <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                        <span>Subtotal</span>
                        <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-rose-600 font-medium">
                            <span>Discount</span>
                            <span>-{formatCurrency(discount)}</span>
                        </div>
                    )}
                    {taxAmount > 0 && (
                        <>
                            <div className="flex justify-between text-slate-500">
                                <span>CGST ({taxRate/2}%)</span>
                                <span className="font-medium text-slate-800">{formatCurrency(parseFloat(cgst))}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>SGST ({taxRate/2}%)</span>
                                <span className="font-medium text-slate-800">{formatCurrency(parseFloat(sgst))}</span>
                            </div>
                        </>
                    )}
                    <div className={cn("flex justify-between p-3 rounded-lg border font-bold text-sm", styles.totalBox)}>
                        <span>Grand Total</span>
                        <span className={cn("text-base font-extrabold", styles.accentText)}>{formatCurrency(totalAmount)}</span>
                    </div>
                </div>
            </div>
            
            {/* Signature Area */}
            {profile?.signature_url && (
                <div className="px-6 pb-6 flex justify-end">
                    <div className="text-right space-y-1">
                        <img src={profile.signature_url} alt="Signature" className="h-10 object-contain ml-auto opacity-90 max-w-[120px]" />
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Authorized Signature</div>
                    </div>
                </div>
            )}
        </div>
    );
};


const PrintStudioPage = () => {
    const { user } = useAuth();
    const [selectedTheme, setSelectedTheme] = useState<InvoiceTheme>("startup-gradient");
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [pageSize, setPageSize] = useState<PageSize>(() => {
        return (localStorage.getItem("rupeebill_invoice_pagesize") as PageSize) || "a4";
    });

    const [fontSizeFactor, setFontSizeFactor] = useState<number>(() => {
        return Number(localStorage.getItem("rupeebill_invoice_fontsize_factor")) || 1.0;
    });

    const handlePageSizeChange = (size: PageSize) => {
        setPageSize(size);
        localStorage.setItem("rupeebill_invoice_pagesize", size);
        toast.success(`Print page size set to ${size.toUpperCase()}`);
    };

    const handleFontSizeChange = (factor: number) => {
        setFontSizeFactor(factor);
        localStorage.setItem("rupeebill_invoice_fontsize_factor", factor.toString());
    };

    const [customTerms, setCustomTerms] = useState<string>(() => {
        return localStorage.getItem("rupeebill_invoice_terms") || "";
    });

    const handleTermsChange = (text: string) => {
        setCustomTerms(text);
        localStorage.setItem("rupeebill_invoice_terms", text);
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem("rupeebill_invoice_theme") as InvoiceTheme;
        if (savedTheme && invoiceThemes.includes(savedTheme)) {
            setSelectedTheme(savedTheme);
        }
    }, []);

    const handleThemeSelect = (theme: InvoiceTheme) => {
        setSelectedTheme(theme);
        localStorage.setItem("rupeebill_invoice_theme", theme);
        toast.success(`Default template changed to ${themeMeta[theme].name}`);
    };

    // Fetch Recent Sales to populate the "Print Recent" list
    const { data: recentSales = [], isLoading } = useQuery({
        queryKey: ["recent_sales_for_print", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("sales")
                .select("*")
                .eq("user_id", user?.id || "")
                .order("created_at", { ascending: false })
                .limit(10); // Last 10 sales

            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

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

    // Auto-select latest sale for live preview once recentSales load
    useEffect(() => {
        if (recentSales.length > 0 && !selectedSale) {
            setSelectedSale(recentSales[0]);
        }
    }, [recentSales, selectedSale]);

    const activeSaleData = useMemo(() => {
        return selectedSale || sampleSale;
    }, [selectedSale]);

    const handlePrintSale = async (sale: any) => {
        const invoiceDetails: InvoiceDetails = {
            invoice_number: sale.invoice_number || `INV-${sale.id.slice(0, 6).toUpperCase()}`,
            date: sale.created_at,
            customer_name: sale.customer_name,
            customer_phone: sale.customer_phone,
            customer_email: sale.customer_email,
            customer_gstin: sale.customer_gstin,
            items: sale.items || [],
            subtotal: sale.subtotal || sale.total_amount,
            discount_amount: sale.discount_amount || 0,
            tax_rate: sale.tax_rate || 0,
            tax_amount: sale.tax_amount || 0,
            total_amount: sale.total_amount,
            business_details: profile ? {
                name: profile.business_name || profile.display_name || "My Business",
                address: profile.business_address || undefined,
                phone: profile.business_phone || profile.phone || undefined,
                gst: profile.gst_number || undefined,
                logo_url: profile.business_logo || undefined,
                signature_url: profile.signature_url || undefined,
            } : undefined
        };

        if (selectedTheme === 'thermal') {
            toast.success(`Preparing thermal POS receipt ${invoiceDetails.invoice_number}...`);
            await printThermalReceipt(invoiceDetails);
        } else {
            toast.success(`Generating PDF via ${themeMeta[selectedTheme].name} template...`);
            await generateInvoicePDF(invoiceDetails, { action: 'download', theme: selectedTheme as InvoicePdfTheme, pageSize, customTerms, fontSizeFactor });
        }
    };

    const { formatCurrency } = useCurrency();

    return (
        <AppLayout>
            <div className="h-full flex flex-col p-4 md:p-5 animate-fade-in max-w-[1600px] mx-auto w-full overflow-hidden">
                
                {/* COMPACT HERO HEADER */}
                <div className="flex items-center justify-between p-3 mb-4 bg-gradient-to-r from-primary/5 via-purple-500/5 to-transparent rounded-xl border border-primary/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <Printer className="w-5.5 h-5.5 text-primary flex-shrink-0" />
                        <div>
                            <h1 className="text-base font-black tracking-tight leading-none flex items-center gap-1.5">
                                Print Studio
                                <Badge variant="outline" className="text-[8px] font-bold px-1.5 py-0 border-primary/20 text-primary bg-primary/5">Designer</Badge>
                            </h1>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Select templates, preview layouts, and generate client invoices.</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
                    
                    {/* LEFT PANEL: SELECTORS (col-span-4) */}
                    <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-y-auto pr-2 pb-4 shrink-0">
                        
                        {/* 1. Choose Template Card */}
                        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
                            <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2">
                                <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
                                1. Choose Template
                            </h2>
                            <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                                {invoiceThemes.map((theme) => {
                                    const meta = themeMeta[theme];
                                    const isSelected = selectedTheme === theme;
                                    return (
                                        <button
                                            key={theme}
                                            onClick={() => handleThemeSelect(theme)}
                                            className={cn(
                                                "w-full text-left p-2.5 rounded-xl border-2 transition-all flex items-start gap-2.5",
                                                isSelected 
                                                    ? "border-primary bg-primary/5 ring-2 ring-primary/15" 
                                                    : "border-border hover:bg-muted/50"
                                            )}
                                        >
                                            <div className={cn("w-5 h-5 rounded-md flex-shrink-0 mt-0.5 shadow-sm", meta.color)} />
                                            <div className="min-w-0">
                                                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                                    {meta.name}
                                                    {isSelected && <Badge className="text-[8px] px-1 bg-primary text-white h-3.5">Default</Badge>}
                                                </div>
                                                <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1 leading-tight">{meta.desc}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Choose Invoice / Recent Sales Card */}
                        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
                            <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2">
                                <History className="w-3.5 h-3.5 text-primary" />
                                2. Choose Invoice Record
                            </h2>
                            
                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                {isLoading ? (
                                    <div className="space-y-1.5">
                                        {[1, 2, 3].map(i => <div key={i} className="w-full h-9 bg-muted animate-pulse rounded-lg" />)}
                                    </div>
                                ) : recentSales.length === 0 ? (
                                    <div className="text-center py-4 text-muted-foreground border border-dashed border-border rounded-xl">
                                        <FileText className="w-5 h-5 mx-auto mb-1 opacity-40" />
                                        <p className="text-[11px] font-medium">No sales recorded yet</p>
                                        <p className="text-[9px] opacity-75 mt-0.5">Showing mock invoice preview</p>
                                    </div>
                                ) : (
                                    recentSales.map((sale: any) => {
                                        const isSelected = selectedSale?.id === sale.id;
                                        return (
                                            <button
                                                key={sale.id}
                                                onClick={() => setSelectedSale(sale)}
                                                className={cn(
                                                    "w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between gap-2.5 text-xs",
                                                    isSelected
                                                        ? "border-primary bg-primary/5 font-semibold text-primary"
                                                        : "border-border hover:bg-muted/40 text-slate-700 dark:text-slate-200"
                                                )}
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-bold truncate text-[11px]">{sale.customer_name || "Walk-in Guest"}</p>
                                                    <div className="text-[9px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                        <span>{sale.invoice_number || `INV-${sale.id.slice(0,6).toUpperCase()}`}</span>
                                                        <span>•</span>
                                                        <span>{(() => {
                                                            const d = new Date(sale.created_at);
                                                            return isNaN(d.getTime()) ? "N/A" : format(d, "MMM d");
                                                        })()}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <span className="font-bold text-[11px] text-slate-800 dark:text-slate-100">{formatCurrency(sale.total_amount)}</span>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* 3. Page Layout Settings */}
                        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
                            <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2">
                                <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
                                3. Page Layout Settings
                            </h2>
                            <div className="space-y-3">
                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-350 block">Print Page Size</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => handlePageSizeChange('a4')}
                                        className={cn(
                                            "p-2 rounded-lg border transition-all flex items-center justify-center gap-2 text-xs",
                                            pageSize === 'a4'
                                                ? "border-primary bg-primary/5 text-primary font-bold"
                                                : "border-border hover:bg-muted text-slate-650 dark:text-slate-300"
                                        )}
                                    >
                                        <FileText className="w-4 h-4" />
                                        <span>A4 Sheet</span>
                                    </button>
                                    
                                    <button
                                        onClick={() => handlePageSizeChange('a5')}
                                        className={cn(
                                            "p-2 rounded-lg border transition-all flex items-center justify-center gap-2 text-xs",
                                            pageSize === 'a5'
                                                ? "border-primary bg-primary/5 text-primary font-bold"
                                                : "border-border hover:bg-muted text-slate-650 dark:text-slate-300"
                                        )}
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>A5 Sheet</span>
                                    </button>
                                </div>

                                {/* Font Size Preferences */}
                                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-350 flex items-center justify-between">
                                        <span>Invoice Font Size</span>
                                        <span className="text-[10px] font-bold text-primary px-1.5 py-0.2 bg-primary/10 rounded-full">{Math.round(fontSizeFactor * 100)}%</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-slate-400">A-</span>
                                        <input
                                            type="range"
                                            min="0.6"
                                            max="1.4"
                                            step="0.05"
                                            value={fontSizeFactor}
                                            onChange={(e) => handleFontSizeChange(parseFloat(e.target.value))}
                                            className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                        <span className="text-[9px] text-slate-400">A+</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Terms & Conditions Card */}
                        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
                            <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2">
                                <FileCheck className="w-3.5 h-3.5 text-primary" />
                                4. Terms & Conditions
                            </h2>
                            <textarea
                                value={customTerms}
                                onChange={(e) => handleTermsChange(e.target.value)}
                                placeholder="Type custom payment terms or legal declaration here..."
                                className="w-full text-xs p-2 rounded-lg border border-input bg-background min-h-[50px] max-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all resize-none"
                            />
                        </div>

                    </div>

                    {/* RIGHT PANEL: LIVE PREVIEW & TOOLBAR (col-span-8) */}
                    <div className="lg:col-span-8 flex flex-col gap-4 h-full overflow-hidden">
                        
                        {/* Interactive Toolbar */}
                        <div className="bg-card border rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                            <div>
                                <h3 className="font-bold text-xs flex items-center gap-1.5">
                                    <Eye className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                    Live Invoice Preview
                                </h3>
                                <p className="text-[9px] text-muted-foreground mt-0.5">Showing: {selectedSale ? selectedSale.invoice_number : "Sample Invoice Template"}</p>
                            </div>
                            
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    onClick={() => handlePrintSale(activeSaleData)}
                                    className="bg-primary hover:bg-primary/95 text-white font-bold rounded-lg text-xs h-8.5 px-3 flex items-center gap-1.5 flex-1 sm:flex-initial"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    {selectedTheme === 'thermal' ? 'Print Thermal' : 'Download Invoice'}
                                </Button>
                                
                                {selectedTheme !== 'thermal' && (
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            toast.success("Printing invoice layout...");
                                            await generateInvoicePDF(
                                                {
                                                    invoice_number: activeSaleData.invoice_number || `INV-${activeSaleData.id.slice(0, 6).toUpperCase()}`,
                                                    date: activeSaleData.created_at,
                                                    customer_name: activeSaleData.customer_name,
                                                    customer_phone: activeSaleData.customer_phone,
                                                    customer_email: activeSaleData.customer_email,
                                                    customer_gstin: activeSaleData.customer_gstin,
                                                    items: activeSaleData.items || [],
                                                    subtotal: activeSaleData.subtotal || activeSaleData.total_amount,
                                                    discount_amount: activeSaleData.discount_amount || 0,
                                                    tax_rate: activeSaleData.tax_rate || 0,
                                                    tax_amount: activeSaleData.tax_amount || 0,
                                                    total_amount: activeSaleData.total_amount,
                                                    business_details: profile ? {
                                                        name: profile.business_name || profile.display_name || "My Business",
                                                        address: profile.business_address || undefined,
                                                        phone: profile.business_phone || profile.phone || undefined,
                                                        gst: profile.gst_number || undefined,
                                                        logo_url: profile.business_logo || undefined,
                                                        signature_url: profile.signature_url || undefined,
                                                    } : undefined
                                                }, 
                                                { action: 'preview', theme: selectedTheme as InvoicePdfTheme, pageSize, customTerms, fontSizeFactor }
                                            );
                                        }}
                                        className="rounded-lg text-xs h-8.5 border-border flex items-center gap-1.5 flex-1 sm:flex-initial"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        Print Preview
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Invoice Canvas Sheet Wrapper */}
                        <div className="flex-1 min-h-0 bg-slate-100 dark:bg-slate-900/60 p-4 border rounded-xl flex justify-center items-start overflow-auto shadow-inner">
                            <div className={cn("w-full transition-all duration-300", pageSize === 'a5' ? "max-w-[500px]" : "max-w-[680px]")}>
                                <div className="w-full relative">
                                    <style dangerouslySetInnerHTML={{ __html: `
                                        .invoice-preview-container-wrap {
                                            font-size: ${12 * fontSizeFactor * (pageSize === 'a5' ? 0.75 : 1.0)}px !important;
                                        }
                                        .invoice-preview-container-wrap .text-xs,
                                        .invoice-preview-container-wrap td,
                                        .invoice-preview-container-wrap th {
                                            font-size: ${12 * fontSizeFactor * (pageSize === 'a5' ? 0.75 : 1.0)}px !important;
                                        }
                                        .invoice-preview-container-wrap .text-sm {
                                            font-size: ${14 * fontSizeFactor * (pageSize === 'a5' ? 0.75 : 1.0)}px !important;
                                        }
                                        .invoice-preview-container-wrap .text-base {
                                            font-size: ${16 * fontSizeFactor * (pageSize === 'a5' ? 0.75 : 1.0)}px !important;
                                        }
                                        .invoice-preview-container-wrap .text-lg {
                                            font-size: ${18 * fontSizeFactor * (pageSize === 'a5' ? 0.75 : 1.0)}px !important;
                                        }
                                        .invoice-preview-container-wrap .text-xl {
                                            font-size: ${20 * fontSizeFactor * (pageSize === 'a5' ? 0.75 : 1.0)}px !important;
                                        }
                                        .invoice-preview-container-wrap .text-2xl {
                                            font-size: ${24 * fontSizeFactor * (pageSize === 'a5' ? 0.75 : 1.0)}px !important;
                                        }
                                        .invoice-preview-container-wrap .text-[8px] {
                                            font-size: ${8 * fontSizeFactor * (pageSize === 'a5' ? 0.75 : 1.0)}px !important;
                                        }
                                        .invoice-preview-container-wrap .text-[9px] {
                                            font-size: ${9 * fontSizeFactor * (pageSize === 'a5' ? 0.75 : 1.0)}px !important;
                                        }
                                        .invoice-preview-container-wrap .text-[10px] {
                                            font-size: ${10 * fontSizeFactor * (pageSize === 'a5' ? 0.75 : 1.0)}px !important;
                                        }
                                        .invoice-preview-container-wrap .text-[11px] {
                                            font-size: ${11 * fontSizeFactor * (pageSize === 'a5' ? 0.75 : 1.0)}px !important;
                                        }
                                    `}} />
                                    <div className="invoice-preview-container-wrap w-full">
                                        <InvoiceMockPreview 
                                            sale={activeSaleData}
                                            profile={profile}
                                            theme={selectedTheme}
                                            formatCurrency={formatCurrency}
                                            pageSize={pageSize}
                                            customTerms={customTerms}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </AppLayout>
    );
};
export default PrintStudioPage;
