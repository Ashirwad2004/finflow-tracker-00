import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useMemo, useCallback } from "react";
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
    FileCheck,
    Landmark,
    QrCode,
    Percent,
    Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { 
    generateInvoicePDF, 
    InvoiceDetails, 
    InvoicePdfTheme, 
    PageSize,
    convertAmountToIndianWords,
    resolveInvoiceBankDetails,
    getStoredBankAccounts,
    BankDetailsInfo,
    UniversalDocumentType,
    resolveDocumentDescriptor
} from "@/utils/generateInvoicePDF";
import { printThermalReceipt } from "@/utils/printThermalReceipt";
import { printInvoiceDirectly, printPdfDirectly } from "@/utils/directPrint";
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
    "sale-invoice": { 
        name: "Sale Invoice", 
        desc: "Vyapar-style professional GST Tax Invoice with sky-blue header, dual metadata columns, and itemized tax grid.", 
        color: "bg-sky-500 text-white border border-sky-400",
        class: "border-sky-300 hover:border-sky-500"
    },
    "tally-accounting": { 
        name: "Tally ERP Standard", 
        desc: "Classic Indian GST Tax invoice with dual quadrants, HSN summary, and bank details.", 
        color: "bg-zinc-800 text-white border border-black",
        class: "border-slate-300 hover:border-slate-500"
    },
    "thermal": { 
        name: "Thermal POS Receipt", 
        desc: "Compact receipt format with barcode styling for 58mm/80mm thermal rolls.", 
        color: "bg-stone-300 text-stone-800 font-mono",
        class: "border-stone-300 hover:border-stone-400"
    }
};

const invoiceThemes = Object.keys(themeMeta) as InvoiceTheme[];

// Sample Sale Bill / Tax Invoice
const sampleSale = {
    id: "sample-id-12345",
    invoice_number: "INV-2026-089",
    date: new Date().toISOString().split("T")[0],
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
    amount_paid: 10000,
    balance_due: 5340,
    previous_balance: 8500,
    total_due_balance: 13840,
    party_pending_balance: 13840,
    status: "partial",
    payment_method: "upi",
    items: [
        { description: "Premium Software Subscription (Annual)", quantity: 1, price: 12000, total: 12000, hsn_code: "998313", unit: "pcs" },
        { description: "Developer API Integration Consultancy", quantity: 2, price: 1250, total: 2500, hsn_code: "998314", unit: "Hours" }
    ]
};

// Sample Purchase Bill
const samplePurchaseBill = {
    id: "sample-pb-1001",
    invoice_number: "BILL-2026-441",
    date: new Date().toISOString().split("T")[0],
    created_at: new Date().toISOString(),
    customer_name: "Apex Raw Materials & Logistics",
    customer_phone: "+91 94455 88990",
    customer_email: "orders@apexrawmaterials.in",
    customer_gstin: "29AABCA5566Z1Z8",
    subtotal: 38000,
    discount_amount: 2000,
    tax_rate: 18,
    tax_amount: 6480,
    total_amount: 42480,
    amount_paid: 20000,
    balance_due: 22480,
    previous_balance: 15000,
    total_due_balance: 37480,
    party_pending_balance: 37480,
    status: "partial",
    payment_method: "bank_transfer",
    items: [
        { description: "Industrial Grade Stainless Fasteners M8 (1000pcs)", quantity: 2, price: 11500, total: 23000, hsn_code: "731815", unit: "box" },
        { description: "Corrugated Export Packaging Cartons", quantity: 500, price: 30, total: 15000, hsn_code: "481910", unit: "pcs" }
    ]
};

// Sample Sale Order
const sampleSaleOrder = {
    id: "sample-so-2002",
    invoice_number: "SO-2026-015",
    date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    created_at: new Date().toISOString(),
    customer_name: "Bharat Retail Networks Pvt Ltd",
    customer_phone: "+91 98111 22334",
    customer_email: "procurement@bharatretail.com",
    customer_gstin: "07AAACB2233M1ZU",
    subtotal: 55000,
    discount_amount: 2500,
    tax_rate: 18,
    tax_amount: 9450,
    total_amount: 61950,
    amount_paid: 30000,
    balance_due: 31950,
    previous_balance: 12500,
    total_due_balance: 44450,
    party_pending_balance: 44450,
    status: "confirmed",
    payment_method: "upi",
    items: [
        { description: "Enterprise Cloud ERP Annual License Seat", quantity: 5, price: 8000, total: 40000, hsn_code: "998313", unit: "licenses" },
        { description: "On-site Deployment & Training Services", quantity: 1, price: 15000, total: 15000, hsn_code: "998319", unit: "session" }
    ]
};

// Sample Purchase Order
const samplePurchaseOrder = {
    id: "sample-po-3003",
    invoice_number: "PO-2026-088",
    date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    created_at: new Date().toISOString(),
    customer_name: "Global Components Fabricators Corp",
    customer_phone: "+91 97222 44556",
    customer_email: "supply@globalcomponents.com",
    customer_gstin: "24AAACG8899K1Z5",
    subtotal: 78000,
    discount_amount: 3000,
    tax_rate: 18,
    tax_amount: 13500,
    total_amount: 88500,
    amount_paid: 0,
    balance_due: 88500,
    previous_balance: 20000,
    total_due_balance: 108500,
    party_pending_balance: 108500,
    status: "sent",
    payment_method: "cheque",
    items: [
        { description: "High Precision CNC Aluminium Enclosures", quantity: 40, price: 1200, total: 48000, hsn_code: "761699", unit: "pcs" },
        { description: "Custom Molded Silicon Dampening Gaskets", quantity: 600, price: 50, total: 30000, hsn_code: "401693", unit: "pcs" }
    ]
};

// ── INTERACTIVE MOCK PREVIEW COMPONENT ──
const InvoiceMockPreview = ({ 
    sale, 
    profile, 
    theme, 
    formatCurrency,
    pageSize,
    customTerms,
    printBankDetails,
    bankAccount,
    printUpiQr,
    upiId,
    showItemTaxRate,
    showPartyPreviousBalance,
    showPartyPendingBalance,
    documentType = 'invoice'
}: { 
    sale: any; 
    profile: any; 
    theme: InvoiceTheme; 
    formatCurrency: (n: number) => string;
    pageSize: PageSize;
    customTerms: string;
    printBankDetails?: boolean;
    bankAccount?: BankDetailsInfo | null;
    printUpiQr?: boolean;
    upiId?: string;
    showItemTaxRate?: boolean;
    showPartyPreviousBalance?: boolean;
    showPartyPendingBalance?: boolean;
    documentType?: UniversalDocumentType;
}) => {
    const descriptor = resolveDocumentDescriptor(documentType, undefined, sale?.invoice_number);
    const bizName = profile?.business_name || profile?.display_name || "RupeeBill Ventures";
    const dateToParse = sale.date || sale.created_at;
    const parsedDate = dateToParse ? new Date(dateToParse) : new Date();
    const dateFormatted = isNaN(parsedDate.getTime()) ? format(new Date(), "dd MMM yyyy") : format(parsedDate, "dd MMM yyyy");
    
    const items = sale.items || [];
    const taxAmount = sale.tax_amount || 0;
    const discount = sale.discount_amount || 0;
    const subtotal = sale.subtotal || sale.total_amount;
    const totalAmount = sale.total_amount;

    const isPaid = sale.status === 'paid' || (sale.balance_due !== undefined && Number(sale.balance_due) <= 0 && sale.status !== 'pending');
    const amountPaid = sale.amount_paid !== undefined 
        ? Number(sale.amount_paid) 
        : (isPaid ? totalAmount : 0);
    const balanceDue = sale.balance_due !== undefined 
        ? Number(sale.balance_due) 
        : Math.max(0, totalAmount - amountPaid);
    const isPartial = sale.status === 'partial' || (amountPaid > 0 && balanceDue > 0);

    const isPartyBalEnabled = showPartyPendingBalance !== undefined ? showPartyPendingBalance : (showPartyPreviousBalance ?? true);
    const isCashCustomer = ["cash customer", "cash sale", "walk-in", "cash"].includes((sale.customer_name || "").trim().toLowerCase());
    const shouldRenderPartyBal = isPartyBalEnabled && !isCashCustomer;

    const partyPrevBal = (sale.previous_balance !== undefined && sale.previous_balance !== null) 
        ? Number(sale.previous_balance) 
        : (sale.customer_name && !isCashCustomer ? 8500 : 0);
    const partyClosingDue = (sale.party_pending_balance !== undefined && sale.party_pending_balance !== null)
        ? Number(sale.party_pending_balance)
        : ((sale.total_due_balance !== undefined && sale.total_due_balance !== null) ? Number(sale.total_due_balance) : (partyPrevBal + balanceDue));

    const effectiveUpi = (upiId || profile?.upi_id || localStorage.getItem("rupeebill_upi_id") || "").trim();
    const amountToPay = balanceDue > 0 ? balanceDue : totalAmount;
    const upiUri = effectiveUpi 
        ? `upi://pay?pa=${encodeURIComponent(effectiveUpi)}&pn=${encodeURIComponent(bizName.slice(0, 50))}&am=${amountToPay.toFixed(2)}&cu=INR&tn=${encodeURIComponent(descriptor.title)}-${encodeURIComponent(sale.invoice_number || 'DOC')}`
        : "";

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

    // 1. VYAPAR "SALE INVOICE" PREVIEW
    if (theme === 'sale-invoice') {
        const totalQty = items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0);
        const totalGst = items.reduce((acc: number, it: any) => {
            const lineTot = Number(it.total ?? (Number(it.quantity || 1) * Number(it.price || 0)));
            const tr = it.tax_rate !== undefined ? Number(it.tax_rate) : taxRate;
            return acc + (lineTot * tr / 100);
        }, 0);

        return (
            <div className={cn(
                "bg-white text-black p-4 mx-auto font-sans text-xs border border-black shadow-lg w-full flex flex-col justify-between select-none transition-all duration-300",
                pageSize === 'a5' ? "max-w-[500px] min-h-[530px]" : "max-w-[700px] min-h-[750px]"
            )}>
                {/* Outer border container */}
                <div className="border border-black flex-1 flex flex-col justify-between">
                    
                    {/* Header: Company Name & Address (Sky Blue Background #D9F0FC) */}
                    <div className="bg-[#D9F0FC] border-b border-black p-3 space-y-1">
                        <div>
                            <span className="font-bold text-xs">Company Name: </span>
                            <span className="font-extrabold text-sm">{bizName}</span>
                        </div>
                        <div className="text-[10px]">
                            <span className="font-bold">Address: </span>
                            <span>{profile?.business_address || "Store Address Not Specified"}</span>
                        </div>
                        <div className="grid grid-cols-2 text-[10px] pt-0.5">
                            <div>
                                <span className="font-bold">Phone No.: </span>
                                <span>{profile?.business_phone || "-"}</span>
                            </div>
                            <div>
                                <span className="font-bold">Email ID: </span>
                                <span>{profile?.email || "-"}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 text-[10px]">
                            <div>
                                <span className="font-bold">GSTIN No.: </span>
                                <span>{profile?.gst_number || "-"}</span>
                            </div>
                            <div>
                                <span className="font-bold">State: </span>
                                <span>{profile?.state || sale.place_of_supply || "State"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Ribbon Title Bar: TAX INVOICE */}
                    <div className="bg-[#98D5F7] border-b border-black text-center py-1 font-black text-xs uppercase tracking-wider text-black">
                        {descriptor.title || "TAX INVOICE"}
                    </div>

                    {/* Bill Details & Invoice Details Split Box */}
                    <div className="grid grid-cols-12 border-b border-black text-[10px]">
                        {/* Left 7 cols: Bill Details */}
                        <div className="col-span-7 p-2.5 border-r border-black space-y-1">
                            <span className="font-bold text-[11px] block">Bill Details</span>
                            <div>
                                <span className="font-bold">Party Name: </span>
                                <span className="font-semibold">{sale.customer_name || "Cash Customer"}</span>
                            </div>
                            <div>
                                <span className="font-bold">Address: </span>
                                <span>{sale.billing_address || sale.customer_address || "-"}</span>
                            </div>
                            <div className="grid grid-cols-2 pt-0.5">
                                <div>
                                    <span className="font-bold">Phone No.: </span>
                                    <span>{sale.customer_phone || "-"}</span>
                                </div>
                                <div>
                                    <span className="font-bold">Email ID: </span>
                                    <span>{sale.customer_email || "-"}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2">
                                <div>
                                    <span className="font-bold">GSTIN No.: </span>
                                    <span>{sale.customer_gstin || "-"}</span>
                                </div>
                                <div>
                                    <span className="font-bold">State: </span>
                                    <span>{sale.place_of_supply || profile?.state || "State"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right 5 cols: Invoice Details */}
                        <div className="col-span-5 p-2.5 space-y-1">
                            <span className="font-bold text-[11px] block">Invoice Details</span>
                            <div>
                                <span className="font-bold">Invoice No.: </span>
                                <span className="font-semibold">{sale.invoice_number}</span>
                            </div>
                            <div>
                                <span className="font-bold">Invoice Date: </span>
                                <span>{dateFormatted}</span>
                            </div>
                            <div>
                                <span className="font-bold">Time: </span>
                                <span>{format(new Date(), "hh:mm a")}</span>
                            </div>
                            <div>
                                <span className="font-bold">Place of Supply: </span>
                                <span>{sale.place_of_supply || profile?.state || "State"}</span>
                            </div>
                            <div>
                                <span className="font-bold">PO Date: </span>
                                <span>-</span>
                            </div>
                            <div>
                                <span className="font-bold">PO Number: </span>
                                <span>-</span>
                            </div>
                        </div>
                    </div>

                    {/* Items Table with Vyapar Columns */}
                    <div className="border-b border-black overflow-x-auto flex-1">
                        <table className="w-full text-left text-[9px] border-collapse">
                            <thead>
                                <tr className="bg-[#D9F0FC] border-b border-black text-[9px] font-bold text-black text-center">
                                    <th className="p-1 border-r border-black w-8">Sl. No.</th>
                                    <th className="p-1 border-r border-black text-left">Item Name</th>
                                    <th className="p-1 border-r border-black w-12">HSN/SAC</th>
                                    <th className="p-1 border-r border-black w-10">Batch No.</th>
                                    <th className="p-1 border-r border-black w-10">Exp. Date</th>
                                    <th className="p-1 border-r border-black w-10 text-right">MRP</th>
                                    <th className="p-1 border-r border-black w-8">QTY</th>
                                    <th className="p-1 border-r border-black w-8">Unit</th>
                                    <th className="p-1 border-r border-black w-12 text-right">Price/Unit</th>
                                    <th className="p-1 border-r border-black w-8">Disc</th>
                                    <th className="p-1 border-r border-black w-10">GST Rate</th>
                                    <th className="p-1 border-r border-black w-12 text-right">GST Amt</th>
                                    <th className="p-1 text-right w-14">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/30">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className="p-4 text-center text-muted-foreground italic">No items listed</td>
                                    </tr>
                                ) : (
                                    items.map((it: any, idx: number) => {
                                        const q = Number(it.quantity) || 1;
                                        const p = Number(it.price) || 0;
                                        const d = Number(it.discount || 0);
                                        const itTax = it.tax_rate !== undefined ? Number(it.tax_rate) : taxRate;
                                        const lineTot = Number(it.total ?? (q * p * (1 - d / 100)));
                                        const gAmt = lineTot * (itTax / 100);

                                        return (
                                            <tr key={idx} className="align-middle">
                                                <td className="p-1 border-r border-black text-center">{idx + 1}</td>
                                                <td className="p-1 border-r border-black font-semibold text-slate-800">{it.description}</td>
                                                <td className="p-1 border-r border-black text-center font-mono">{it.hsn_code || "-"}</td>
                                                <td className="p-1 border-r border-black text-center">-</td>
                                                <td className="p-1 border-r border-black text-center">-</td>
                                                <td className="p-1 border-r border-black text-right">{p > 0 ? p.toFixed(2) : "-"}</td>
                                                <td className="p-1 border-r border-black text-center">{q}</td>
                                                <td className="p-1 border-r border-black text-center">{it.unit || "PCS"}</td>
                                                <td className="p-1 border-r border-black text-right">{p.toFixed(2)}</td>
                                                <td className="p-1 border-r border-black text-center">{d > 0 ? `${d}%` : "-"}</td>
                                                <td className="p-1 border-r border-black text-center">{itTax > 0 ? `${itTax}%` : "0%"}</td>
                                                <td className="p-1 border-r border-black text-right">{gAmt.toFixed(2)}</td>
                                                <td className="p-1 text-right font-bold text-slate-900">{lineTot.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })
                                )}
                                {/* Total Row */}
                                <tr className="bg-slate-50 font-bold border-t border-black">
                                    <td className="p-1 border-r border-black text-center"></td>
                                    <td className="p-1 border-r border-black font-extrabold">Total</td>
                                    <td className="p-1 border-r border-black"></td>
                                    <td className="p-1 border-r border-black"></td>
                                    <td className="p-1 border-r border-black"></td>
                                    <td className="p-1 border-r border-black"></td>
                                    <td className="p-1 border-r border-black text-center font-extrabold">{totalQty}</td>
                                    <td className="p-1 border-r border-black"></td>
                                    <td className="p-1 border-r border-black"></td>
                                    <td className="p-1 border-r border-black"></td>
                                    <td className="p-1 border-r border-black"></td>
                                    <td className="p-1 border-r border-black text-right font-extrabold">{totalGst.toFixed(2)}</td>
                                    <td className="p-1 text-right font-extrabold">{Number(totalAmount).toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom Split Section: Left (Notes, Words, Terms) & Right (Totals & Signature) */}
                    <div className="grid grid-cols-12 min-h-[140px]">
                        {/* Left 7 cols: Description, Words, Terms */}
                        <div className="col-span-7 border-r border-black flex flex-col justify-between">
                            <div className="p-2 space-y-1">
                                <div className="text-[10px]">
                                    <span className="font-bold">Description: </span>
                                    <span>{sale.notes || "Goods once sold will not be taken back."}</span>
                                </div>
                            </div>

                            <div>
                                <div className="bg-[#D9F0FC] border-y border-black px-2 py-0.5 font-bold text-[9px]">
                                    Invoice Amount In Words:
                                </div>
                                <div className="px-2 py-1 text-[9px] font-semibold uppercase">
                                    {convertAmountToIndianWords(totalAmount)}
                                </div>
                            </div>

                            <div>
                                <div className="bg-[#D9F0FC] border-y border-black px-2 py-0.5 font-bold text-[9px]">
                                    Terms and Conditions:
                                </div>
                                <div className="px-2 py-1 text-[8px] text-slate-600">
                                    {customTerms || descriptor.defaultDeclaration}
                                </div>
                            </div>

                            {/* Bank Details / UPI if enabled */}
                            {(printBankDetails && bankAccount?.bankName) || (descriptor.enableUpiQr && printUpiQr && effectiveUpi) ? (
                                <div className="border-t border-black/20 p-2 flex items-center justify-between text-[8px] bg-slate-50/50">
                                    <div>
                                        {printBankDetails && bankAccount?.bankName && (
                                            <p className="font-semibold">Bank: {bankAccount.bankName} | A/c: {bankAccount.accountNumber} | IFSC: {bankAccount.ifscCode || ''}</p>
                                        )}
                                        {descriptor.enableUpiQr && printUpiQr && effectiveUpi && (
                                            <p className="font-mono pt-0.5">UPI: {effectiveUpi}</p>
                                        )}
                                    </div>
                                    {descriptor.enableUpiQr && printUpiQr && effectiveUpi && (
                                        <div className="bg-white p-0.5 border border-black/20 rounded">
                                            <QRCodeSVG value={upiUri} size={38} level="M" />
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        {/* Right 5 cols: Sub Total, Discount, Total, Received, Balance, Party Pending & Signature */}
                        <div className="col-span-5 flex flex-col justify-between">
                            <div className="p-2.5 space-y-1 text-[10px] border-b border-black">
                                <div className="flex justify-between">
                                    <span>Sub Total</span>
                                    <span>{formatCurrency(subtotal).replace("Rs. ","")}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-rose-700">
                                        <span>Discount</span>
                                        <span>-{formatCurrency(discount).replace("Rs. ","")}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-xs pt-0.5">
                                    <span>Total Amount</span>
                                    <span>{formatCurrency(totalAmount).replace("Rs. ","")}</span>
                                </div>
                                <div className="flex justify-between text-emerald-800">
                                    <span>Received</span>
                                    <span>{formatCurrency(amountPaid).replace("Rs. ","")}</span>
                                </div>
                                <div className="flex justify-between font-bold pt-0.5">
                                    <span>Balance Amount:</span>
                                    <span>{formatCurrency(balanceDue).replace("Rs. ","")}</span>
                                </div>

                                {/* Party Pending Balance (when enabled) */}
                                {shouldRenderPartyBal && (
                                    <div className="border-t border-dashed border-black/40 pt-1 mt-1 space-y-0.5 text-[9px]">
                                        <div className="flex justify-between text-slate-600">
                                            <span>Previous Pending:</span>
                                            <span>
                                                {partyPrevBal > 0 
                                                    ? `${formatCurrency(partyPrevBal).replace("Rs. ","")} Dr`
                                                    : partyPrevBal < 0 
                                                        ? `${formatCurrency(Math.abs(partyPrevBal)).replace("Rs. ","")} Cr` 
                                                        : "0.00"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between font-bold text-black">
                                            <span>{partyClosingDue < 0 ? "Advance Balance:" : "Pending Balance:"}</span>
                                            <span>
                                                {partyClosingDue > 0 
                                                    ? `${formatCurrency(partyClosingDue).replace("Rs. ","")} Dr`
                                                    : partyClosingDue < 0 
                                                        ? `${formatCurrency(Math.abs(partyClosingDue)).replace("Rs. ","")} Cr` 
                                                        : "0.00"}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Company Seal & Signature Box */}
                            <div className="p-2 text-center flex flex-col items-center justify-end min-h-[60px]">
                                {profile?.signature_url && (
                                    <img src={profile.signature_url} alt="Signature" className="h-8 max-w-[120px] object-contain mb-1" />
                                )}
                                <span className="font-bold text-[9px] block">Company Seal & Signature</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    // 2. TALLY ERP GST TAX INVOICE PREVIEW
    if (theme === 'tally-accounting') {
        return (
            <div className={cn(
                "bg-white text-black p-5 mx-auto font-sans text-xs border border-black shadow-lg w-full flex flex-col justify-between select-none transition-all duration-300",
                pageSize === 'a5' ? "max-w-[500px] min-h-[530px]" : "max-w-[680px] min-h-[750px]"
            )}>
                {/* Header label */}
                <div className="text-center font-bold text-sm tracking-wide border-b border-black pb-2 mb-2">
                    {descriptor.title}
                </div>
                
                {/* Seller & Invoice Details Grid (Quadrants) */}
                <div className="grid grid-cols-2 border border-black">
                    {/* Top Left: Seller Details */}
                    <div className="p-2.5 border-r border-b border-black space-y-1">
                        <span className="text-[9px] uppercase text-slate-500 font-bold block">{descriptor.senderLabel}</span>
                        <div className="font-extrabold text-xs">{bizName}</div>
                        {profile?.business_address && <p className="text-[10px] text-slate-700 leading-tight">{profile.business_address}</p>}
                        {profile?.business_phone && <p className="text-[10px] text-slate-700">Phone: {profile.business_phone}</p>}
                        {profile?.gst_number && <p className="text-[10px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded w-max mt-0.5">GSTIN: {profile.gst_number}</p>}
                    </div>
                    
                    {/* Top Right: Invoice Metadata */}
                    <div className="p-2.5 border-b border-black grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] content-start">
                        <div>
                            <span className="text-slate-500 block text-[9px]">{descriptor.numberLabel}</span>
                            <span className="font-bold text-xs">{sale.invoice_number}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[9px]">{descriptor.dateLabel}</span>
                            <span className="font-bold">{dateFormatted}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[9px]">{sale.due_date ? descriptor.dueDateLabel : "Delivery Note"}</span>
                            <span className="font-medium">{sale.due_date ? format(new Date(sale.due_date), "dd MMM yyyy") : "Direct Delivery"}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[9px]">Terms / Mode</span>
                            <span className={cn("font-bold text-[10px]", balanceDue <= 0 ? "text-emerald-700" : "text-amber-700")}>
                                {balanceDue <= 0 ? "Paid" : isPartial ? `Partial (Due: ₹${balanceDue.toFixed(2)})` : "Pending"}
                            </span>
                        </div>
                    </div>
                    
                    {/* Bottom Left: Buyer details */}
                    <div className="p-2.5 border-r border-black space-y-1">
                        <span className="text-[9px] uppercase text-slate-500 font-bold block">{descriptor.partyLabel}</span>
                        <div className="font-bold text-[11px]">{sale.customer_name || "Walk-in Guest"}</div>
                        {sale.customer_phone && <p className="text-[10px] text-slate-700">Phone: {sale.customer_phone}</p>}
                        {sale.customer_email && <p className="text-[10px] text-slate-700">Email: {sale.customer_email}</p>}
                        {sale.customer_gstin && <p className="text-[10px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded w-max mt-0.5">GSTIN: {sale.customer_gstin}</p>}
                    </div>
                    
                    {/* Bottom Right: Consignee Details */}
                    <div className="p-2.5 space-y-1">
                        <span className="text-[9px] uppercase text-slate-500 font-bold block">{descriptor.consigneeLabel}</span>
                        <div className="font-bold text-[11px]">{sale.customer_name || "Walk-in Guest"}</div>
                        <p className="text-[10px] text-slate-600 italic">Same as billing address</p>
                    </div>
                </div>

                {/* Items Table: Standard 6 columns with exact matching spacer */}
                <div className="mt-3 border border-black overflow-hidden flex-1 flex flex-col justify-start">
                    <table className="w-full h-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-100/50 border-b border-black text-[9px] font-bold tracking-wider text-black">
                                <th className="p-2 border-r border-black text-center w-10">S.No</th>
                                <th className="p-2 border-r border-black">Description of Goods</th>
                                <th className="p-2 border-r border-black text-center w-12">Qty</th>
                                <th className="p-2 border-r border-black text-right w-24">Rate</th>
                                <th className="p-2 border-r border-black text-center w-12">per</th>
                                {showItemTaxRate && (
                                    <th className="p-2 border-r border-black text-center w-14">Tax %</th>
                                )}
                                <th className="p-2 text-right w-28">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/30 text-slate-950 font-mono text-[10px]">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={showItemTaxRate ? 7 : 6} className="p-6 text-center text-muted-foreground italic">No items listed.</td>
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
                                        <td className="p-2 border-r border-b border-black text-right">{formatCurrency(item.price).replace("Rs. ","")}</td>
                                        <td className="p-2 border-r border-b border-black text-center font-sans">{item.unit || "pcs"}</td>
                                        {showItemTaxRate && (
                                            <td className="p-2 border-r border-b border-black text-center font-sans text-[9px] font-semibold text-slate-700">
                                                {item.tax_rate !== undefined ? `${item.tax_rate}%` : (taxRate > 0 ? `${taxRate}%` : '0%')}
                                            </td>
                                        )}
                                        <td className="p-2 border-b border-black text-right font-bold text-slate-900">{formatCurrency(item.total ?? (Number(item.quantity ?? 1) * Number(item.price))).replace("Rs. ","")}</td>
                                    </tr>
                                ))
                            )}
                            {/* Empty spacer row matching column count */}
                            <tr className="h-full">
                                <td className="p-2 border-r border-black"></td>
                                <td className="p-2 border-r border-black"></td>
                                <td className="p-2 border-r border-black"></td>
                                <td className="p-2 border-r border-black"></td>
                                <td className="p-2 border-r border-black"></td>
                                {showItemTaxRate && <td className="p-2 border-r border-black"></td>}
                                <td className="p-2"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer Section split vertically */}
                <div className="mt-3 grid grid-cols-12 border border-black min-h-[160px]">
                    {/* Left 8 columns: Words, Bank Details (if enabled & real), Declaration */}
                    <div className="col-span-8 p-3 border-r border-black flex flex-col justify-between space-y-2.5">
                        <div className="space-y-0.5">
                            <span className="text-[8px] text-slate-500 font-bold block uppercase">Amount Chargeable (in words)</span>
                            <span className="font-bold text-[9.5px] uppercase">{convertAmountToIndianWords(totalAmount)}</span>
                        </div>

                        {(printBankDetails && bankAccount?.bankName) || (descriptor.enableUpiQr && printUpiQr && effectiveUpi) ? (
                            <div className="border-t border-black/10 pt-2 flex items-center justify-between gap-3 text-[9px] text-slate-700">
                                <div className="space-y-0.5 min-w-0">
                                    {printBankDetails && bankAccount?.bankName && (
                                        <>
                                            <p className="font-bold text-[9.5px] text-slate-900">Company's Bank Details</p>
                                            <p>Bank Name: {bankAccount.bankName}</p>
                                            <p>A/c No: {bankAccount.accountNumber} {bankAccount.ifscCode ? ` | IFSC: ${bankAccount.ifscCode}` : ''} {bankAccount.branchName ? ` | Branch: ${bankAccount.branchName}` : ''}</p>
                                        </>
                                    )}
                                    {descriptor.enableUpiQr && printUpiQr && effectiveUpi && (
                                        <div className="pt-0.5">
                                            <span className="font-bold text-[9px] text-slate-900">Instant UPI: </span>
                                            <span className="font-mono text-slate-800">{effectiveUpi}</span>
                                        </div>
                                    )}
                                </div>
                                {descriptor.enableUpiQr && printUpiQr && effectiveUpi && (
                                    <div className="flex flex-col items-center flex-shrink-0 bg-white p-1 border border-black/20 rounded shadow-2xs">
                                        <QRCodeSVG value={upiUri} size={52} level="M" />
                                        <span className="text-[6.5px] font-bold mt-0.5 tracking-tight text-slate-800">SCAN TO PAY</span>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        <div className="border-t border-black/10 pt-2 text-[8px] text-slate-500">
                            <span className="font-bold text-[9px] text-slate-700 block mb-0.5">Declaration</span>
                            {customTerms || descriptor.defaultDeclaration}
                        </div>

                        <div className="text-[7px] text-slate-400 pt-1">
                            Customer's Seal and Signature
                        </div>
                    </div>
                    
                    {/* Right 4 columns: Totals summary and Signatory box */}
                    <div className="col-span-4 flex flex-col justify-between">
                        {/* Summary details */}
                        <div className="p-2.5 space-y-1 text-[10px] border-b border-black bg-slate-50/50">
                            <div className="flex justify-between">
                                <span className="text-slate-500">{descriptor.subtotalLabel}</span>
                                <span>{formatCurrency(subtotal).replace("Rs. ","")}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-rose-700 font-bold">
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
                            <div className="border-t border-black/20 my-0.5"></div>
                            <div className="flex justify-between font-extrabold text-[11px]">
                                <span>{descriptor.totalLabel}</span>
                                <span>{formatCurrency(totalAmount).replace("Rs. ","")}</span>
                            </div>
                            <div className="border-t border-black/20 my-0.5"></div>
                            <div className="flex justify-between text-emerald-700 font-semibold text-[10px]">
                                <span>{descriptor.paidLabel}</span>
                                <span>{formatCurrency(amountPaid).replace("Rs. ","")}</span>
                            </div>
                            <div className={cn("flex justify-between text-[10px] font-bold", balanceDue > 0 ? "text-rose-700" : "text-emerald-700")}>
                                <span>{descriptor.balanceLabel}</span>
                                <span>{balanceDue > 0 ? formatCurrency(balanceDue).replace("Rs. ","") : "0.00 (PAID)"}</span>
                            </div>
                            {shouldRenderPartyBal && (
                                <>
                                    <div className="border-t border-dashed border-black/30 my-0.5"></div>
                                    <div className="flex justify-between text-[10px] text-slate-700">
                                        <span>Previous Pending</span>
                                        <span>
                                            {partyPrevBal > 0 
                                                ? `${formatCurrency(partyPrevBal).replace("Rs. ","")} Dr` 
                                                : partyPrevBal < 0 
                                                    ? `${formatCurrency(Math.abs(partyPrevBal)).replace("Rs. ","")} Cr` 
                                                    : "0.00"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-[11px] font-black text-rose-800 bg-rose-50/70 px-1 py-0.5 rounded-xs border border-rose-200 mt-0.5">
                                        <span>Pending Balance</span>
                                        <span>
                                            {partyClosingDue > 0 
                                                ? `${formatCurrency(partyClosingDue).replace("Rs. ","")} Dr` 
                                                : partyClosingDue < 0 
                                                    ? `${formatCurrency(Math.abs(partyClosingDue)).replace("Rs. ","")} Cr` 
                                                    : "0.00 (SETTLED)"}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                        
                        {/* Signatory Box */}
                        <div className="p-2.5 text-center space-y-1 flex flex-col justify-between h-full bg-white">
                            <span className="text-[8.5px] font-bold block text-left">for {bizName.toUpperCase()}</span>
                            {profile?.signature_url && (
                                <img src={profile.signature_url} alt="Signature" className="h-7 object-contain mx-auto my-0.5" />
                            )}
                            <span className="text-[8px] font-medium block text-slate-500">{descriptor.signatoryRoleText}</span>
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
                    <div className="flex justify-between"><span>{descriptor.numberLabel.toUpperCase()}: {sale.invoice_number}</span></div>
                    <div className="flex justify-between"><span>{descriptor.dateLabel.toUpperCase()}: {dateFormatted}</span></div>
                    <div className="flex justify-between"><span>{descriptor.partyLabel.toUpperCase()}: {sale.customer_name || "CASH"}</span></div>
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
                    <div className="flex justify-between"><span>{descriptor.subtotalLabel.toUpperCase()}</span><span>₹{subtotal.toFixed(2)}</span></div>
                    {discount > 0 && <div className="flex justify-between"><span>DISCOUNT</span><span>-₹{discount.toFixed(2)}</span></div>}
                    {taxAmount > 0 && (
                        <>
                            <div className="flex justify-between"><span>CGST ({taxRate/2}%)</span><span>₹{cgst}</span></div>
                            <div className="flex justify-between"><span>SGST ({taxRate/2}%)</span><span>₹{sgst}</span></div>
                        </>
                    )}
                    <div className="border-b border-dashed border-black/40 my-1"></div>
                    <div className="flex justify-between font-bold text-sm"><span>{descriptor.totalLabel.toUpperCase()}</span><span>₹{totalAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between text-[11px] font-semibold text-emerald-800"><span>{descriptor.paidLabel.toUpperCase()}</span><span>₹{amountPaid.toFixed(2)}</span></div>
                    <div className={cn("flex justify-between text-[11px] font-bold", balanceDue > 0 ? "text-rose-700" : "text-emerald-800")}>
                        <span>{descriptor.balanceLabel.toUpperCase()}</span>
                        <span>{balanceDue > 0 ? `₹${balanceDue.toFixed(2)} (PENDING)` : "₹0.00 (PAID)"}</span>
                    </div>
                    {shouldRenderPartyBal && (
                        <>
                            <div className="border-b border-dashed border-black/40 my-1"></div>
                            <div className="flex justify-between text-[10px] text-slate-700">
                                <span>PREV PENDING:</span>
                                <span>
                                    {partyPrevBal > 0 
                                        ? `₹${partyPrevBal.toFixed(2)} Dr` 
                                        : partyPrevBal < 0 
                                            ? `₹${Math.abs(partyPrevBal).toFixed(2)} Cr` 
                                            : "₹0.00"}
                                </span>
                            </div>
                            <div className="flex justify-between text-[11px] font-black">
                                <span>PENDING BAL:</span>
                                <span>
                                    {partyClosingDue > 0 
                                        ? `₹${partyClosingDue.toFixed(2)} Dr` 
                                        : partyClosingDue < 0 
                                            ? `₹${Math.abs(partyClosingDue).toFixed(2)} Cr` 
                                            : "₹0.00 (SETTLED)"}
                                </span>
                            </div>
                        </>
                    )}
                </div>
                
                <div className="border-b border-dashed border-black my-2"></div>
                <div className="text-center text-[10px] space-y-1 my-4">
                    <p className="font-bold">*** THANK YOU ***</p>
                    <p>PLEASE VISIT AGAIN</p>
                </div>
                
                {/* Thermal UPI QR Code or Barcode */}
                {descriptor.enableUpiQr && printUpiQr && effectiveUpi ? (
                    <div className="flex flex-col items-center justify-center mt-4">
                        <div className="p-1.5 bg-white border border-black rounded shadow-2xs">
                            <QRCodeSVG value={upiUri} size={68} level="M" />
                        </div>
                        <p className="text-[9px] font-bold mt-1 tracking-tight">SCAN TO PAY VIA UPI</p>
                        <p className="text-[8px] opacity-75 font-mono">{effectiveUpi}</p>
                    </div>
                ) : (
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
                )}
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
        "sale-invoice": {
            header: "bg-[#D9F0FC] text-slate-900 border-b border-black",
            accentText: "text-sky-800",
            accentBg: "bg-sky-50",
            tableHead: "bg-[#D9F0FC] text-slate-900",
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
                    <h1 className="text-3xl font-black tracking-tight leading-none uppercase">{descriptor.title}</h1>
                    <p className="text-xs font-semibold opacity-90 mt-2">{descriptor.numberLabel} {sale.invoice_number}</p>
                    <p className="text-xs opacity-90 mt-0.5">{descriptor.dateLabel}: {dateFormatted}</p>
                </div>
            </div>

            {/* BILL DETAILS */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100">
                <div className="space-y-1">
                    <h4 className={cn("text-xs font-bold uppercase tracking-wider", styles.accentText)}>{descriptor.partyLabel}</h4>
                    <div className="text-sm font-bold text-slate-800">{sale.customer_name || "Walk-in Guest"}</div>
                    {sale.customer_phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {sale.customer_phone}</div>}
                    {sale.customer_email && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {sale.customer_email}</div>}
                    {sale.customer_gstin && <div className="text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded w-max mt-1">GSTIN: {sale.customer_gstin}</div>}
                </div>
                
                <div className="space-y-1 text-left md:text-right flex flex-col md:items-end justify-center">
                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Status</div>
                    <Badge className="bg-emerald-500/10 hover:bg-emerald-500/10 border-transparent text-emerald-700 dark:text-emerald-400 font-bold uppercase text-[10px] tracking-wider mt-1 px-3 py-1">
                        {balanceDue <= 0 ? "PAID / SETTLED" : isPartial ? `PARTIAL (DUE: ₹${balanceDue.toFixed(2)})` : "PENDING"}
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
                                {showItemTaxRate && <th className="p-3 text-center">Tax %</th>}
                                <th className="p-3 text-right">Unit Price</th>
                                <th className="p-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={showItemTaxRate ? 5 : 4} className="p-6 text-center text-muted-foreground italic">No items listed in this document.</td>
                                </tr>
                            ) : (
                                items.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3">
                                            <div className="font-semibold text-slate-800">{item.description}</div>
                                            {item.hsn_code && <div className="text-[9px] text-muted-foreground mt-0.5">HSN: {item.hsn_code}</div>}
                                        </td>
                                        <td className="p-3 text-center font-medium">{item.quantity ?? 1}</td>
                                        {showItemTaxRate && (
                                            <td className="p-3 text-center font-medium text-slate-600">{item.tax_rate !== undefined ? `${item.tax_rate}%` : taxRate > 0 ? `${taxRate}%` : '—'}</td>
                                        )}
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
                <div className="text-[11px] text-slate-500 space-y-2.5 flex flex-col justify-end">
                    {descriptor.enableUpiQr && printUpiQr && effectiveUpi && (
                        <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-white shadow-xs">
                            <div className="p-1 rounded bg-slate-50 border flex-shrink-0">
                                <QRCodeSVG value={upiUri} size={56} level="M" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                                <div className="text-[11px] font-bold text-primary flex items-center gap-1">
                                    <QrCode className="w-3.5 h-3.5" />
                                    Scan & Pay via UPI
                                </div>
                                <div className="text-[9px] text-muted-foreground">Google Pay • PhonePe • Paytm • BHIM</div>
                                <div className="text-[10px] font-mono font-semibold text-slate-800 truncate">
                                    {effectiveUpi}
                                </div>
                                <div className="text-[10px] font-bold text-emerald-700">
                                    Amount: {formatCurrency(balanceDue > 0 ? balanceDue : totalAmount)}
                                </div>
                            </div>
                        </div>
                    )}
                    {printBankDetails && bankAccount?.bankName && (
                        <div className="p-2 rounded-lg border bg-slate-50/80 text-[10px] space-y-0.5">
                            <div className="font-bold text-slate-800">Bank Transfer</div>
                            <div>{bankAccount.bankName} • A/c: {bankAccount.accountNumber}</div>
                            <div className="text-slate-500">IFSC: {bankAccount.ifscCode}</div>
                        </div>
                    )}
                    <div className="space-y-0.5">
                        <p className="font-bold text-slate-700 uppercase tracking-wider">Terms & Declarations</p>
                        <p className="leading-relaxed">{customTerms || descriptor.defaultDeclaration}</p>
                    </div>
                </div>
                
                {/* Financial Summary */}
                <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                        <span>{descriptor.subtotalLabel}</span>
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
                        <span>{descriptor.totalLabel}</span>
                        <span className={cn("text-base font-extrabold", styles.accentText)}>{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between px-3 py-1 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                        <span>{descriptor.paidLabel}</span>
                        <span>{formatCurrency(amountPaid)}</span>
                    </div>
                    <div className={cn("flex justify-between px-3 py-1.5 rounded-md font-bold text-xs", balanceDue > 0 ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400" : "text-emerald-700")}>
                        <span>{descriptor.balanceLabel}</span>
                        <span>{balanceDue > 0 ? formatCurrency(balanceDue) : "₹0.00 (Fully Settled)"}</span>
                    </div>
                    {shouldRenderPartyBal && (
                        <div className="mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-1">
                            <div className="flex justify-between px-3 py-1 text-xs text-slate-600 dark:text-slate-400">
                                <span>Previous Pending</span>
                                <span className="font-semibold">
                                    {partyPrevBal > 0 
                                        ? `${formatCurrency(partyPrevBal)} Dr` 
                                        : partyPrevBal < 0 
                                            ? `${formatCurrency(Math.abs(partyPrevBal))} Cr` 
                                            : "₹0.00"}
                                </span>
                            </div>
                            <div className="flex justify-between px-3 py-1.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/50 text-xs font-black text-indigo-950 dark:text-indigo-200 shadow-xs">
                                <span>Pending Balance</span>
                                <span className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300">
                                    {partyClosingDue > 0 
                                        ? `${formatCurrency(partyClosingDue)} Dr` 
                                        : partyClosingDue < 0 
                                            ? `${formatCurrency(Math.abs(partyClosingDue))} Cr` 
                                            : "₹0.00 (Settled)"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Signature Area */}
            {profile?.signature_url && (
                <div className="px-6 pb-6 flex justify-end">
                    <div className="text-right space-y-1">
                        <img src={profile.signature_url} alt="Signature" className="h-10 object-contain ml-auto opacity-90 max-w-[120px]" />
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">{descriptor.signatoryRoleText}</div>
                    </div>
                </div>
            )}
        </div>
    );
};


const PrintStudioPage = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedTheme, setSelectedTheme] = useState<InvoiceTheme>("startup-gradient");
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [selectedDocType, setSelectedDocType] = useState<UniversalDocumentType>("invoice");
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

    // Bank Details Preferences
    const [printBankDetails, setPrintBankDetails] = useState<boolean>(() => {
        const saved = localStorage.getItem("rupeebill_print_bank_details");
        return saved !== "false";
    });

    const handlePrintBankToggle = (checked: boolean) => {
        setPrintBankDetails(checked);
        localStorage.setItem("rupeebill_print_bank_details", checked ? "true" : "false");
        toast.success(checked ? "Bank details enabled on invoices" : "Bank details hidden from invoices");
    };

    // UPI Payment QR Preferences
    const [printUpiQr, setPrintUpiQr] = useState<boolean>(() => {
        const saved = localStorage.getItem("rupeebill_print_upi_qr");
        return saved !== "false";
    });

    const handlePrintUpiToggle = (checked: boolean) => {
        setPrintUpiQr(checked);
        localStorage.setItem("rupeebill_print_upi_qr", checked ? "true" : "false");
        toast.success(checked ? "UPI QR code enabled on invoices" : "UPI QR code hidden from invoices");
    };

    // Product Tax % on Bill Preferences
    const [showItemTaxRate, setShowItemTaxRate] = useState<boolean>(() => {
        const saved = localStorage.getItem("rupeebill_show_item_tax_rate_on_bill");
        return saved === "true";
    });

    const handleShowItemTaxToggle = (checked: boolean) => {
        setShowItemTaxRate(checked);
        localStorage.setItem("rupeebill_show_item_tax_rate_on_bill", checked ? "true" : "false");
        toast.success(checked ? "Product Tax % enabled on bills/invoices" : "Product Tax % hidden from bills/invoices");
    };

    // Party Previous / Pending Balance Preferences
    const [showPartyPreviousBalance, setShowPartyPreviousBalance] = useState<boolean>(() => {
        const savedPending = localStorage.getItem("rupeebill_show_party_pending_balance");
        if (savedPending !== null) return savedPending !== "false";
        const saved = localStorage.getItem("rupeebill_show_party_previous_balance");
        return saved !== "false";
    });

    const handleShowPartyPreviousBalanceToggle = (checked: boolean) => {
        setShowPartyPreviousBalance(checked);
        localStorage.setItem("rupeebill_show_party_pending_balance", checked ? "true" : "false");
        localStorage.setItem("rupeebill_show_party_previous_balance", checked ? "true" : "false");
        toast.success(checked ? "Party pending balance enabled on invoices" : "Party pending balance hidden from invoices");
    };

    const [upiIdInput, setUpiIdInput] = useState<string>(() => {
        return localStorage.getItem("rupeebill_upi_id") || "";
    });

    const handleSaveUpiId = async (newUpi: string) => {
        const trimmed = newUpi.trim();
        setUpiIdInput(trimmed);
        if (trimmed) {
            localStorage.setItem("rupeebill_upi_id", trimmed);
        } else {
            localStorage.removeItem("rupeebill_upi_id");
        }
        if (user?.id) {
            try {
                await (supabase as any)
                    .from("profiles")
                    .update({ upi_id: trimmed || null })
                    .eq("user_id", user.id);
                queryClient.invalidateQueries({ queryKey: ["profile"] });
                toast.success("UPI ID updated successfully");
            } catch (err) {
                console.error("Failed to update UPI in profile:", err);
            }
        }
    };

    const [bankAccounts, setBankAccounts] = useState<any[]>(() => getStoredBankAccounts(user?.id));
    const [selectedBankId, setSelectedBankId] = useState<string>(() => {
        return localStorage.getItem("rupeebill_selected_bank_account_id") || "";
    });

    const handleBankSelect = (id: string) => {
        setSelectedBankId(id);
        localStorage.setItem("rupeebill_selected_bank_account_id", id);
        toast.success("Default invoice bank account updated");
    };

    useEffect(() => {
        const updateAccounts = () => {
            const accounts = getStoredBankAccounts(user?.id);
            setBankAccounts(accounts);
        };
        updateAccounts();
        window.addEventListener("focus", updateAccounts);
        return () => window.removeEventListener("focus", updateAccounts);
    }, [user?.id]);

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

    // Fetch parties directory for resolving party pending balances
    const { data: parties = [] } = useQuery({
        queryKey: ["parties", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("parties")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("name", { ascending: true });
                if (!error && data) return data;
            } catch (e) {
                console.warn("[PrintStudio] Parties fetch fallback:", e);
            }
            return [];
        },
        enabled: !!user
    });

    // Fetch all sales for accurate historical party ledger balance calculation
    const { data: allSales = [] } = useQuery({
        queryKey: ["all_sales_for_balance", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("sales")
                    .select("id, party_id, customer_name, total_amount, amount_paid, balance_due, status, document_type, date, created_at")
                    .eq("user_id", user.id);
                if (!error && data) return data;
            } catch (e) {
                console.warn("[PrintStudio] Sales fetch fallback:", e);
            }
            return [];
        },
        enabled: !!user
    });

    const getPartyBalanceForSale = useCallback((sale: any) => {
        if (!sale) return { previous_balance: 0, party_pending_balance: 0 };
        
        // If sale already has an explicit non-zero previous balance passed (e.g. mock sample)
        if (sale.previous_balance !== undefined && sale.previous_balance !== null && Number(sale.previous_balance) !== 0) {
            const pb = Number(sale.previous_balance);
            const curDue = Number(sale.balance_due != null ? sale.balance_due : Math.max(0, Number(sale.total_amount || 0) - Number(sale.amount_paid || 0)));
            const pd = sale.party_pending_balance !== undefined ? Number(sale.party_pending_balance) : (sale.total_due_balance !== undefined ? Number(sale.total_due_balance) : (pb + curDue));
            return { previous_balance: pb, party_pending_balance: pd };
        }

        const custName = (sale.customer_name || "").trim().toLowerCase();
        if (!custName || ["cash customer", "cash sale", "walk-in", "cash"].includes(custName)) {
            const curDue = Number(sale.balance_due != null ? sale.balance_due : Math.max(0, Number(sale.total_amount || 0) - Number(sale.amount_paid || 0)));
            return { previous_balance: 0, party_pending_balance: curDue };
        }

        const party = (parties as any[]).find((p: any) => 
            (sale.party_id && p.id === sale.party_id) || 
            (p.name && p.name.trim().toLowerCase() === custName)
        );

        const openBal = Number(party?.opening_balance) || 0;
        const isOpeningReceivable = party?.opening_balance_type ? party.opening_balance_type === "to_receive" : party?.type !== "vendor";
        let prevBal = isOpeningReceivable ? openBal : -openBal;

        const salesList = (allSales.length > 0 ? allSales : recentSales) as any[];

        const otherSales = salesList.filter((s: any) => {
            if (s.id && sale.id && s.id === sale.id) return false;
            const match = (s.party_id && party?.id && s.party_id === party.id) ||
                          (s.customer_name && s.customer_name.trim().toLowerCase() === custName);
            return match;
        });

        otherSales.forEach((s: any) => {
            const statusStr = (s.status || "").toLowerCase();
            if (statusStr === "draft" || statusStr === "cancelled") return;
            const tot = Number(s.total_amount) || 0;
            const pd = Number(s.amount_paid != null ? s.amount_paid : (statusStr === "paid" ? tot : 0));
            const due = Number(s.balance_due != null ? s.balance_due : Math.max(0, tot - pd));
            const docType = (s.document_type || "invoice").toLowerCase();
            if (docType === "receipt") {
                prevBal = Math.max(0, prevBal - (tot || pd));
            } else if (docType === "credit_note") {
                prevBal -= tot;
            } else if (docType === "debit_note") {
                prevBal += tot;
            } else {
                prevBal += due;
            }
        });

        // Fallback for mock preview if user has a named party but no other sales yet
        if (prevBal === 0 && (!sale.id || sale.id.startsWith("sample-"))) {
            prevBal = 8500;
        }

        const curDue = Number(sale.balance_due != null ? sale.balance_due : Math.max(0, Number(sale.total_amount || 0) - Number(sale.amount_paid || 0)));
        return {
            previous_balance: prevBal,
            party_pending_balance: prevBal + curDue
        };
    }, [parties, allSales, recentSales]);

    useEffect(() => {
        if (profile?.upi_id && !upiIdInput) {
            setUpiIdInput(profile.upi_id);
            localStorage.setItem("rupeebill_upi_id", profile.upi_id);
        }
    }, [profile?.upi_id]);

    const activeBankAccount: BankDetailsInfo | null = useMemo(() => {
        return resolveInvoiceBankDetails({
            printBankDetails,
            selectedBankAccountId: selectedBankId,
            bankAccounts,
            profile,
            userId: user?.id
        });
    }, [printBankDetails, selectedBankId, profile, bankAccounts, user?.id]);

    // Auto-select latest sale for live preview once recentSales load
    useEffect(() => {
        if (recentSales.length > 0 && !selectedSale) {
            setSelectedSale(recentSales[0]);
        }
    }, [recentSales, selectedSale]);

    const activeSaleData = useMemo(() => {
        let baseSale = selectedSale || sampleSale;
        if (selectedDocType === 'purchase_bill') baseSale = samplePurchaseBill;
        else if (selectedDocType === 'sale_order') baseSale = sampleSaleOrder;
        else if (selectedDocType === 'purchase_order') baseSale = samplePurchaseOrder;

        const { previous_balance, party_pending_balance } = getPartyBalanceForSale(baseSale);
        return {
            ...baseSale,
            previous_balance,
            party_pending_balance,
            total_due_balance: party_pending_balance
        };
    }, [selectedSale, selectedDocType, getPartyBalanceForSale]);

    const handlePrintSale = async (sale: any) => {
        const { previous_balance, party_pending_balance } = getPartyBalanceForSale(sale);
        const invoiceDetails: InvoiceDetails = {
            invoice_number: sale.invoice_number || `INV-${sale.id.slice(0, 6).toUpperCase()}`,
            date: sale.date || sale.created_at,
            due_date: sale.due_date,
            status: sale.status,
            amount_paid: sale.amount_paid,
            balance_due: sale.balance_due,
            payment_method: sale.payment_method,
            customer_name: sale.customer_name,
            customer_phone: sale.customer_phone,
            customer_email: sale.customer_email,
            customer_gstin: sale.customer_gstin,
            customer_address: sale.customer_address || sale.billing_address,
            place_of_supply: sale.place_of_supply,
            items: sale.items || [],
            subtotal: sale.subtotal || sale.total_amount,
            discount_amount: sale.discount_amount || 0,
            tax_rate: sale.tax_rate || 0,
            tax_amount: sale.tax_amount || 0,
            total_amount: sale.total_amount,
            previous_balance: previous_balance,
            total_due_balance: party_pending_balance,
            party_pending_balance: party_pending_balance,
            business_details: profile ? {
                name: profile.business_name || profile.display_name || "My Business",
                address: profile.business_address || undefined,
                phone: profile.business_phone || profile.phone || undefined,
                email: profile.email || undefined,
                state: profile.state || undefined,
                gst: profile.gst_number || undefined,
                logo_url: profile.business_logo || undefined,
                signature_url: profile.signature_url || undefined,
                bank_name: activeBankAccount?.bankName,
                bank_account_no: activeBankAccount?.accountNumber,
                bank_ifsc: activeBankAccount?.ifscCode,
                bank_branch: activeBankAccount?.branchName,
                upi_id: printUpiQr ? (upiIdInput || profile?.upi_id || undefined) : undefined
            } : undefined
        };

        if (selectedTheme === 'thermal') {
            toast.loading(`Printing thermal POS receipt ${invoiceDetails.invoice_number}...`, { id: "ps-print" });
            await printThermalReceipt(invoiceDetails);
            toast.success("Thermal receipt dispatched to printer!", { id: "ps-print" });
        } else {
            toast.loading(`Sending ${themeMeta[selectedTheme].name} invoice to printer...`, { id: "ps-print" });
            await printInvoiceDirectly(invoiceDetails, { 
                action: 'print', 
                theme: selectedTheme as InvoicePdfTheme, 
                documentType: selectedDocType,
                pageSize, 
                customTerms, 
                fontSizeFactor,
                printBankDetails,
                bankDetails: activeBankAccount || undefined,
                selectedBankAccountId: selectedBankId,
                printUpiQr,
                upiId: upiIdInput || profile?.upi_id,
                showItemTaxRateOnBill: showItemTaxRate,
                showPartyPreviousBalance,
                showPartyPendingBalance: showPartyPreviousBalance,
                profile
            });
            toast.success("Print job sent to printer machine!", { id: "ps-print" });
        }
    };

    const handleDownloadSale = async (sale: any) => {
        const { previous_balance, party_pending_balance } = getPartyBalanceForSale(sale);
        const invoiceDetails: InvoiceDetails = {
            invoice_number: sale.invoice_number || `DOC-${sale.id.slice(0, 6).toUpperCase()}`,
            date: sale.date || sale.created_at,
            due_date: sale.due_date,
            status: sale.status,
            amount_paid: sale.amount_paid,
            balance_due: sale.balance_due,
            payment_method: sale.payment_method,
            customer_name: sale.customer_name,
            customer_phone: sale.customer_phone,
            customer_email: sale.customer_email,
            customer_gstin: sale.customer_gstin,
            customer_address: sale.customer_address || sale.billing_address,
            place_of_supply: sale.place_of_supply,
            items: sale.items || [],
            subtotal: sale.subtotal || sale.total_amount,
            discount_amount: sale.discount_amount || 0,
            tax_rate: sale.tax_rate || 0,
            tax_amount: sale.tax_amount || 0,
            total_amount: sale.total_amount,
            previous_balance: previous_balance,
            total_due_balance: party_pending_balance,
            party_pending_balance: party_pending_balance,
            business_details: profile ? {
                name: profile.business_name || profile.display_name || "My Business",
                address: profile.business_address || undefined,
                phone: profile.business_phone || profile.phone || undefined,
                email: profile.email || undefined,
                state: profile.state || undefined,
                gst: profile.gst_number || undefined,
                logo_url: profile.business_logo || undefined,
                signature_url: profile.signature_url || undefined,
                bank_name: activeBankAccount?.bankName,
                bank_account_no: activeBankAccount?.accountNumber,
                bank_ifsc: activeBankAccount?.ifscCode,
                bank_branch: activeBankAccount?.branchName,
                upi_id: printUpiQr ? (upiIdInput || profile?.upi_id || undefined) : undefined
            } : undefined
        };

        toast.loading(`Downloading PDF...`, { id: "ps-download" });
        await generateInvoicePDF(invoiceDetails, { 
            action: 'download', 
            theme: selectedTheme === 'thermal' ? 'startup-gradient' : selectedTheme as InvoicePdfTheme, 
            documentType: selectedDocType,
            pageSize, 
            customTerms, 
            fontSizeFactor,
            printBankDetails,
            bankDetails: activeBankAccount || undefined,
            selectedBankAccountId: selectedBankId,
            printUpiQr,
            upiId: upiIdInput || profile?.upi_id,
            showItemTaxRateOnBill: showItemTaxRate,
            showPartyPreviousBalance,
            showPartyPendingBalance: showPartyPreviousBalance,
            profile
        });
        toast.success("Invoice downloaded!", { id: "ps-download" });
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

                        {/* 4. Bank Details Printing Card */}
                        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h2 className="text-sm font-bold flex items-center gap-2">
                                    <Landmark className="w-3.5 h-3.5 text-primary" />
                                    4. Bank Details on Invoice
                                </h2>
                                <Switch 
                                    checked={printBankDetails}
                                    onCheckedChange={handlePrintBankToggle}
                                />
                            </div>

                            {printBankDetails ? (
                                <div className="space-y-2.5 animate-fade-in">
                                    {bankAccounts.length > 0 ? (
                                        <>
                                            {bankAccounts.length > 1 && (
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-muted-foreground block">Select Account to Print</label>
                                                    <Select 
                                                        value={selectedBankId || (bankAccounts.find((a: any) => a.isDefault)?.id || bankAccounts[0]?.id)}
                                                        onValueChange={handleBankSelect}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder="Choose bank account" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {bankAccounts.map((acc: any) => (
                                                                <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                                                    {acc.bankName} ({acc.accountNumber.slice(-4) ? `...${acc.accountNumber.slice(-4)}` : acc.accountNumber})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {activeBankAccount && (
                                                <div className="p-2.5 rounded-lg border bg-muted/40 space-y-1 text-xs">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-[11px] text-slate-800 dark:text-slate-100">{activeBankAccount.bankName}</span>
                                                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40">Active</Badge>
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground font-mono">
                                                        A/c: {activeBankAccount.accountNumber}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        IFSC: {activeBankAccount.ifscCode || "N/A"} {activeBankAccount.branchName ? `• ${activeBankAccount.branchName}` : ''}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="pt-0.5">
                                                <Link 
                                                    to="/bank-details" 
                                                    className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-1"
                                                >
                                                    Manage Bank Accounts & Books &rarr;
                                                </Link>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="p-3 border border-dashed border-amber-300 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                                            <p className="text-[10px] text-amber-800 dark:text-amber-200 leading-snug">
                                                No bank account saved yet. Add your bank details to display on customer invoices.
                                            </p>
                                            <Link to="/bank-details">
                                                <Button size="sm" variant="outline" className="h-7 text-xs border-amber-400 text-amber-900 dark:text-amber-100">
                                                    <Landmark className="w-3 h-3 mr-1" />
                                                    + Add Bank Account
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-[10px] text-muted-foreground italic">
                                    Bank details will not be printed on downloaded or printed invoices.
                                </p>
                            )}
                        </div>

                        {/* 5. UPI Payment QR Code Card */}
                        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h2 className="text-sm font-bold flex items-center gap-2">
                                    <QrCode className="w-3.5 h-3.5 text-primary" />
                                    5. UPI Payment QR Code
                                </h2>
                                <Switch 
                                    checked={printUpiQr}
                                    onCheckedChange={handlePrintUpiToggle}
                                />
                            </div>

                            {printUpiQr ? (
                                <div className="space-y-2.5 animate-fade-in">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-muted-foreground block">
                                            Merchant UPI ID / VPA
                                        </label>
                                        <div className="flex gap-1.5">
                                            <Input
                                                value={upiIdInput}
                                                onChange={(e) => setUpiIdInput(e.target.value)}
                                                onBlur={(e) => handleSaveUpiId(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleSaveUpiId(upiIdInput);
                                                    }
                                                }}
                                                placeholder="e.g. yourshop@upi, 9876543210@paytm"
                                                className="h-8 text-xs font-mono"
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleSaveUpiId(upiIdInput)}
                                                className="h-8 text-xs px-2.5 shrink-0"
                                            >
                                                Save
                                            </Button>
                                        </div>
                                        <p className="text-[9px] text-muted-foreground">
                                            Dynamic QR code encodes invoice balance due. Customers can scan using Google Pay, PhonePe, Paytm, or BHIM.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[10px] text-muted-foreground italic">
                                    UPI QR code will not be printed on downloaded or printed invoices.
                                </p>
                            )}
                        </div>

                        {/* 6. Product Tax % on Bill Card */}
                        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h2 className="text-sm font-bold flex items-center gap-2">
                                    <Percent className="w-3.5 h-3.5 text-primary" />
                                    6. Product Tax % on Bill
                                </h2>
                                <Switch 
                                    checked={showItemTaxRate}
                                    onCheckedChange={handleShowItemTaxToggle}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-snug">
                                {showItemTaxRate 
                                    ? "Showing item-level GST / Tax % column on printed bills and PDF downloads." 
                                    : "Tax % column is hidden on bills. Switch on to display individual product tax rates."}
                            </p>
                        </div>

                        {/* 7. Show Party Pending Balance Card */}
                        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h2 className="text-sm font-bold flex items-center gap-2">
                                    <Wallet className="w-3.5 h-3.5 text-primary" />
                                    7. Show Party Pending Balance
                                </h2>
                                <Switch 
                                    checked={showPartyPreviousBalance}
                                    onCheckedChange={handleShowPartyPreviousBalanceToggle}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-snug">
                                {showPartyPreviousBalance 
                                    ? "Displaying party's overall pending balance and closing net balance at the bottom of bills." 
                                    : "Party pending balance is hidden. Only current bill amount is shown."}
                            </p>
                        </div>

                        {/* 8. Terms & Conditions Card */}
                        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
                            <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2">
                                <FileCheck className="w-3.5 h-3.5 text-primary" />
                                8. Terms & Conditions
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
                        <div className="bg-card border rounded-xl p-3 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 shrink-0">
                            <div>
                                <h3 className="font-bold text-xs flex items-center gap-1.5">
                                    <Eye className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                    Live Document Preview
                                </h3>
                                <p className="text-[9px] text-muted-foreground mt-0.5">
                                    Showing: {activeSaleData.invoice_number} ({resolveDocumentDescriptor(selectedDocType, undefined, activeSaleData?.invoice_number).title})
                                </p>
                            </div>

                            {/* Document Type Switcher */}
                            <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border text-xs overflow-x-auto max-w-full">
                                <button
                                    type="button"
                                    onClick={() => setSelectedDocType('invoice')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap",
                                        selectedDocType === 'invoice' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    🧾 Sale Bill
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedDocType('purchase_bill');
                                        setSelectedSale(null);
                                    }}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap",
                                        selectedDocType === 'purchase_bill' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    📦 Purchase Bill
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedDocType('sale_order');
                                        setSelectedSale(null);
                                    }}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap",
                                        selectedDocType === 'sale_order' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    📋 Sale Order
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedDocType('purchase_order');
                                        setSelectedSale(null);
                                    }}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap",
                                        selectedDocType === 'purchase_order' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    🛒 Purchase Order
                                </button>
                            </div>
                            
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    onClick={() => handlePrintSale(activeSaleData)}
                                    className="bg-primary hover:bg-primary/95 text-white font-bold rounded-lg text-xs h-8.5 px-3 flex items-center gap-1.5 flex-1 sm:flex-initial"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    {selectedTheme === 'thermal' ? 'Print Thermal' : 'Print to Machine'}
                                </Button>
                                
                                {selectedTheme !== 'thermal' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => handleDownloadSale(activeSaleData)}
                                        className="rounded-lg text-xs h-8.5 border-border flex items-center gap-1.5 flex-1 sm:flex-initial"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Download PDF
                                    </Button>
                                )}
                                
                                {selectedTheme !== 'thermal' && (
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            const desc = resolveDocumentDescriptor(selectedDocType, undefined, activeSaleData?.invoice_number);
                                            toast.success(`Printing ${desc.title} layout...`);
                                            await generateInvoicePDF(
                                                {
                                                    invoice_number: activeSaleData.invoice_number || `DOC-${activeSaleData.id.slice(0, 6).toUpperCase()}`,
                                                    date: activeSaleData.date || activeSaleData.created_at,
                                                    due_date: activeSaleData.due_date,
                                                    status: activeSaleData.status,
                                                    amount_paid: activeSaleData.amount_paid,
                                                    balance_due: activeSaleData.balance_due,
                                                    payment_method: activeSaleData.payment_method,
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
                                                    previous_balance: activeSaleData.previous_balance,
                                                    total_due_balance: activeSaleData.total_due_balance,
                                                    party_pending_balance: activeSaleData.party_pending_balance,
                                                    business_details: profile ? {
                                                        name: profile.business_name || profile.display_name || "My Business",
                                                        address: profile.business_address || undefined,
                                                        phone: profile.business_phone || profile.phone || undefined,
                                                        gst: profile.gst_number || undefined,
                                                        logo_url: profile.business_logo || undefined,
                                                        signature_url: profile.signature_url || undefined,
                                                        bank_name: activeBankAccount?.bankName,
                                                        bank_account_no: activeBankAccount?.accountNumber,
                                                        bank_ifsc: activeBankAccount?.ifscCode,
                                                        bank_branch: activeBankAccount?.branchName,
                                                        upi_id: printUpiQr ? (upiIdInput || profile?.upi_id || undefined) : undefined
                                                    } : undefined
                                                }, 
                                                { 
                                                    action: 'preview', 
                                                    theme: selectedTheme as InvoicePdfTheme, 
                                                    documentType: selectedDocType,
                                                    pageSize, 
                                                    customTerms, 
                                                    fontSizeFactor,
                                                    printBankDetails,
                                                    bankDetails: activeBankAccount || undefined,
                                                    selectedBankAccountId: selectedBankId,
                                                    printUpiQr,
                                                    upiId: upiIdInput || profile?.upi_id,
                                                    showItemTaxRateOnBill: showItemTaxRate,
                                                    showPartyPreviousBalance,
                                                    showPartyPendingBalance: showPartyPreviousBalance
                                                }
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
                                            printBankDetails={printBankDetails}
                                            bankAccount={activeBankAccount}
                                            printUpiQr={printUpiQr}
                                            upiId={upiIdInput || profile?.upi_id}
                                            showItemTaxRate={showItemTaxRate}
                                            showPartyPreviousBalance={showPartyPreviousBalance}
                                            showPartyPendingBalance={showPartyPreviousBalance}
                                            documentType={selectedDocType}
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