import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { PageSize, BankDetailsInfo, convertAmountToIndianWords } from "@/utils/generateInvoicePDF";
import { cn } from "@/core/lib/utils";

interface TallyAccountingPreviewProps {
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

export function TallyAccountingPreview({
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
  totalAmount,
  amountPaid,
  balanceDue,
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
}: TallyAccountingPreviewProps) {
  return (
    <div
      className={cn(
        "bg-white text-black p-4 mx-auto font-sans text-xs border border-black shadow-lg w-full flex flex-col justify-between select-none transition-all duration-300",
        pageSize === "a5" ? "max-w-[500px] min-h-[530px]" : "max-w-[700px] min-h-[750px]"
      )}
    >
      <div>
        {/* Top Header Box */}
        <div className="border border-black p-3 text-center relative border-b-0">
          <h2 className="text-base font-extrabold tracking-wider uppercase">{bizName}</h2>
          <p className="text-[10px] text-slate-700 mt-0.5">{profile?.business_address || "Store Address Not Specified"}</p>
          <div className="flex justify-center gap-4 text-[9px] text-slate-600 mt-0.5">
            {profile?.gst_number && <span>GSTIN/UIN: <strong>{profile.gst_number}</strong></span>}
            {profile?.state && <span>State Name: {profile.state}</span>}
          </div>
          <div className="absolute right-3 top-3 text-[10px] font-bold border border-black px-2 py-0.5 bg-slate-50 uppercase tracking-widest">
            {descriptor.title}
          </div>
        </div>

        {/* 2-Column Quadrant */}
        <div className="grid grid-cols-2 border border-black text-[10px]">
          {/* Left Column: Buyer details */}
          <div className="p-3 border-r border-black space-y-1.5 flex flex-col justify-between">
            <div>
              <span className="text-[8px] text-slate-500 font-bold block uppercase">{descriptor.partyLabel} (Bill to)</span>
              <p className="font-bold text-xs text-slate-900">{sale.customer_name || "Cash Customer"}</p>
              <p className="text-slate-700 whitespace-pre-wrap">{sale.billing_address || sale.customer_address || "Address not provided"}</p>
            </div>
            <div className="pt-1 border-t border-black/10 space-y-0.5 text-[9px]">
              {sale.customer_gstin && <div>GSTIN/UIN: <span className="font-mono font-bold">{sale.customer_gstin}</span></div>}
              <div>State Name: {sale.place_of_supply || profile?.state || "State"}</div>
            </div>
          </div>

          {/* Right Column: Voucher metadata */}
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 border-b border-black/10 pb-2">
              <div>
                <span className="text-[8px] text-slate-500 font-bold block uppercase">{descriptor.numberLabel}</span>
                <span className="font-mono font-bold text-xs">{sale.invoice_number}</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-500 font-bold block uppercase">{descriptor.dateLabel}</span>
                <span className="font-bold text-xs">{dateFormatted}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-600">
              <div>
                <span className="block text-[8px] text-slate-400">Payment Mode</span>
                <span className="font-semibold uppercase text-slate-800">{sale.payment_method || "Credit / Bill"}</span>
              </div>
              <div>
                <span className="block text-[8px] text-slate-400">Place of Supply</span>
                <span className="font-semibold text-slate-800">{sale.place_of_supply || profile?.state || "State"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Central Itemized Table */}
        <div className="border border-black border-t-0 min-h-[180px]">
          <table className="w-full h-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/50 border-b border-black text-[9px] font-bold tracking-wider text-black">
                <th className="p-2 border-r border-black text-center w-10">S.No</th>
                <th className="p-2 border-r border-black">Description of Goods</th>
                <th className="p-2 border-r border-black text-center w-12">Qty</th>
                <th className="p-2 border-r border-black text-right w-24">Rate</th>
                <th className="p-2 border-r border-black text-center w-12">per</th>
                {showItemTaxRate && <th className="p-2 border-r border-black text-center w-14">Tax %</th>}
                <th className="p-2 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/30 text-slate-950 font-mono text-[10px]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={showItemTaxRate ? 7 : 6} className="p-6 text-center text-muted-foreground italic">
                    No items listed.
                  </td>
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
                    <td className="p-2 border-r border-b border-black text-right">
                      {formatCurrency(item.price).replace("Rs. ", "")}
                    </td>
                    <td className="p-2 border-r border-b border-black text-center font-sans">{item.unit || "pcs"}</td>
                    {showItemTaxRate && (
                      <td className="p-2 border-r border-b border-black text-center font-sans text-[9px] font-semibold text-slate-700">
                        {item.tax_rate !== undefined ? `${item.tax_rate}%` : taxRate > 0 ? `${taxRate}%` : "0%"}
                      </td>
                    )}
                    <td className="p-2 border-b border-black text-right font-bold text-slate-900">
                      {formatCurrency(item.total ?? Number(item.quantity ?? 1) * Number(item.price)).replace("Rs. ", "")}
                    </td>
                  </tr>
                ))
              )}
              {/* Spacer row */}
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
          {/* Left 8 columns: Words, Bank Details, Declaration */}
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
                      <p>
                        A/c No: {bankAccount.accountNumber} {bankAccount.ifscCode ? ` | IFSC: ${bankAccount.ifscCode}` : ""}{" "}
                        {bankAccount.branchName ? ` | Branch: ${bankAccount.branchName}` : ""}
                      </p>
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

            {shouldRenderPartyBal && (
              <div className="border border-slate-300 rounded p-1.5 bg-slate-50 space-y-0.5 text-[9px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">Previous Pending Balance:</span>
                  <span className="font-bold font-mono">{formatCurrency(partyPrevBal)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-0.5 font-bold">
                  <span>Current Total Outstanding:</span>
                  <span className="font-mono text-primary">{formatCurrency(partyClosingDue)}</span>
                </div>
              </div>
            )}

            <div className="border-t border-black/10 pt-1 text-[8px] text-slate-500 italic">
              Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </div>
          </div>

          {/* Right 4 columns: Math Breakdowns & Sign-off */}
          <div className="col-span-4 p-3 flex flex-col justify-between space-y-2">
            <div className="space-y-1 font-mono text-[10px]">
              <div className="flex justify-between text-slate-600">
                <span className="font-sans">Subtotal</span>
                <span>{formatCurrency(totalAmount - taxAmount)}</span>
              </div>
              {taxAmount > 0 && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">CGST ({(taxRate / 2).toFixed(1)}%)</span>
                    <span>₹{cgst}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">SGST ({(taxRate / 2).toFixed(1)}%)</span>
                    <span>₹{sgst}</span>
                  </div>
                </>
              )}
              <div className="border-t border-black pt-1 flex justify-between font-black text-xs text-slate-900">
                <span className="font-sans">Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-0.5">
                <span className="font-sans">Received</span>
                <span className="text-emerald-700 font-bold">{formatCurrency(amountPaid)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-dashed border-slate-300 pt-1">
                <span className="font-sans">Balance Due</span>
                <span className={balanceDue > 0 ? "text-rose-600 font-black" : "text-slate-900"}>
                  {formatCurrency(balanceDue)}
                </span>
              </div>
            </div>

            <div className="text-center pt-4 border-t border-black/20">
              <span className="text-[8px] text-slate-500 font-bold block mb-4">for {bizName}</span>
              <span className="text-[8px] text-slate-400 font-semibold uppercase">Authorized Signatory</span>
            </div>
          </div>
        </div>

        {customTerms && (
          <div className="mt-2 text-[8px] text-slate-500 italic p-1 border border-dashed border-slate-300">
            Terms: {customTerms}
          </div>
        )}
      </div>
    </div>
  );
}
