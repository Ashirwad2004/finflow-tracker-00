import { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  generateInvoicePDF,
  InvoiceDetails,
} from "@/utils/generateInvoicePDF";
import { printInvoiceDirectly } from "@/utils/directPrint";
import { InvoicePreviewProps } from "./types";

export function useInvoicePreview({
  invoice,
  profile,
  salesSettings,
}: Pick<InvoicePreviewProps, "invoice" | "profile" | "salesSettings">) {
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
      invoice?.party_pending_balance !== undefined
        ? Number(invoice.party_pending_balance)
        : (invoice?.total_due_balance != null
          ? Number(invoice.total_due_balance)
          : prevBal + dueAmt);

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
      party_pending_balance: closingDue,
      customer_name: invoice?.customer_name || "Cash Customer",
      customer_phone: invoice?.customer_phone || "",
      customer_email: invoice?.customer_email || "",
      customer_gstin: invoice?.customer_gstin || "",
      items: normalizedItems,
      subtotal: Number(invoice?.subtotal ?? totalAmt),
      discount_amount: Number(invoice?.discount_amount ?? 0),
      tax_rate: Number(invoice?.tax_rate ?? 0),
      tax_amount: Number(invoice?.tax_amount ?? 0),
      cgst: Number(invoice?.cgst ?? 0),
      sgst: Number(invoice?.sgst ?? 0),
      igst: Number(invoice?.igst ?? 0),
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
      toast.loading("Sending invoice to printer...", { id: "print-preview" });
      const isPartyBalEnabled = salesSettings?.showPartyPendingBalance ?? salesSettings?.showPartyPreviousBalance;
      await printInvoiceDirectly(pdfPayload, {
        documentType: "invoice",
        showPartyPreviousBalance: isPartyBalEnabled,
        showPartyPendingBalance: isPartyBalEnabled,
      });
      toast.success("Print job sent to printer machine!", { id: "print-preview" });
    } catch (err) {
      console.error("Print error:", err);
      toast.error("Failed to print invoice", { id: "print-preview" });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const isPartyBalEnabled = salesSettings?.showPartyPendingBalance ?? salesSettings?.showPartyPreviousBalance;
      await generateInvoicePDF(pdfPayload, {
        action: "download",
        documentType: "invoice",
        showPartyPreviousBalance: isPartyBalEnabled,
        showPartyPendingBalance: isPartyBalEnabled,
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
      const isPartyBalEnabled = salesSettings?.showPartyPendingBalance ?? salesSettings?.showPartyPreviousBalance;
      const base64Uri = await generateInvoicePDF(pdfPayload, {
        action: "base64",
        documentType: "invoice",
        showPartyPreviousBalance: isPartyBalEnabled,
        showPartyPendingBalance: isPartyBalEnabled,
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

  return {
    businessDetails,
    qrCodeDataUrl,
    pdfPayload,
    isPrinting,
    isDownloading,
    isPreparingWhatsApp,
    isWhatsAppOpen,
    setIsWhatsAppOpen,
    whatsappPdfBase64,
    handlePrint,
    handleDownload,
    handleOpenWhatsApp,
  };
}
