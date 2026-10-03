import React from "react";
import { Phone, Mail, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { PageSize, BankDetailsInfo, convertAmountToIndianWords } from "@/utils/generateInvoicePDF";
import { cn } from "@/core/lib/utils";
import { InvoiceTheme } from "../../types";

interface StandardGradientPreviewProps {
  theme: InvoiceTheme;
  pageSize: PageSize;
  bizName: string;
  profile: any;
  sale: any;
  dateFormatted: string;
  descriptor: any;
  items: any[];
  taxRate: number;
  cgst: string;
  sgst: string;
  taxAmount: number;
  discount: number;
  subtotal: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  isPaid: boolean;
  isPartial: boolean;
  shouldRenderPartyBal: boolean;
  partyPrevBal: number;
  partyClosingDue: number;
  printBankDetails?: boolean;
  bankAccount?: BankDetailsInfo | null;
  printUpiQr?: boolean;
  effectiveUpi?: string;
  upiUri: string;
  showItemTaxRate?: boolean;
  customTerms: string;
  formatCurrency: (n: number) => string;
}

export function StandardGradientPreview({
  theme,
  pageSize,
  bizName,
  profile,
  sale,
  dateFormatted,
  descriptor,
  items,
  taxRate,
  cgst,
  sgst,
  taxAmount,
  discount,
  subtotal,
  totalAmount,
  amountPaid,
  balanceDue,
  isPaid,
  isPartial,
  shouldRenderPartyBal,
  partyPrevBal,
  partyClosingDue,
  printBankDetails,
  bankAccount,
  printUpiQr,
  effectiveUpi,
  upiUri,
  showItemTaxRate,
  customTerms,
  formatCurrency,
}: StandardGradientPreviewProps) {
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
      font: "font-sans",
    },
    "tally-accounting": {
      header: "bg-zinc-800 text-white border border-black",
      accentText: "text-slate-900",
      accentBg: "bg-slate-100",
      tableHead: "bg-zinc-800 text-white",
      totalBox: "border-black bg-white",
      font: "font-sans",
    },
    "sale-invoice": {
      header: "bg-[#D9F0FC] text-slate-900 border-b border-black",
      accentText: "text-sky-800",
      accentBg: "bg-sky-50",
      tableHead: "bg-[#D9F0FC] text-slate-900",
      totalBox: "border-black bg-white",
      font: "font-sans",
    },
    thermal: {
      header: "bg-stone-200 text-stone-900",
      accentText: "text-stone-800",
      accentBg: "bg-stone-100",
      tableHead: "bg-stone-300 text-stone-900",
      totalBox: "border-stone-400 bg-white",
      font: "font-mono",
    },
  }[theme] || {
    header: "bg-gradient-to-r from-indigo-500 to-pink-500 text-white",
    accentText: "text-pink-600",
    accentBg: "bg-indigo-50",
    tableHead: "bg-indigo-600 text-white",
    totalBox: "border-pink-500 bg-pink-50/30",
    font: "font-sans",
  };

  return (
    <div
      className={cn(
        "bg-white border rounded-xl overflow-hidden shadow-lg transition-all duration-300 w-full flex flex-col justify-between p-0",
        pageSize === "a5" ? "max-w-[500px] min-h-[530px]" : "max-w-[680px] min-h-[700px]",
        styles.font
      )}
    >
      {/* INVOICE TOP BAR */}
      <div className={cn("p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", styles.header)}>
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-tight">{bizName}</h2>
          {profile?.business_address && (
            <p className="text-xs opacity-90 mt-1 max-w-[280px]">{profile.business_address}</p>
          )}
          <p className="text-xs opacity-90 mt-0.5">
            {[
              profile?.business_phone ? `Phone: ${profile.business_phone}` : "",
              profile?.gst_number ? `GSTIN: ${profile.gst_number}` : "",
            ]
              .filter(Boolean)
              .join(" | ")}
          </p>
        </div>

        <div className="text-right sm:text-right flex flex-col items-start sm:items-end">
          <h1 className="text-3xl font-black tracking-tight leading-none uppercase">{descriptor.title}</h1>
          <p className="text-xs font-semibold opacity-90 mt-2">
            {descriptor.numberLabel} {sale.invoice_number}
          </p>
          <p className="text-xs opacity-90 mt-0.5">
            {descriptor.dateLabel}: {dateFormatted}
          </p>
        </div>
      </div>

      {/* BILL DETAILS */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100">
        <div className="space-y-1">
          <h4 className={cn("text-xs font-bold uppercase tracking-wider", styles.accentText)}>
            {descriptor.partyLabel}
          </h4>
          <div className="text-sm font-bold text-slate-800">{sale.customer_name || "Walk-in Guest"}</div>
          {sale.customer_phone && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" /> {sale.customer_phone}
            </div>
          )}
          {sale.customer_email && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" /> {sale.customer_email}
            </div>
          )}
          {sale.customer_gstin && (
            <div className="text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded w-max mt-1">
              GSTIN: {sale.customer_gstin}
            </div>
          )}
        </div>

        <div className="space-y-1 sm:text-right">
          <h4 className={cn("text-xs font-bold uppercase tracking-wider", styles.accentText)}>Invoice Metadata</h4>
          <div className="text-xs text-slate-600">
            Payment Method: <span className="font-semibold uppercase">{sale.payment_method || "Credit / Bill"}</span>
          </div>
          <div className="text-xs text-slate-600">
            Payment Status:{" "}
            <span
              className={cn(
                "font-bold uppercase px-1.5 py-0.5 rounded text-[10px]",
                isPaid
                  ? "bg-green-100 text-green-700"
                  : isPartial
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
              )}
            >
              {sale.status || (isPaid ? "paid" : "pending")}
            </span>
          </div>
          {sale.place_of_supply && <div className="text-xs text-slate-600">Place of Supply: {sale.place_of_supply}</div>}
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="p-6 flex-1">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className={cn("border-b", styles.tableHead)}>
              <th className="p-2.5 font-bold">Item Description</th>
              <th className="p-2.5 font-bold text-center">Qty</th>
              <th className="p-2.5 font-bold text-right">Rate</th>
              {showItemTaxRate && <th className="p-2.5 font-bold text-center">Tax %</th>}
              <th className="p-2.5 font-bold text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="p-2.5 font-medium text-slate-800">
                  {item.description}
                  {item.hsn_code && <span className="text-[10px] text-muted-foreground ml-2">HSN: {item.hsn_code}</span>}
                </td>
                <td className="p-2.5 text-center text-slate-600">
                  {item.quantity ?? 1} {item.unit || "pcs"}
                </td>
                <td className="p-2.5 text-right text-slate-600">{formatCurrency(item.price)}</td>
                {showItemTaxRate && (
                  <td className="p-2.5 text-center text-slate-600 font-semibold">
                    {item.tax_rate !== undefined ? `${item.tax_rate}%` : taxRate > 0 ? `${taxRate}%` : "0%"}
                  </td>
                )}
                <td className="p-2.5 text-right font-bold text-slate-900">
                  {formatCurrency(item.total ?? Number(item.quantity ?? 1) * Number(item.price))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TOTALS & SUMMARY SECTION */}
      <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-3 max-w-sm">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                Total in Words
              </span>
              <p className="text-xs font-bold text-slate-700 uppercase mt-0.5">
                {convertAmountToIndianWords(totalAmount)}
              </p>
            </div>

            {/* Bank details preview */}
            {printBankDetails && bankAccount?.bankName && (
              <div className="p-2.5 rounded-lg border bg-white space-y-1 text-xs text-slate-700">
                <div className="font-bold text-[11px] text-slate-900 flex items-center justify-between">
                  <span>Bank Payment Details</span>
                </div>
                <div className="text-[10px]">
                  Bank: <span className="font-semibold">{bankAccount.bankName}</span>
                </div>
                <div className="text-[10px]">
                  A/c: <span className="font-mono font-semibold">{bankAccount.accountNumber}</span>
                  {bankAccount.ifscCode && <span> • IFSC: {bankAccount.ifscCode}</span>}
                </div>
              </div>
            )}

            {/* UPI QR code preview */}
            {descriptor.enableUpiQr && printUpiQr && effectiveUpi && (
              <div className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                <div className="p-1 bg-white border rounded">
                  <QRCodeSVG value={upiUri} size={64} level="M" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-900 block">Scan & Pay via UPI</span>
                  <p className="text-[9px] text-slate-500 font-mono truncate max-w-[150px]">{effectiveUpi}</p>
                  <p className="text-[8px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Instant payment via any UPI app
                  </p>
                </div>
              </div>
            )}

            {shouldRenderPartyBal && (
              <div className="border border-slate-200 rounded p-2 bg-white space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Party Previous Balance:</span>
                  <span className="font-semibold font-mono">{formatCurrency(partyPrevBal)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1 font-bold">
                  <span>Total Outstanding Due:</span>
                  <span className="font-mono text-primary">{formatCurrency(partyClosingDue)}</span>
                </div>
              </div>
            )}

            {customTerms && (
              <p className="text-[10px] text-muted-foreground italic border-t border-dashed pt-2">
                Terms: {customTerms}
              </p>
            )}
          </div>

          <div className="w-full sm:w-64 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-600 font-sans">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600 font-sans">
                <span>Discount:</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <>
                <div className="flex justify-between text-slate-600 font-sans">
                  <span>CGST ({(taxRate / 2).toFixed(1)}%):</span>
                  <span>₹{cgst}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-sans">
                  <span>SGST ({(taxRate / 2).toFixed(1)}%):</span>
                  <span>₹{sgst}</span>
                </div>
              </>
            )}
            <div className={cn("flex justify-between font-bold text-sm pt-2 border-t mt-2", styles.totalBox, "p-2 rounded-lg")}>
              <span className="font-sans">Grand Total:</span>
              <span className="font-black text-slate-900">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1 font-sans">
              <span>Amount Paid:</span>
              <span className="text-emerald-700 font-semibold">{formatCurrency(amountPaid)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-dashed pt-1 font-sans">
              <span>Balance Due:</span>
              <span className={balanceDue > 0 ? "text-rose-600 font-bold" : "text-slate-900"}>
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
