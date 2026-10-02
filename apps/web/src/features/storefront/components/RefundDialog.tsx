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
import { RefreshCw } from "lucide-react";

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refundAmount: string;
  setRefundAmount: (amount: string) => void;
  refundReason: string;
  setRefundReason: (reason: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function RefundDialog({
  open,
  onOpenChange,
  refundAmount,
  setRefundAmount,
  refundReason,
  setRefundReason,
  onSubmit,
  isPending,
}: RefundDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-destructive" />
            Trigger Customer Refund
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Specify refund request values. Action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="refund-amt">Refund Amount (INR)</Label>
            <Input
              id="refund-amt"
              type="number"
              placeholder="Leave blank to refund full amount"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund-res">
              Reason for Refund <span className="text-red-400">*</span>
            </Label>
            <Input
              id="refund-res"
              placeholder="Customer cancellation / Stock shortage"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="rounded-xl h-10 font-bold"
              disabled={isPending}
            >
              {isPending ? "Refunding..." : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
