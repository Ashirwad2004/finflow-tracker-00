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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { ChequeRecord } from "../types";

interface ChequeBounceDialogProps {
  cheque: ChequeRecord | null;
  onClose: () => void;
  bounceReason: string;
  onBounceReasonChange: (reason: string) => void;
  onConfirm: () => void;
}

export const ChequeBounceDialog: React.FC<ChequeBounceDialogProps> = ({
  cheque,
  onClose,
  bounceReason,
  onBounceReasonChange,
  onConfirm,
}) => {
  return (
    <Dialog open={!!cheque} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[400px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Mark Cheque as Bounced
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select the reason for cheque return. This updates the audit trail.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
              Return Reason
            </label>
            <Select value={bounceReason} onValueChange={onBounceReasonChange}>
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Insufficient Funds">Funds Insufficient (Code 01)</SelectItem>
                <SelectItem value="Signature Mismatch">Signature Differs (Code 02)</SelectItem>
                <SelectItem value="Stop Payment">Payment Stopped by Drawer</SelectItem>
                <SelectItem value="Post Dated / Stale">Post Dated / Stale Cheque</SelectItem>
                <SelectItem value="Account Closed">Account Closed / Frozen</SelectItem>
                <SelectItem value="Other">Other Technical Reason</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 text-xs rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="h-9 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            Confirm Cheque Bounce
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
