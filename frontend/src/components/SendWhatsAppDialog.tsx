import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageSquare, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/core/integrations/supabase/client";

interface SendWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  amount: number;
  dueDate?: string | null;
  mode: "lent" | "borrowed" | "group";
  groupName?: string;
  creditorName?: string;
}

export const SendWhatsAppDialog = ({
  open,
  onOpenChange,
  recipientName,
  amount,
  dueDate,
  mode,
  groupName = "",
  creditorName = "",
}: SendWhatsAppDialogProps) => {
  const [phone, setPhone] = useState("");
  const [messageOption, setMessageOption] = useState("both");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch party phone number from parties directory if name matches
  useEffect(() => {
    if (!open || !recipientName) return;

    const fetchPartyPhone = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("parties")
          .select("phone")
          .ilike("name", recipientName.trim())
          .maybeSingle();

        if (error) {
          console.error("Error fetching party phone:", error);
          return;
        }

        if (data && data.phone) {
          setPhone(data.phone);
        } else {
          setPhone("");
        }
      } catch (err) {
        console.error("Failed to query party phone number:", err);
      }
    };

    fetchPartyPhone();
  }, [open, recipientName]);

  // Auto-generate the message text based on selection option
  useEffect(() => {
    if (!open) return;

    const formattedAmount = `Rs. ${Number(amount).toFixed(2)}`;
    const formattedDate = dueDate ? new Date(dueDate).toLocaleDateString() : "";

    let text = "";

    if (mode === "lent") {
      if (messageOption === "amount_only") {
        text = `Hi ${recipientName},\n\nThis is a friendly reminder regarding the pending amount of ${formattedAmount} lent to you.\n\nPlease clear the dues when possible. Thank you!`;
      } else if (messageOption === "date_only" && formattedDate) {
        text = `Hi ${recipientName},\n\nThis is a friendly reminder that the loan lent to you is due on ${formattedDate}.\n\nPlease clear the dues by the due date. Thank you!`;
      } else {
        // "both" or default fallback
        const datePart = formattedDate ? ` which is due on ${formattedDate}` : "";
        text = `Hi ${recipientName},\n\nThis is a friendly reminder regarding the pending amount of ${formattedAmount} lent to you${datePart}.\n\nPlease clear the dues when possible. Thank you!`;
      }
    } else if (mode === "borrowed") {
      if (messageOption === "amount_only") {
        text = `Hi ${recipientName},\n\nThis is regarding the amount of ${formattedAmount} I borrowed from you.\n\nI will repay it soon. Thank you!`;
      } else if (messageOption === "date_only" && formattedDate) {
        text = `Hi ${recipientName},\n\nThis is regarding the money I borrowed from you, which is scheduled to be repaid by ${formattedDate}.\n\nThank you!`;
      } else {
        // "both" or default fallback
        const datePart = formattedDate ? `, scheduled to be repaid by ${formattedDate}` : "";
        text = `Hi ${recipientName},\n\nThis is regarding the amount of ${formattedAmount} I borrowed from you${datePart}.\n\nThank you!`;
      }
    } else if (mode === "group") {
      // Group mode reminder (always contains both details as it's a settlement)
      text = `Hi ${recipientName},\n\nFriendly reminder: You owe ${formattedAmount} to ${creditorName} in our group "${groupName}".\n\nPlease settle up when you get a chance!`;
    }

    setMessageText(text);
  }, [open, messageOption, amount, dueDate, recipientName, mode, groupName, creditorName]);

  const handleSend = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Please enter a valid phone number with country code (e.g. 919876543210)");
      return;
    }

    setSending(true);
    const toastId = toast.loading(`Sending WhatsApp message to ${recipientName}...`);

    try {
      const res = await fetch("/api/v1/whatsapp/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: cleanPhone,
          text: messageText,
        }),
      });

      if (res.ok) {
        toast.success(`Message sent successfully to ${recipientName}!`, { id: toastId });
        onOpenChange(false);
      } else {
        const data = await res.json().catch(() => ({}));
        const errMsg = data.detail || "Failed to send WhatsApp message. Make sure WhatsApp is linked in settings.";
        toast.error(errMsg, { id: toastId });
      }
    } catch (err: any) {
      console.error("Error sending WhatsApp message:", err);
      toast.error("Failed to connect to the WhatsApp service.", { id: toastId });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-500" />
            Send WhatsApp Reminder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Recipient Info */}
          <div className="bg-muted/40 p-3 rounded-lg border text-sm space-y-1">
            <p className="text-muted-foreground">
              To: <span className="font-semibold text-foreground">{recipientName}</span>
            </p>
            <p className="text-muted-foreground">
              Amount: <span className="font-semibold text-foreground">Rs. {Number(amount).toFixed(2)}</span>
            </p>
            {dueDate && (
              <p className="text-muted-foreground">
                Due Date: <span className="font-semibold text-foreground">{new Date(dueDate).toLocaleDateString()}</span>
              </p>
            )}
          </div>

          {/* Phone Number Input */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number (with Country Code)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g. 919876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Ensure you include the country code (e.g. 91 for India) without '+' or spaces.
            </p>
          </div>

          {/* Message Customization options (only for lent/borrowed modes) */}
          {mode !== "group" && dueDate && (
            <div className="space-y-2">
              <Label>Message Format</Label>
              <RadioGroup
                value={messageOption}
                onValueChange={setMessageOption}
                className="grid grid-cols-3 gap-2"
              >
                <div>
                  <RadioGroupItem
                    value="both"
                    id="both"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="both"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-xs"
                  >
                    Both
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="amount_only"
                    id="amount_only"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="amount_only"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-xs"
                  >
                    Amount Only
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="date_only"
                    id="date_only"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="date_only"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-xs"
                  >
                    Date Only
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Message Preview Editor */}
          <div className="space-y-1.5">
            <Label htmlFor="message">Message Preview (Editable)</Label>
            <Textarea
              id="message"
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-2" />
                  Send via WhatsApp
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
