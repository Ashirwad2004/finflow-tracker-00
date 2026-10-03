import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useWhatsAppStatus } from "../../hooks/useWhatsApp";
import apiClient from "@/core/api/apiClient";
import { WhatsAppSendResult } from "../../types";
import { OverdueInvoiceItem, OverdueRowState } from "./types";
import { isValidPhone } from "./phoneUtils";

interface UseBulkWhatsAppReminderOptions {
  open: boolean;
  invoices: OverdueInvoiceItem[];
  currencySymbol?: string;
  onSuccess?: () => void;
}

export function useBulkWhatsAppReminder({
  open,
  invoices,
  currencySymbol = "₹",
  onSuccess,
}: UseBulkWhatsAppReminderOptions) {
  const queryClient = useQueryClient();
  const {
    data: connStatus,
    isLoading: isCheckingStatus,
    refetch: refetchStatus,
  } = useWhatsAppStatus();

  const [customNote, setCustomNote] = useState<string>("");
  const [rows, setRows] = useState<OverdueRowState[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sentCount, setSentCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // Initialize or reset row states when dialog opens or invoices change
  useEffect(() => {
    if (open) {
      setRows(
        invoices.map((inv) => ({
          invoice: inv,
          selected: isValidPhone(inv.customer_phone),
          status: "idle",
        }))
      );
      setSentCount(0);
      setFailedCount(0);
      setCurrentIndex(-1);
      setIsProcessing(false);
    }
  }, [open, invoices]);

  const isConnected = connStatus?.status === "connected";

  const totalOverdueBalance = useMemo(() => {
    return invoices.reduce((acc, inv) => {
      const bal =
        inv.balance_due != null
          ? Number(inv.balance_due)
          : Math.max(0, Number(inv.total_amount) - Number(inv.amount_paid || 0));
      return acc + bal;
    }, 0);
  }, [invoices]);

  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);
  const validPhoneCount = useMemo(
    () => invoices.filter((inv) => isValidPhone(inv.customer_phone)).length,
    [invoices]
  );

  const allSelected =
    selectedRows.length ===
      rows.filter((r) => isValidPhone(r.invoice.customer_phone)).length &&
    rows.length > 0;

  const handleSelectAll = (checked: boolean) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        selected: checked ? isValidPhone(r.invoice.customer_phone) : false,
      }))
    );
  };

  const handleToggleRow = (index: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSendBulk = async () => {
    if (!isConnected) {
      toast.error("WhatsApp is not connected. Please connect your device first.");
      return;
    }

    const toSendIndices = rows
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.selected && isValidPhone(r.invoice.customer_phone));

    if (toSendIndices.length === 0) {
      toast.info("Please select at least one customer with a valid phone number.");
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toSendIndices.length; i++) {
      const { r, idx } = toSendIndices[i];
      setCurrentIndex(i + 1);

      // Mark row as sending
      setRows((prev) =>
        prev.map((row, rowIdx) =>
          rowIdx === idx ? { ...row, status: "sending" } : row
        )
      );

      const bal =
        r.invoice.balance_due != null
          ? Number(r.invoice.balance_due)
          : Math.max(
              0,
              Number(r.invoice.total_amount) - Number(r.invoice.amount_paid || 0)
            );

      try {
        const payload = {
          party_id: r.invoice.party_id || undefined,
          customer_name: r.invoice.customer_name,
          customer_phone: r.invoice.customer_phone || "",
          outstanding_amount: bal,
          invoice_number: r.invoice.invoice_number,
          due_date: r.invoice.due_date || undefined,
          currency_symbol: currencySymbol,
          custom_notes: customNote.trim() || undefined,
          force_resend: true,
        };

        const res = await apiClient.post<WhatsAppSendResult>(
          "/api/v1/whatsapp/send-reminder",
          payload
        );

        if (res.data?.success) {
          successCount++;
          setSentCount(successCount);
          setRows((prev) =>
            prev.map((row, rowIdx) =>
              rowIdx === idx
                ? {
                    ...row,
                    status: "success",
                    resultMessageId: res.data.message_id,
                  }
                : row
            )
          );
        } else {
          throw new Error(res.data?.detail || "Send failed");
        }
      } catch (err: any) {
        failCount++;
        setFailedCount(failCount);
        const errMsg =
          err.response?.data?.detail ||
          err.message ||
          "Failed to deliver WhatsApp reminder";
        setRows((prev) =>
          prev.map((row, rowIdx) =>
            rowIdx === idx ? { ...row, status: "failed", error: errMsg } : row
          )
        );
      }

      // Gentle pause of 600ms between sends to avoid rate limiting
      if (i < toSendIndices.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    setIsProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["whatsapp_messages"] });

    if (successCount > 0) {
      toast.success(
        `Dispatched WhatsApp reminders to ${successCount} customer${
          successCount === 1 ? "" : "s"
        }!`
      );
      if (onSuccess) onSuccess();
    }
    if (failCount > 0) {
      toast.warning(`${failCount} reminder${failCount === 1 ? "" : "s"} could not be sent.`);
    }
  };

  const totalToSend = selectedRows.filter((r) =>
    isValidPhone(r.invoice.customer_phone)
  ).length;
  const progressPercent =
    totalToSend > 0 ? ((sentCount + failedCount) / totalToSend) * 100 : 0;

  return {
    connStatus,
    isCheckingStatus,
    refetchStatus,
    isConnected,
    customNote,
    setCustomNote,
    rows,
    isProcessing,
    sentCount,
    failedCount,
    currentIndex,
    totalOverdueBalance,
    selectedRows,
    validPhoneCount,
    allSelected,
    totalToSend,
    progressPercent,
    handleSelectAll,
    handleToggleRow,
    handleSendBulk,
  };
}
