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
    corporate: { 
        name: "Corporate Blue", 
        desc: "Classic professional look with clean navy header.", 
        color: "bg-blue-600",
        class: "border-blue-200 hover:border-blue-400"
    },
    "modern-dark": { 
        name: "Modern Dark", 
        desc: "Techy high-contrast design for modern services.", 
        color: "bg-slate-900 border border-slate-700",
        class: "border-slate-800 hover:border-slate-650"
    },
    "minimal-white": { 
        name: "Minimalist White", 
        desc: "Ultra clean design with thin borders and spacing.", 
        color: "bg-white border border-slate-200 text-slate-800",
        class: "border-slate-200 hover:border-slate-400"
    },
    "professional-green": { 
        name: "Forest Green", 
        desc: "Trustworthy professional layout with green accents.", 
        color: "bg-emerald-700",
        class: "border-emerald-200 hover:border-emerald-400"
    },
    "premium-gold": { 
        name: "Premium Gold", 
        desc: "Luxury styling with cream papers and gold trims.", 
        color: "bg-amber-600",
        class: "border-amber-200 hover:border-amber-400"
    },
    "creative-purple": { 
        name: "Creative Purple", 
        desc: "Modern violet theme for agencies and designers.", 
        color: "bg-violet-700",
        class: "border-violet-200 hover:border-violet-400"
    },
    "startup-gradient": { 
        name: "Startup Gradient", 
        desc: "Trendy tech layout with indigo-pink gradients.", 
        color: "bg-gradient-to-r from-indigo-500 to-pink-500",
        class: "border-indigo-200 hover:border-indigo-400"
    },
    "elegant-mono": { 
        name: "Elegant Typewriter", 
        desc: "Classic double borders and serif fonts.", 
        color: "bg-stone-100 text-stone-800 border border-stone-300",
        class: "border-stone-200 hover:border-stone-400"
    },
    retail: { 
        name: "Retail Split", 
        desc: "Double column layout with meta sidebar.", 
        color: "bg-sky-500",
        class: "border-sky-200 hover:border-sky-400"
    },
    construction: { 
        name: "Industrial Orange", 
        desc: "Heavy industrial look with safety-orange accents.", 
        color: "bg-orange-600",
        class: "border-orange-200 hover:border-orange-400"
    },
    "bold-crimson": {
        name: "Bold Crimson",
        desc: "High-contrast corporate design with crimson blocks.",
        color: "bg-rose-700",
        class: "border-rose-200 hover:border-rose-400"
    },
    "navy-compact": {
        name: "Navy Compact",
        desc: "Sleek compact layout with clean slate accents.",
        color: "bg-slate-900 border-t-2 border-slate-900",
        class: "border-slate-300 hover:border-slate-400"
    },
    "retro-amber": {
        name: "Retro Amber",
        desc: "Warm vintage feel with serif fonts and amber trims.",
        color: "bg-amber-500",
        class: "border-amber-200 hover:border-amber-450"
    },
    "tally-accounting": {
        name: "Tally ERP Standard",
        desc: "Classic Indian GST Tax invoice with dual quadrants and bank details.",
        color: "bg-zinc-805 text-white border border-black",
        class: "border-slate-300 hover:border-slate-500"
    },
    thermal: { 
        name: "Thermal POS Receipt", 
        desc: "Compact receipt format with barcode styling.", 
        color: "bg-stone-300 text-stone-850 font-mono",
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
        { description: "Premium Software Subscription (Annual)", quantity: 1, price: 12000, total: 12000, hsn_code: "998313" },
        { description: "Developer API Integration Consultancy", quantity: 2, price: 1250, total: 2500, hsn_code: "998314" }
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
    const bizName = profile?.business_name || profile?.display_name || "FinFlow Ventures";
    const dateFormatted = sale.created_at ? format(new Date(sale.created_at), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy");
    
    const items = sale.items || [];
    const taxRate = sale.tax_rate || 0;
    const taxAmount = sale.tax_amount || 0;
    const discount = sale.discount_amount || 0;
    const subtotal = sale.subtotal || sale.total_amount;
    const totalAmount = sale.total_amount;
    
    const cgst = taxAmount > 0 ? (taxAmount / 2).toFixed(2) : "0.00";
    const sgst = taxAmount > 0 ? (taxAmount / 2).toFixed(2) : "0.00";

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
                                        <td className="p-2 border-r border-b border-black text-center">{item.quantity}</td>
                                        <td className="p-2 border-r border-b border-black text-right">{formatCurrency(item.price).replace("Rs. ","")}</td>
                                        <td className="p-2 border-r border-b border-black text-center font-sans">Nos</td>
                                        <td className="p-2 border-b border-black text-right font-bold text-slate-900">{formatCurrency(item.total ?? (Number(item.quantity) * Number(item.price))).replace("Rs. ","")}</td>
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
                            <p>Bank Name: State Bank of India</p>
                            <p>A/c No: 332405891234  |  IFSC: SBI0001609</p>
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
    const styles = {
        corporate: {
            header: "bg-blue-600 text-white",
            accentText: "text-blue-600",
            accentBg: "bg-blue-600/10",
            tableHead: "bg-blue-600 text-white",
            totalBox: "border-blue-500 bg-blue-50/30",
            font: "font-sans"
        },
        "modern-dark": {
            header: "bg-slate-950 text-white border-b border-cyan-500/20",
            accentText: "text-cyan-500",
            accentBg: "bg-cyan-500/10",
            tableHead: "bg-slate-950 text-cyan-400",
            totalBox: "border-cyan-500/30 bg-slate-900 text-white",
            font: "font-sans dark:text-slate-100"
        },
        "minimal-white": {
            header: "bg-white text-slate-900 border-b-2 border-slate-900",
            accentText: "text-slate-900 font-bold",
            accentBg: "bg-slate-100",
            tableHead: "border-b border-slate-900 text-slate-900 font-bold",
            totalBox: "border-slate-900 bg-white",
            font: "font-sans"
        },
        "professional-green": {
            header: "bg-emerald-800 text-white",
            accentText: "text-emerald-700",
            accentBg: "bg-emerald-50",
            tableHead: "bg-emerald-800 text-white",
            totalBox: "border-emerald-600 bg-emerald-50/40",
            font: "font-sans"
        },
        "premium-gold": {
            header: "bg-[#fafaf6] text-amber-900 border-t-4 border-amber-600",
            accentText: "text-amber-800",
            accentBg: "bg-amber-50/50",
            tableHead: "bg-amber-800 text-white",
            totalBox: "border-amber-600 bg-amber-50/30",
            font: "font-serif"
        },
        "creative-purple": {
            header: "bg-violet-700 text-white",
            accentText: "text-violet-700",
            accentBg: "bg-violet-50",
            tableHead: "bg-violet-700 text-white",
            totalBox: "border-violet-600 bg-violet-50/40",
            font: "font-sans"
        },
        "startup-gradient": {
            header: "bg-gradient-to-r from-indigo-500 to-pink-500 text-white",
            accentText: "text-pink-600",
            accentBg: "bg-indigo-50",
            tableHead: "bg-indigo-600 text-white",
            totalBox: "border-pink-500 bg-pink-50/30",
            font: "font-sans"
        },
        "elegant-mono": {
            header: "bg-white text-black border-b-2 border-double border-black",
            accentText: "text-black font-bold",
            accentBg: "bg-stone-50",
            tableHead: "border-b-2 border-black text-black font-bold",
            totalBox: "border-black bg-stone-50",
            font: "font-serif"
        },
        retail: {
            header: "bg-sky-500 text-white",
            accentText: "text-sky-600",
            accentBg: "bg-sky-50",
            tableHead: "bg-sky-500 text-white",
            totalBox: "border-sky-500 bg-sky-50/50",
            font: "font-sans"
        },
        construction: {
            header: "bg-orange-600 text-white",
            accentText: "text-orange-600",
            accentBg: "bg-orange-50",
            tableHead: "bg-slate-800 text-white",
            totalBox: "border-orange-600 bg-orange-50/30",
            font: "font-sans"
        },
        "bold-crimson": {
            header: "bg-rose-700 text-white",
            accentText: "text-rose-700",
            accentBg: "bg-rose-50",
            tableHead: "bg-rose-700 text-white",
            totalBox: "border-rose-600 bg-rose-50/40",
            font: "font-sans"
        },
        "navy-compact": {
            header: "bg-slate-900 text-white border-b-4 border-slate-900",
            accentText: "text-slate-800",
            accentBg: "bg-slate-50",
            tableHead: "bg-slate-900 text-white",
            totalBox: "border-slate-800 bg-slate-100",
            font: "font-sans"
        },
        "retro-amber": {
            header: "bg-amber-600 text-white",
            accentText: "text-amber-700",
            accentBg: "bg-amber-50",
            tableHead: "bg-amber-600 text-white",
            totalBox: "border-amber-500 bg-amber-50/30",
            font: "font-serif"
        },
        "tally-accounting": {
            header: "bg-zinc-800 text-white border border-black",
            accentText: "text-slate-900",
            accentBg: "bg-slate-100",
            tableHead: "bg-zinc-800 text-white",
            totalBox: "border-black bg-white",
            font: "font-sans"
        }
    }[theme as Exclude<InvoiceTheme, 'thermal'>] || {
        header: "bg-blue-600 text-white",
        accentText: "text-blue-600",
        accentBg: "bg-blue-600/10",
        tableHead: "bg-blue-600 text-white",
        totalBox: "border-blue-500 bg-blue-50/30",
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
                                <th className="p-3 text-right">Unit Price</th>
                                <th className="p-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-6 text-center text-muted-foreground italic">No items listed in this invoice.</td>
                                </tr>
                            ) : (
                                items.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3">
                                            <div className="font-semibold text-slate-800">{item.description}</div>
                                            {item.hsn_code && <div className="text-[9px] text-muted-foreground mt-0.5">HSN: {item.hsn_code}</div>}
                                        </td>
                                        <td className="p-3 text-center font-medium">{item.quantity}</td>
                                        <td className="p-3 text-right font-medium">{formatCurrency(item.price)}</td>
                                        <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(item.total ?? (Number(item.quantity) * Number(item.price)))}</td>
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
    const [selectedTheme, setSelectedTheme] = useState<InvoiceTheme>("corporate");
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [pageSize, setPageSize] = useState<PageSize>(() => {
        return (localStorage.getItem("finflow_invoice_pagesize") as PageSize) || "a4";
    });

    const handlePageSizeChange = (size: PageSize) => {
        setPageSize(size);
        localStorage.setItem("finflow_invoice_pagesize", size);
        toast.success(`Print page size set to ${size.toUpperCase()}`);
    };

    const [customTerms, setCustomTerms] = useState<string>(() => {
        return localStorage.getItem("finflow_invoice_terms") || "";
    });

    const handleTermsChange = (text: string) => {
        setCustomTerms(text);
        localStorage.setItem("finflow_invoice_terms", text);
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem("finflow_invoice_theme") as InvoiceTheme;
        if (savedTheme && invoiceThemes.includes(savedTheme)) {
            setSelectedTheme(savedTheme);
        }
    }, []);

    const handleThemeSelect = (theme: InvoiceTheme) => {
        setSelectedTheme(theme);
        localStorage.setItem("finflow_invoice_theme", theme);
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
            await generateInvoicePDF(invoiceDetails, { action: 'download', theme: selectedTheme as InvoicePdfTheme, pageSize, customTerms });
        }
    };

    const { formatCurrency } = useCurrency();

    return (
        <AppLayout>
            <div className="container mx-auto px-4 py-8 animate-fade-in max-w-7xl">
                
                {/* HERO HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent p-6 rounded-2xl border border-primary/10">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            Premium Invoice Designer
                        </div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <Printer className="w-8 h-8 text-primary" />
                            Print Studio
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm md:text-base">
                            Select an industry-standard template, preview live billing layouts, and quickly generate client invoices.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* LEFT PANEL: SELECTORS (col-span-4) */}
                    <div className="lg:col-span-4 space-y-6">
                        
                        {/* 1. Choose Template Card */}
                        <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-4">
                            <h2 className="text-base font-bold flex items-center gap-2 border-b pb-3">
                                <LayoutTemplate className="w-4 h-4 text-primary" />
                                1. Choose Template
                            </h2>
                            <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-1">
                                {invoiceThemes.map((theme) => {
                                    const meta = themeMeta[theme];
                                    const isSelected = selectedTheme === theme;
                                    return (
                                        <button
                                            key={theme}
                                            onClick={() => handleThemeSelect(theme)}
                                            className={cn(
                                                "w-full text-left p-3 rounded-xl border-2 transition-all flex items-start gap-3",
                                                isSelected 
                                                    ? "border-primary bg-primary/5 ring-2 ring-primary/15" 
                                                    : "border-border hover:bg-muted/50"
                                            )}
                                        >
                                            <div className={cn("w-6 h-6 rounded-md flex-shrink-0 mt-0.5 shadow-sm", meta.color)} />
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                                    {meta.name}
                                                    {isSelected && <Badge className="text-[8px] px-1 bg-primary text-white h-4">Default</Badge>}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 leading-tight">{meta.desc}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Choose Invoice / Recent Sales Card */}
                        <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-4">
                            <h2 className="text-base font-bold flex items-center gap-2 border-b pb-3">
                                <History className="w-4 h-4 text-primary" />
                                2. Choose Invoice Record
                            </h2>
                            
                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                                {isLoading ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3].map(i => <div key={i} className="w-full h-11 bg-muted animate-pulse rounded-lg" />)}
                                    </div>
                                ) : recentSales.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                                        <FileText className="w-6 h-6 mx-auto mb-1 opacity-40" />
                                        <p className="text-xs font-medium">No sales recorded yet</p>
                                        <p className="text-[10px] opacity-75 mt-0.5">Showing mock invoice preview</p>
                                    </div>
                                ) : (
                                    recentSales.map((sale: any) => {
                                        const isSelected = selectedSale?.id === sale.id;
                                        return (
                                            <button
                                                key={sale.id}
                                                onClick={() => setSelectedSale(sale)}
                                                className={cn(
                                                    "w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs",
                                                    isSelected
                                                        ? "border-primary bg-primary/5 font-semibold text-primary"
                                                        : "border-border hover:bg-muted/40 text-slate-700 dark:text-slate-200"
                                                )}
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-bold truncate">{sale.customer_name || "Walk-in Guest"}</p>
                                                    <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                                        <span>{sale.invoice_number || `INV-${sale.id.slice(0,6).toUpperCase()}`}</span>
                                                        <span>•</span>
                                                        <span>{format(new Date(sale.created_at), "MMM d")}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(sale.total_amount)}</span>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* 3. Page Layout Settings */}
                        <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-4">
                            <h2 className="text-base font-bold flex items-center gap-2 border-b pb-3">
                                <LayoutTemplate className="w-4 h-4 text-primary" />
                                3. Page Layout Settings
                            </h2>
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 block">Select Print Page Size</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => handlePageSizeChange('a4')}
                                        className={cn(
                                            "p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5",
                                            pageSize === 'a4'
                                                ? "border-primary bg-primary/5 text-primary font-bold"
                                                : "border-border hover:bg-muted text-slate-600 dark:text-slate-300"
                                        )}
                                    >
                                        <FileText className="w-5 h-5" />
                                        <div className="text-center">
                                            <span className="text-xs block font-bold">A4 Sheet</span>
                                            <span className="text-[9px] opacity-75 block mt-0.5">210 x 297 mm</span>
                                        </div>
                                    </button>
                                    
                                    <button
                                        onClick={() => handlePageSizeChange('a5')}
                                        className={cn(
                                            "p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5",
                                            pageSize === 'a5'
                                                ? "border-primary bg-primary/5 text-primary font-bold"
                                                : "border-border hover:bg-muted text-slate-600 dark:text-slate-300"
                                        )}
                                    >
                                        <FileText className="w-4 h-4" />
                                        <div className="text-center">
                                            <span className="text-xs block font-bold">A5 Sheet</span>
                                            <span className="text-[9px] opacity-75 block mt-0.5">148 x 210 mm</span>
                                        </div>
                                    </button>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    A4 is standard for long tax invoices. A5 is a compact ledger format ideal for shorter bills to save paper.
                                </p>
                            </div>
                        </div>

                        {/* 4. Terms & Conditions Card */}
                        <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-4">
                            <h2 className="text-base font-bold flex items-center gap-2 border-b pb-3">
                                <FileCheck className="w-4 h-4 text-primary" />
                                4. Terms & Conditions
                            </h2>
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Custom Terms / Declaration</label>
                                <textarea
                                    value={customTerms}
                                    onChange={(e) => handleTermsChange(e.target.value)}
                                    placeholder="Type your payment terms, return policy, or legal declaration here..."
                                    className="w-full text-xs p-3 rounded-xl border border-input bg-background min-h-[90px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all resize-none"
                                />
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    This text will be printed in the footer (or as the legal declaration/verification block) of your invoice. Leaving it empty will print template defaults.
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT PANEL: LIVE PREVIEW & TOOLBAR (col-span-8) */}
                    <div className="lg:col-span-8 space-y-4">
                        
                        {/* Interactive Toolbar */}
                        <div className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-sm flex items-center gap-1.5">
                                    <Eye className="w-4 h-4 text-indigo-500" />
                                    Live Invoice Preview
                                </h3>
                                <p className="text-[10px] text-muted-foreground">Showing: {selectedSale ? selectedSale.invoice_number : "Sample Invoice Template"}</p>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                <Button
                                    onClick={() => handlePrintSale(activeSaleData)}
                                    className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 flex-1 sm:flex-initial"
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
                                                { action: 'preview', theme: selectedTheme as InvoicePdfTheme, pageSize, customTerms }
                                            );
                                        }}
                                        className="rounded-xl text-xs h-9 border-border flex items-center gap-1.5 flex-1 sm:flex-initial"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        Print Preview
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Invoice Canvas Sheet Wrapper */}
                        <div className="bg-slate-100 dark:bg-slate-900/60 p-4 sm:p-8 border rounded-2xl flex justify-center items-start overflow-x-auto min-h-[750px] shadow-inner">
                            <div className={cn("w-full transition-all duration-300", pageSize === 'a5' ? "max-w-[500px]" : "max-w-[680px]")}>
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
        </AppLayout>
    );
};
export default PrintStudioPage;
