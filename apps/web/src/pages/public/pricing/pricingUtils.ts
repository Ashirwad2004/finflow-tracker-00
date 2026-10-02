import { generateSoftwareBillPDF } from "@/utils/generateSoftwareBillPDF";

export function initPricingBrowserTweaks() {
  // Suppress Canvas2D willReadFrequently browser warning globally
  if (typeof window !== "undefined" && typeof HTMLCanvasElement !== "undefined") {
    const canvasProto = HTMLCanvasElement.prototype as any;
    const originalGetContext = canvasProto.getContext;
    canvasProto.getContext = function (this: unknown, type: string, attributes?: any) {
      if (type === "2d") {
        return originalGetContext.call(this, type, { willReadFrequently: true, ...attributes });
      }
      return originalGetContext.call(this, type, attributes);
    };
  }

  // Convert Razorpay third-party preload links to prefetch to eliminate Chromium's unused preload warning
  if (typeof window !== "undefined" && typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
    try {
      const preloadObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLLinkElement && node.rel === "preload") {
              const href = node.href || "";
              if (href.includes("razorpay.com") || href.includes("checkout-static")) {
                node.rel = "prefetch";
              }
            }
          }
        }
      });

      if (document.head) {
        preloadObserver.observe(document.head, { childList: true });
      } else {
        document.addEventListener("DOMContentLoaded", () => {
          preloadObserver.observe(document.head, { childList: true });
        });
      }

      // Filter out third-party SDK unhandled console warnings
      const originalWarn = console.warn.bind(console);
      console.warn = (...args: any[]) => {
        const first = typeof args[0] === "string" ? args[0] : "";
        if (
          (first.includes("razorpay.com") && first.includes("preloaded using link preload")) ||
          (first.includes("Canvas2D") && first.includes("willReadFrequently"))
        ) {
          return;
        }
        originalWarn(...args);
      };
    } catch {
      // Ignore in non-browser environments
    }
  }
}

export interface DownloadVerifiedBillParams {
  paidPaymentId: string;
  paidOrderId: string;
  paidDateTime: string;
  name: string;
  userEmail?: string;
  userFullName?: string;
  phone?: string;
  displayTotal: number;
  validityMonths: number;
  paymentMethod: "upi" | "card" | "netbanking";
}

export function downloadVerifiedSoftwareBill(params: DownloadVerifiedBillParams) {
  const {
    paidPaymentId,
    paidOrderId,
    paidDateTime,
    name,
    userEmail,
    userFullName,
    phone,
    displayTotal,
    validityMonths,
    paymentMethod,
  } = params;

  const txPaymentId = paidPaymentId || "PAY-VERIFIED-RZP";
  const txOrderId = paidOrderId || "ORD-RZP-SUB";
  const billNum = `BILL-RB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  const now = new Date();
  const formattedDateTime =
    paidDateTime ||
    now.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
      ", " +
      now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }) +
      " IST";

  const startDateStr = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + validityMonths);
  const endDateStr = endDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const paymentMethodLabel =
    paymentMethod === "upi"
      ? "UPI Apps & QR (PhonePe / GPay / Paytm / BHIM)"
      : paymentMethod === "card"
      ? "Credit / Debit Card (Visa / MasterCard / RuPay)"
      : "Net Banking (Indian Banks)";

  generateSoftwareBillPDF({
    billNumber: billNum,
    paymentDateTime: formattedDateTime,
    customerName: name.trim() || userFullName || userEmail?.split("@")[0] || "Valued Merchant",
    customerEmail: userEmail || "customer@rupeebill.com",
    customerPhone: phone?.trim() || undefined,
    amount: displayTotal,
    paymentMethod: paymentMethodLabel,
    paymentSource: "Razorpay Secured Payment Gateway",
    paymentId: txPaymentId,
    orderId: txOrderId,
    validityMonths: validityMonths,
    licenseStartDate: startDateStr,
    licenseEndDate: endDateStr,
  });
}
