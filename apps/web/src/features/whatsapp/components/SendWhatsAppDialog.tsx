import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  FileText,
  AlertTriangle,
  Send,
  Loader2,
  CheckCircle2,
  WifiOff,
  Phone,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  useWhatsAppStatus,
  useWhatsAppSendInvoice,
  useWhatsAppSendReceipt,
  useWhatsAppSendReminder,
  useWhatsAppSendMessage,
} from "../hooks/useWhatsApp";

export interface SendWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageType: "invoice" | "receipt" | "reminder" | "custom";
  recipientName?: string;
  recipientPhone?: string;
  defaultMessage?: string;
  attachmentName?: string;
  attachmentBase64?: string;
  metadata?: {
    invoice_id?: string;
    invoice_number?: string;
    total_amount?: number;
    amount_paid?: number;
    balance_due?: number;
    payment_id?: string;
    receipt_number?: string;
    amount_received?: number;
    remaining_balance?: number;
    payment_method?: string;
    party_id?: string;
    outstanding_amount?: number;
    due_date?: string;
    currency_symbol?: string;
  };
  onSuccess?: () => void;
}

export const SendWhatsAppDialog: React.FC<SendWhatsAppDialogProps> = ({
  open,
  onOpenChange,
  messageType,
  recipientName = "Customer",
  recipientPhone = "",
  defaultMessage = "",
  attachmentName,
  attachmentBase64,
  metadata = {},
  onSuccess,
}) => {
  const [phone, setPhone] = useState(recipientPhone);
  const [message, setMessage] = useState(defaultMessage);
  const [phoneError, setPhoneError] = useState("");
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  const { data: connStatus, isLoading: statusLoading } = useWhatsAppStatus();
  const sendInvoiceMutation = useWhatsAppSendInvoice();
  const sendReceiptMutation = useWhatsAppSendReceipt();
  const sendReminderMutation = useWhatsAppSendReminder();
  const sendMessageMutation = useWhatsAppSendMessage();

  const isSending =
    sendInvoiceMutation.isPending ||
    sendReceiptMutation.isPending ||
    sendReminderMutation.isPending ||
    sendMessageMutation.isPending;

  // Sync props when opening
  useEffect(() => {
    if (open) {
      setPhone(recipientPhone);
      setMessage(defaultMessage);
      setPhoneError("");
    }
  }, [open, recipientPhone, defaultMessage]);

  const cleanDigits = phone.replace(/[^\d]/g, "");
  const normalizedPhone =
    cleanDigits.length === 10
      ? `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`
      : cleanDigits.length === 12 && cleanDigits.startsWith("91")
      ? `+91 ${cleanDigits.slice(2, 7)} ${cleanDigits.slice(7)}`
      : phone;

  const validatePhone = (inputPhone: string): boolean => {
    const digits = inputPhone.replace(/[^\d]/g, "");
    if (!digits) {
      setPhoneError("Phone number is required.");
      return false;
    }
    if (digits.length === 10) {
      if (!["6", "7", "8", "9"].includes(digits[0])) {
        setPhoneError("Indian numbers must start with 6, 7, 8, or 9.");
        return false;
      }
    } else if (digits.length === 12 && digits.startsWith("91")) {
      if (!["6", "7", "8", "9"].includes(digits[2])) {
        setPhoneError("Local number must start with 6, 7, 8, or 9.");
        return false;
      }
    } else if (digits.length < 10 || digits.length > 15) {
      setPhoneError("Invalid phone number length (expected 10-digit Indian number).");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleSend = async () => {
    if (!isOnline) {
      toast.error(
        "WhatsApp requires an internet connection. Your invoice/payment has already been saved locally."
      );
      return;
    }

    if (!validatePhone(phone)) {
      return;
    }

    if (connStatus?.status !== "connected") {
      toast.error("WhatsApp is not connected. Please connect in Settings -> WhatsApp.");
      return;
    }

    try {
      if (messageType === "invoice") {
        await sendInvoiceMutation.mutateAsync({
          invoice_id: metadata.invoice_id,
          invoice_number: metadata.invoice_number || "INV-001",
          customer_name: recipientName,
          customer_phone: phone,
          total_amount: metadata.total_amount || 0,
          amount_paid: metadata.amount_paid || 0,
          balance_due: metadata.balance_due || 0,
          due_date: metadata.due_date,
          currency_symbol: metadata.currency_symbol || "₹",
          document_base64: attachmentBase64,
          document_filename: attachmentName,
          custom_notes: message !== defaultMessage ? message : undefined,
          force_resend: true,
        });
      } else if (messageType === "receipt") {
        await sendReceiptMutation.mutateAsync({
          payment_id: metadata.payment_id,
          receipt_number: metadata.receipt_number || "REC-001",
          customer_name: recipientName,
          customer_phone: phone,
          amount_received: metadata.amount_received || 0,
          invoice_number: metadata.invoice_number,
          remaining_balance: metadata.remaining_balance || 0,
          payment_method: metadata.payment_method || "Cash",
          currency_symbol: metadata.currency_symbol || "₹",
          document_base64: attachmentBase64,
          document_filename: attachmentName,
          custom_notes: message !== defaultMessage ? message : undefined,
          force_resend: true,
        });
      } else if (messageType === "reminder") {
        await sendReminderMutation.mutateAsync({
          party_id: metadata.party_id,
          customer_name: recipientName,
          customer_phone: phone,
          outstanding_amount: metadata.outstanding_amount || 0,
          invoice_number: metadata.invoice_number,
          due_date: metadata.due_date,
          currency_symbol: metadata.currency_symbol || "₹",
          custom_notes: message !== defaultMessage ? message : undefined,
          force_resend: true,
        });
      } else {
        await sendMessageMutation.mutateAsync({
          phone_number: phone,
          message: message,
          customer_name: recipientName,
          document_base64: attachmentBase64,
          document_filename: attachmentName,
          message_type: "custom",
          force_resend: true,
        });
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      // Failure is gracefully caught without throwing to outer transaction
      console.warn("WhatsApp send failed:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden bg-background border-slate-200 dark:border-slate-800 shadow-xl">
        <DialogHeader className="p-6 pb-4 bg-emerald-500/5 dark:bg-emerald-950/20 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <MessageCircle className="w-5 h-5 fill-emerald-500/20" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  Send via WhatsApp
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  {messageType === "invoice" && "Deliver tax invoice and PDF directly to customer."}
                  {messageType === "receipt" && "Deliver formal payment receipt confirmation."}
                  {messageType === "reminder" && "Send polite pending balance reminder."}
                  {messageType === "custom" && "Direct business communication via verified WhatsApp."}
                </DialogDescription>
              </div>
            </div>

            {connStatus?.status === "connected" ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                Not Connected
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Offline Warning Banner */}
          {!isOnline && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <WifiOff className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">Offline Mode:</span> WhatsApp requires an internet
                connection. Your invoice/payment has already been saved locally.
              </div>
            </div>
          )}

          {/* WhatsApp Disconnected Warning */}
          {connStatus?.status !== "connected" && !statusLoading && isOnline && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                Your business WhatsApp is currently disconnected. Go to{" "}
                <span className="font-semibold text-primary">Settings → WhatsApp</span> to scan the
                QR code and link your device.
              </div>
            </div>
          )}

          {/* Customer & Phone Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Customer / Party
              </Label>
              <Input
                value={recipientName}
                disabled
                className="bg-slate-50 dark:bg-slate-900 text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Destination Phone
              </Label>
              <Input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  validatePhone(e.target.value);
                }}
                placeholder="+91 98765 43210"
                className={`text-xs font-mono font-medium ${
                  phoneError ? "border-red-500 focus-visible:ring-red-400" : ""
                }`}
              />
              {phoneError ? (
                <p className="text-[11px] text-red-500 font-medium">{phoneError}</p>
              ) : (
                <p className="text-[10px] text-slate-400">Formats to: {normalizedPhone}</p>
              )}
            </div>
          </div>

          {/* Message Preview */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Message Content
            </Label>
            <Textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter message text..."
              className="text-xs font-sans resize-none leading-relaxed bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* PDF Attachment Badge */}
          {attachmentName && (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[260px]">
                    {attachmentName}
                  </p>
                  <p className="text-[10px] text-slate-400">PDF Document will be sent as attachment</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                Ready
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={isSending || !isOnline || connStatus?.status !== "connected" || !!phoneError}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Send via WhatsApp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
