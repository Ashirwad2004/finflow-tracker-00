import React from "react";
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
import { Send, Loader2 } from "lucide-react";

interface WhatsAppTestMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  onPhoneChange: (val: string) => void;
  onSubmit: () => void;
  isSending: boolean;
}

export const WhatsAppTestMessageDialog: React.FC<WhatsAppTestMessageDialogProps> = ({
  open,
  onOpenChange,
  phone,
  onPhoneChange,
  onSubmit,
  isSending,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-600" />
            Send Test WhatsApp Message
          </DialogTitle>
          <DialogDescription className="text-xs">
            Verify your connected WhatsApp number by sending a test message to your phone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Recipient Mobile Number</Label>
            <Input
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="e.g. 9876543210"
              className="text-xs font-mono"
            />
            <p className="text-[10px] text-slate-400">10-digit Indian mobile number</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={isSending || !phone.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Send Test
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
