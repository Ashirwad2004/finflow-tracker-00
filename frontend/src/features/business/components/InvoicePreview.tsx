import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DialogTitle } from "@/components/ui/dialog";
import {
  Printer,
  Download,
  MessageCircle,
  ArrowLeft,
  CheckCircle2,
  Share2,
  FileText,
  Save,
  Loader2,
  QrCode,
  Building2,
  User,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  generateInvoicePDF,
  convertAmountToIndianWords,
  InvoiceDetails,
} from "@/utils/generateInvoicePDF";
import { SendWhatsAppDialog } from "@/features/whatsapp/components/SendWhatsAppDialog";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { SalesSettings } from "@/core/hooks/use-sales-settings";

export interface InvoicePreviewProps {
  invoice: any;
  profile?: any;
  salesSettings?: SalesSettings;
  onEdit?: () => void;
  onClose: () => void;
  isDraft?: boolean;
  onSave?: () => Promise<void> | void;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  profile,
  salesSettings,
  onEdit,
  onClose,
  isDraft = false,
  onSave,
}) => {
  const { formatCurrency } = useCurrency();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreparingWhatsApp, setIsPreparingWhatsApp] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsappPdfBase64, setWhatsappPdfBase64] = useState<string | undefined>(undefined);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  // Normalize business details
  const businessDetails = useMemo(() => {
    return {
      name:
        profile?.business_name ||
        invoice?.profile?.business_name ||
        "FinFlow Store",
      address:
        profile?.business_address ||
        invoice?.profile?.business_address ||
        "",
      phone:
        profile?.business_phone ||
        invoice?.profile?.business_phone ||
        "",
      gst:
        profile?.gst_number ||
        invoice?.profile?.gst_number ||
        "",
      logo_url:
        profile?.business_logo ||
        profile?.logo_url ||
        invoice?.profile?.business_logo ||
        "",
      signature_url:
        profile?.signature_url ||
        invoice?.profile?.signature_url ||
        "",
      bank_name: profile?.bank_name || "",
      bank_account_no: profile?.bank_account_no || "",
      bank_ifsc: profile?.bank_ifsc || "",
      bank_branch: profile?.bank_branch || "",
      upi_id:
        profile?.upi_id ||
        localStorage.getItem("rupeebill_upi_id") ||
        "",
    };
  }, [profile, invoice]);

  // Generate UPI QR Code URL for preview paper
  useEffect(() => {
    let isMounted = true;
    const upiId = businessDetails.upi_id;
    const totalDue =
      Number(
        invoice?.balance_due != null
          ? invoice.balance_due
          : Math.max(
              0,
              Number(invoice?.total_amount || 0) -
                Number(invoice?.amount_paid || 0)
            )
      ) || Number(invoice?.total_amount || 0);

    if (upiId && totalDue > 0) {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(
        upiId
      )}&pn=${encodeURIComponent(
        businessDetails.name
      )}&am=${totalDue.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
        `Invoice ${invoice?.invoice_number || ""}`
      )}`;

      QRCode.toDataURL(upiUrl, { width: 140, margin: 1 })
        .then((url) => {
          if (isMounted) setQrCodeDataUrl(url);
        })
        .catch(() => {
          if (isMounted) setQrCodeDataUrl(null);
        });
    } else {
      setQrCodeDataUrl(null);
    }

    return () => {
      isMounted = false;
    };
  }, [businessDetails, invoice]);

  // Construct PDF Payload conforming to InvoiceDetails
  const pdfPayload: InvoiceDetails = useMemo(() => {
    const rawItems = invoice?.items || [];
    const normalizedItems = rawItems.map((it: any) => ({
      description: it.description || it.name || "Item",
      quantity: Number(it.quantity || 1),
      price: Number(it.price || 0),
      total: Number(
        it.total ??
          it.amount ??
          Number(it.quantity || 1) * Number(it.price || 0)
      ),
      hsn_code: it.hsn_code || "",
      unit: it.unit || "",
      tax_rate: it.tax_rate != null ? Number(it.tax_rate) : undefined,
    }));

    const totalAmt = Number(invoice?.total_amount || 0);
    const paidAmt = Number(invoice?.amount_paid || 0);
    const dueAmt =
      invoice?.balance_due != null
        ? Number(invoice.balance_due)
        : Math.max(0, totalAmt - paidAmt);
    const prevBal = Number(invoice?.previous_balance || 0);
    const closingDue =
      invoice?.total_due_balance != null
        ? Number(invoice.total_due_balance)
        : prevBal + dueAmt;

    return {
      invoice_number: invoice?.invoice_number || "INV-DRAFT",
      date:
        invoice?.date ||
        invoice?.created_at ||
        new Date().toISOString().split("T")[0],
      due_date: invoice?.due_date || undefined,
      status: invoice?.status || (paidAmt >= totalAmt ? "paid" : "pending"),
      amount_paid: paidAmt,
      balance_due: dueAmt,
      payment_method: invoice?.payment_method || "cash",
      previous_balance: prevBal,
      total_due_balance: closingDue,
      customer_name: invoice?.customer_name || "Cash Customer",
      customer_phone: invoice?.customer_phone || "",
      customer_email: invoice?.customer_email || "",
      customer_gstin: invoice?.customer_gstin || "",
      items: normalizedItems,
      subtotal: Number(invoice?.subtotal || totalAmt),
      discount_amount: Number(invoice?.discount_amount || 0),
      tax_rate: Number(invoice?.tax_rate || 0),
      tax_amount: Number(invoice?.tax_amount || 0),
      cgst: Number(invoice?.cgst || 0),
      sgst: Number(invoice?.sgst || 0),
      igst: Number(invoice?.igst || 0),
      total_amount: totalAmt,
      notes: invoice?.notes || "",
      irn: invoice?.irn || undefined,
      eway_bill_number: invoice?.eway_bill_number || undefined,
      qr_code: invoice?.qr_code || undefined,
      business_details: businessDetails,
    };
  }, [invoice, businessDetails]);

  // Handlers
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const url = await generateInvoicePDF(pdfPayload, {
        action: "preview",
        documentType: "invoice",
        showPartyPreviousBalance: salesSettings?.showPartyPreviousBalance,
      });

      if (url) {
        const printWindow = window.open(String(url), "_blank");
        if (printWindow) {
          printWindow.onload = () => {
            try {
              printWindow.print();
            } catch (e) {
              console.warn("Auto-print preview window onload:", e);
            }
          };
        }
      }
    } catch (err) {
      console.error("Print error:", err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await generateInvoicePDF(pdfPayload, {
        action: "download",
        documentType: "invoice",
        showPartyPreviousBalance: salesSettings?.showPartyPreviousBalance,
      });
      toast.success(`Invoice ${pdfPayload.invoice_number} downloaded.`);
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download invoice PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenWhatsApp = async () => {
    setIsPreparingWhatsApp(true);
    try {
      const base64Uri = await generateInvoicePDF(pdfPayload, {
        action: "base64",
        documentType: "invoice",
        showPartyPreviousBalance: salesSettings?.showPartyPreviousBalance,
      });

      if (base64Uri && typeof base64Uri === "string") {
        setWhatsappPdfBase64(base64Uri);
      } else {
        setWhatsappPdfBase64(undefined);
      }
      setIsWhatsAppOpen(true);
    } catch (err) {
      console.warn("Could not generate base64 PDF for WhatsApp:", err);
      setWhatsappPdfBase64(undefined);
      setIsWhatsAppOpen(true);
    } finally {
      setIsPreparingWhatsApp(false);
    }
  };

  const items = pdfPayload.items;
  const isPaid = pdfPayload.status === "paid";
  const isPartial = pdfPayload.status === "partial";

  return (
    <div className="flex flex-col h-full max-h-[92vh] overflow-hidden bg-slate-50 dark:bg-slate-950">
      <DialogTitle className="sr-only">
        Invoice Preview - {pdfPayload.invoice_number}
      </DialogTitle>

      {/* ============================================================== */}
      {/* TOP ACTION BAR                                                 */}
      {/* ============================================================== */}
      <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          {onEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-8 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Edit
            </Button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {pdfPayload.invoice_number}
            </span>

            {isDraft ? (
              <Badge
                variant="outline"
                className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[11px]"
              >
                Draft Preview
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className={`text-[11px] font-semibold ${
                  isPaid
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : isPartial
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                }`}
              >
                {isPaid ? "Paid" : isPartial ? "Partial Due" : "Unpaid / Pending"}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons: Preview / Print / Download / WhatsApp / Done */}
        <div className="flex items-center gap-2 flex-wrap">
          {isDraft && onSave && (
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Invoice
            </Button>
          )}

          {/* Print */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={isPrinting}
            className="h-8 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs"
            title="Print Invoice"
          >
            {isPrinting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            )}
            Print
          </Button>

          {/* Download PDF */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="h-8 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs"
            title="Download PDF file"
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            )}
            Download PDF
          </Button>

          {/* Send WhatsApp */}
          <Button
            type="button"
            size="sm"
            onClick={handleOpenWhatsApp}
            disabled={isPreparingWhatsApp}
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
            title="Send Invoice to customer via WhatsApp"
          >
            {isPreparingWhatsApp ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
            )}
            Send WhatsApp
          </Button>

          {/* Done / Close */}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onClose}
            className="h-8 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Done
          </Button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SCROLLABLE INVOICE PAPER VIEW                                   */}
      {/* ============================================================== */}
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

              {/* Prior Balance & Total Closing Balance if enabled or present */}
              {pdfPayload.previous_balance ? (
                <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between py-0.5 text-[11px] text-slate-500">
                    <span>Previous Outstanding:</span>
                    <span>{formatCurrency(pdfPayload.previous_balance)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs font-bold text-slate-900 dark:text-white">
                    <span>Total Closing Balance:</span>
                    <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                      {formatCurrency(pdfPayload.total_due_balance || 0)}
                    </span>
                  </div>
                </div>
              ) : null}
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

      {/* ============================================================== */}
      {/* SEND WHATSAPP DIALOG                                           */}
      {/* Uses existing backend endpoint /whatsapp/send-invoice           */}
      {/* ============================================================== */}
      {isWhatsAppOpen && (
        <SendWhatsAppDialog
          open={isWhatsAppOpen}
          onOpenChange={setIsWhatsAppOpen}
          messageType="invoice"
          recipientName={pdfPayload.customer_name || "Customer"}
          recipientPhone={pdfPayload.customer_phone || ""}
          attachmentName={`Invoice_${pdfPayload.invoice_number}.pdf`}
          attachmentBase64={whatsappPdfBase64}
          metadata={{
            invoice_id: invoice?.id,
            invoice_number: pdfPayload.invoice_number,
            total_amount: Number(pdfPayload.total_amount || 0),
            amount_paid: Number(pdfPayload.amount_paid || 0),
            balance_due: Number(pdfPayload.balance_due || 0),
            due_date: pdfPayload.due_date || undefined,
          }}
          onSuccess={() => {
            toast.success("Invoice sent via WhatsApp successfully!");
          }}
        />
      )}
    </div>
  );
};
