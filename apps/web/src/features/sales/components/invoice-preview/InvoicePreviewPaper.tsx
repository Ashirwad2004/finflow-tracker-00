import React from "react";
import { convertAmountToIndianWords, InvoiceDetails } from "@/utils/generateInvoicePDF";
import { SalesSettings } from "@/core/hooks/use-sales-settings";

export interface InvoicePreviewPaperProps {
  pdfPayload: InvoiceDetails;
  businessDetails: {
    name: string;
    address: string;
    phone: string;
    gst: string;
    logo_url: string;
    signature_url: string;
    bank_name: string;
    bank_account_no: string;
    bank_ifsc: string;
    bank_branch: string;
    upi_id: string;
  };
  invoice: any;
  salesSettings?: SalesSettings;
  qrCodeDataUrl: string | null;
  formatCurrency: (amount: number) => string;
}

export const InvoicePreviewPaper: React.FC<InvoicePreviewPaperProps> = ({
  pdfPayload,
  businessDetails,
  invoice,
  salesSettings,
  qrCodeDataUrl,
  formatCurrency,
}) => {
  const items = pdfPayload.items;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-6 sm:p-8 space-y-6 text-slate-800 dark:text-slate-100 font-sans print:shadow-none print:border-none print:p-0">
        {/* Header: Company Info + Document Title */}
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
          <div className="space-y-1 max-w-[60%]">
            {businessDetails.logo_url && (
              <img
                src={businessDetails.logo_url}
                alt={businessDetails.name}
                className="h-12 w-auto object-contain mb-2"
              />
            )}
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
              {businessDetails.name}
            </h1>
            {businessDetails.address && (
              <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                {businessDetails.address}
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-1">
              {businessDetails.phone && (
                <span>
                  <strong>Phone:</strong> {businessDetails.phone}
                </span>
              )}
              {businessDetails.gst && (
                <span>
                  <strong>GSTIN:</strong> {businessDetails.gst}
                </span>
              )}
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="inline-block bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-1 rounded text-xs font-black tracking-wider uppercase mb-1">
              TAX INVOICE
            </div>
            <p className="text-xs text-slate-500">
              Invoice No:{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {pdfPayload.invoice_number}
              </span>
            </p>
            <p className="text-xs text-slate-500">
              Date:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {pdfPayload.date}
              </span>
            </p>
            {pdfPayload.due_date && (
              <p className="text-xs text-slate-500">
                Due Date:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {pdfPayload.due_date}
                </span>
              </p>
            )}
            {invoice?.place_of_supply && (
              <p className="text-xs text-slate-500">
                Place of Supply:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {invoice.place_of_supply}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Billed To / Customer Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-md border border-slate-200/80 dark:border-slate-800 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Billed To (Customer Details)
            </p>
            <p className="font-bold text-sm text-slate-900 dark:text-white">
              {pdfPayload.customer_name}
            </p>
            {pdfPayload.customer_phone && (
              <p className="text-slate-600 dark:text-slate-300">
                Phone: {pdfPayload.customer_phone}
              </p>
            )}
            {pdfPayload.customer_email && (
              <p className="text-slate-600 dark:text-slate-300">
                Email: {pdfPayload.customer_email}
              </p>
            )}
            {pdfPayload.customer_gstin && (
              <p className="text-slate-700 dark:text-slate-200 font-semibold mt-0.5">
                GSTIN: {pdfPayload.customer_gstin}
              </p>
            )}
          </div>

          {(invoice?.billing_address || invoice?.shipping_address) && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Address
              </p>
              {invoice.billing_address && (
                <p className="text-slate-600 dark:text-slate-300">
                  {invoice.billing_address}
                </p>
              )}
              {invoice.shipping_address && invoice.shipping_address !== invoice.billing_address && (
                <p className="text-slate-500 text-[11px] mt-1">
                  Ship To: {invoice.shipping_address}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Itemized Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 w-20">HSN/SAC</th>
                <th className="py-2.5 px-3 w-16 text-right">Qty</th>
                <th className="py-2.5 px-3 w-24 text-right">Rate</th>
                <th className="py-2.5 px-3 w-16 text-right">Tax</th>
                <th className="py-2.5 px-3 w-24 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-4 text-center text-slate-400"
                  >
                    No items in this invoice
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  >
                    <td className="py-2 px-3 text-center text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.description}
                      </span>
                      {item.unit && (
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({item.unit})
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                      {item.hsn_code || "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {item.quantity}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatCurrency(Number(item.price))}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      {item.tax_rate != null ? `${item.tax_rate}%` : "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(Number(item.total))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary & Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {/* Left: Words, Bank Details, UPI QR */}
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Invoice Amount In Words
              </p>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded border border-slate-200/60 dark:border-slate-800">
                {convertAmountToIndianWords(pdfPayload.total_amount)}
              </p>
            </div>

            {/* Bank Details & QR code */}
            {(businessDetails.bank_account_no || businessDetails.upi_id) && (
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded border border-slate-200/60 dark:border-slate-800 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Bank & Payment Info
                  </p>
                  {businessDetails.bank_name && (
                    <p className="text-slate-600 dark:text-slate-300">
                      <strong>Bank:</strong> {businessDetails.bank_name}
                    </p>
                  )}
                  {businessDetails.bank_account_no && (
                    <p className="text-slate-600 dark:text-slate-300">
                      <strong>A/C:</strong> {businessDetails.bank_account_no}
                    </p>
                  )}
                  {businessDetails.bank_ifsc && (
                    <p className="text-slate-600 dark:text-slate-300">
                      <strong>IFSC:</strong> {businessDetails.bank_ifsc}
                    </p>
                  )}
                  {businessDetails.upi_id && (
                    <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px] pt-1">
                      <strong>UPI ID:</strong> {businessDetails.upi_id}
                    </p>
                  )}
                </div>

                {qrCodeDataUrl && (
                  <div className="flex flex-col items-center justify-center p-1 bg-white rounded border border-slate-200 shadow-2xs">
                    <img
                      src={qrCodeDataUrl}
                      alt="UPI Payment QR"
                      className="w-20 h-20"
                    />
                    <span className="text-[9px] text-slate-500 font-semibold mt-0.5">
                      Scan to Pay
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Notes / Terms */}
            {pdfPayload.notes && (
              <div className="text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Terms & Notes:
                </p>
                <p className="whitespace-pre-line text-[11px]">
                  {pdfPayload.notes}
                </p>
              </div>
            )}
          </div>

          {/* Right: Calculations */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {formatCurrency(pdfPayload.subtotal)}
              </span>
            </div>

            {pdfPayload.discount_amount ? (
              <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400">
                <span>Discount:</span>
                <span>- {formatCurrency(pdfPayload.discount_amount)}</span>
              </div>
            ) : null}

            {pdfPayload.tax_amount ? (
              <>
                {pdfPayload.cgst ? (
                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                    <span>CGST:</span>
                    <span>{formatCurrency(pdfPayload.cgst)}</span>
                  </div>
                ) : null}
                {pdfPayload.sgst ? (
                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                    <span>SGST:</span>
                    <span>{formatCurrency(pdfPayload.sgst)}</span>
                  </div>
                ) : null}
                {pdfPayload.igst ? (
                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                    <span>IGST:</span>
                    <span>{formatCurrency(pdfPayload.igst)}</span>
                  </div>
                ) : null}
                {!pdfPayload.cgst && !pdfPayload.sgst && !pdfPayload.igst && (
                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                    <span>Tax Amount ({pdfPayload.tax_rate || 0}%):</span>
                    <span>{formatCurrency(pdfPayload.tax_amount)}</span>
                  </div>
                )}
              </>
            ) : null}

            {/* Grand Total */}
            <div className="flex justify-between py-2.5 border-t border-b border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white">
              <span>Total Amount:</span>
              <span className="text-base text-indigo-700 dark:text-indigo-400 font-extrabold">
                {formatCurrency(pdfPayload.total_amount)}
              </span>
            </div>

            {/* Amount Paid & Due */}
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
              <span>Amount Paid:</span>
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                {formatCurrency(pdfPayload.amount_paid || 0)}
              </span>
            </div>

            <div className="flex justify-between py-1 font-semibold text-slate-800 dark:text-slate-200">
              <span>Balance Due:</span>
              <span
                className={
                  (pdfPayload.balance_due || 0) > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-600"
                }
              >
                {formatCurrency(pdfPayload.balance_due || 0)}
              </span>
            </div>

            {/* Party Pending Balance Box when enabled */}
            {(() => {
              const isPartyBalEnabled = salesSettings?.showPartyPendingBalance !== undefined
                ? salesSettings.showPartyPendingBalance
                : (salesSettings?.showPartyPreviousBalance !== undefined
                  ? salesSettings.showPartyPreviousBalance
                  : (localStorage.getItem("rupeebill_show_party_pending_balance") !== null
                    ? localStorage.getItem("rupeebill_show_party_pending_balance") !== "false"
                    : localStorage.getItem("rupeebill_show_party_previous_balance") !== "false"));

              const custName = (pdfPayload.customer_name || "").trim().toLowerCase();
              const isAnon = !custName || 
                custName === "cash customer" || 
                custName === "cash sale" || 
                custName === "walk-in" || 
                custName === "walk-in guest" || 
                custName === "cash";

              if (!isPartyBalEnabled || isAnon) return null;

              const pendingBal = pdfPayload.party_pending_balance !== undefined
                ? Number(pdfPayload.party_pending_balance)
                : Number(pdfPayload.total_due_balance || 0);
              const prevBal = Number(pdfPayload.previous_balance || 0);

              return (
                <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between py-0.5 text-[11px] text-slate-500">
                    <span>Previous Pending:</span>
                    <span className={prevBal > 0 ? "text-slate-700 dark:text-slate-300 font-medium" : prevBal < 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-slate-600 dark:text-slate-400 font-medium"}>
                      {prevBal < 0 ? `-${formatCurrency(Math.abs(prevBal))} (Advance)` : prevBal > 0 ? `${formatCurrency(prevBal)} Dr` : formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-xs font-bold text-slate-900 dark:text-white">
                    <span>
                      {pendingBal < 0 ? "Advance Balance:" : "Pending Balance:"}
                    </span>
                    <span className={
                      pendingBal > 0
                        ? "text-rose-600 dark:text-rose-400 font-extrabold"
                        : pendingBal < 0
                          ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                          : "text-slate-600 dark:text-slate-400 font-bold"
                    }>
                      {pendingBal < 0
                        ? `${formatCurrency(Math.abs(pendingBal))} Cr`
                        : pendingBal > 0
                          ? `${formatCurrency(pendingBal)} Dr`
                          : formatCurrency(0)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Footer Signature & Declaration */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end text-xs text-slate-500">
          <div>
            <p className="text-[10px] text-slate-400">
              Thank you for your business!
            </p>
            <p className="text-[10px] text-slate-400">
              This is a computer generated invoice and requires no signature.
            </p>
          </div>

          <div className="text-right">
            <div className="h-12 flex items-center justify-end">
              {businessDetails.signature_url && (
                <img
                  src={businessDetails.signature_url}
                  alt="Authorized Signature"
                  className="h-10 w-auto object-contain"
                />
              )}
            </div>
            <p className="font-semibold text-slate-800 dark:text-slate-200 border-t border-slate-300 dark:border-slate-700 pt-1">
              For {businessDetails.name}
            </p>
            <p className="text-[10px] text-slate-400">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
};
