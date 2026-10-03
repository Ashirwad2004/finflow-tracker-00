import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { PageSize, BankDetailsInfo, UniversalDocumentType, convertAmountToIndianWords } from "@/utils/generateInvoicePDF";
import { cn } from "@/core/lib/utils";

interface SaleInvoicePreviewProps {
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
  customTerms: string;
  formatCurrency: (n: number) => string;
}

export function SaleInvoicePreview({
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
  customTerms,
  formatCurrency,
}: SaleInvoicePreviewProps) {
  const totalQty = items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0);
  const totalGst = items.reduce((acc: number, it: any) => {
    const lineTot = Number(it.total ?? Number(it.quantity || 1) * Number(it.price || 0));
    const tr = it.tax_rate !== undefined ? Number(it.tax_rate) : taxRate;
    return acc + (lineTot * tr) / 100;
  }, 0);

  return (
    <div
      className={cn(
        "bg-white text-black p-4 mx-auto font-sans text-xs border border-black shadow-lg w-full flex flex-col justify-between select-none transition-all duration-300",
        pageSize === "a5" ? "max-w-[500px] min-h-[530px]" : "max-w-[700px] min-h-[750px]"
      )}
    >
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
              <span>12:00 PM</span>
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
                  <td colSpan={13} className="p-4 text-center text-muted-foreground italic">
                    No items listed
                  </td>
                </tr>
              ) : (
                items.map((it: any, idx: number) => {
                  const q = Number(it.quantity) || 1;
                  const p = Number(it.price) || 0;
                  const d = Number(it.discount || 0);
                  const itTax = it.tax_rate !== undefined ? Number(it.tax_rate) : taxRate;
                  const lineTot = Number(it.total ?? q * p * (1 - d / 100));
                  const gAmt = lineTot * (itTax / 100);

                  return (
                    <tr key={idx} className="align-middle">
                      <td className="p-1 border-r border-black text-center">{idx + 1}</td>
                      <td className="p-1 border-r border-black font-semibold text-slate-800">{it.description}</td>
                      <td className="p-1 border-r border-black text-center font-mono">{it.hsn_code || "-"}</td>
                      <td className="p-1 border-r border-black text-center">-</td>
                      <td className="p-1 border-r border-black text-center">-</td>
                      <td className="p-1 border-r border-black text-right font-mono">{p.toFixed(2)}</td>
                      <td className="p-1 border-r border-black text-center font-bold">{q}</td>
                      <td className="p-1 border-r border-black text-center">{it.unit || "PCS"}</td>
                      <td className="p-1 border-r border-black text-right font-mono">{p.toFixed(2)}</td>
                      <td className="p-1 border-r border-black text-center">{d ? `${d}%` : "-"}</td>
                      <td className="p-1 border-r border-black text-center font-mono">{itTax}%</td>
                      <td className="p-1 border-r border-black text-right font-mono">{gAmt.toFixed(2)}</td>
                      <td className="p-1 text-right font-bold font-mono">{(lineTot + gAmt).toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
              {/* Spacer rows */}
              <tr className="h-10">
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td></td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-[#D9F0FC] border-t border-black font-bold text-center">
                <td className="p-1 border-r border-black text-left" colSpan={6}>
                  Total
                </td>
                <td className="p-1 border-r border-black">{totalQty}</td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="p-1 border-r border-black text-right font-mono">{totalGst.toFixed(2)}</td>
                <td className="p-1 text-right font-black font-mono">{totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* GST Tax Summary Box */}
        <div className="grid grid-cols-12 border-b border-black text-[9px]">
          <div className="col-span-8 p-2 border-r border-black space-y-1">
            <span className="font-bold text-[10px] block">Tax Summary</span>
            <div className="grid grid-cols-3 font-semibold text-center border-b border-black/20 pb-0.5">
              <span>Tax Type</span>
              <span>Rate</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="grid grid-cols-3 text-center">
              <span>CGST</span>
              <span>{(taxRate / 2).toFixed(1)}%</span>
              <span className="text-right font-mono">₹{cgst}</span>
            </div>
            <div className="grid grid-cols-3 text-center">
              <span>SGST</span>
              <span>{(taxRate / 2).toFixed(1)}%</span>
              <span className="text-right font-mono">₹{sgst}</span>
            </div>
          </div>
          <div className="col-span-4 p-2 bg-slate-50 space-y-1 flex flex-col justify-center text-right font-mono text-[10px]">
            <div className="flex justify-between">
              <span>Taxable:</span>
              <span>₹{(totalAmount - Number(cgst) - Number(sgst)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-black/20 pt-0.5">
              <span>Total Tax:</span>
              <span>₹{(Number(cgst) + Number(sgst)).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Amount in words & Financial Totals */}
        <div className="grid grid-cols-12 border-b border-black text-[10px]">
          <div className="col-span-7 p-2.5 border-r border-black flex flex-col justify-between space-y-2">
            <div>
              <span className="font-bold block text-[9px] uppercase text-slate-500">Invoice Amount in Words:</span>
              <span className="font-bold uppercase text-[9.5px] leading-tight block">
                {convertAmountToIndianWords(totalAmount)}
              </span>
            </div>
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
          </div>
          <div className="col-span-5 p-2.5 space-y-1.5 font-mono text-[10px]">
            <div className="flex justify-between">
              <span className="font-sans font-semibold">Sub Total:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-black/20 pt-1 font-black text-xs bg-[#D9F0FC] p-1 rounded">
              <span className="font-sans">Total:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-0.5">
              <span className="font-sans">Received / Paid:</span>
              <span className="text-emerald-700 font-bold">{formatCurrency(amountPaid)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-dashed border-slate-300 pt-1">
              <span className="font-sans">Balance Due:</span>
              <span className={balanceDue > 0 ? "text-rose-600 font-black" : "text-slate-900"}>
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>
        </div>

        {/* Bank & UPI Section */}
        <div className="grid grid-cols-12 border-b border-black text-[9px]">
          <div className="col-span-8 p-2.5 border-r border-black space-y-1">
            <span className="font-bold text-[10px] block">Bank Details</span>
            {printBankDetails && bankAccount?.bankName ? (
              <div className="space-y-0.5">
                <div>
                  <span className="font-bold">Bank: </span>
                  <span>{bankAccount.bankName}</span>
                </div>
                <div>
                  <span className="font-bold">Account No.: </span>
                  <span className="font-mono font-semibold">{bankAccount.accountNumber}</span>
                </div>
                <div>
                  <span className="font-bold">IFSC Code: </span>
                  <span className="font-mono">{bankAccount.ifscCode}</span>
                </div>
                <div>
                  <span className="font-bold">Branch: </span>
                  <span>{bankAccount.branchName || "-"}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic">No bank details specified.</p>
            )}
          </div>
          <div className="col-span-4 p-2.5 flex flex-col items-center justify-center text-center">
            {descriptor.enableUpiQr && printUpiQr && effectiveUpi ? (
              <div className="flex flex-col items-center">
                <QRCodeSVG value={upiUri} size={50} level="M" />
                <span className="text-[7px] font-bold mt-1 text-slate-700 uppercase">Scan to Pay via UPI</span>
                <span className="text-[7px] font-mono text-slate-500 truncate max-w-[120px]">{effectiveUpi}</span>
              </div>
            ) : (
              <span className="text-slate-400 italic text-[8px]">UPI QR code disabled</span>
            )}
          </div>
        </div>

        {/* Terms & Conditions & Signatures */}
        <div className="grid grid-cols-12 text-[9px]">
          <div className="col-span-7 p-2.5 border-r border-black space-y-1">
            <span className="font-bold text-[10px] block">Terms and Conditions</span>
            <p className="text-slate-600 text-[8px] leading-tight whitespace-pre-wrap">
              {customTerms || "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is not made within the due date."}
            </p>
          </div>
          <div className="col-span-5 p-2.5 flex flex-col justify-between items-center text-center min-h-[70px]">
            <span className="font-bold text-[9px]">For {bizName}</span>
            <div className="border-t border-black w-32 pt-0.5 text-[8px] text-slate-500 font-semibold">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
