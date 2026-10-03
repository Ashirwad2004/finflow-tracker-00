import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";

interface POSShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const POSShortcutsModal: React.FC<POSShortcutsModalProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            Retail POS Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2.5 py-3 text-sm">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
            <span className="text-muted-foreground">Change Customer</span>
            <kbd className="px-2 py-0.5 rounded bg-card border font-mono font-bold text-xs">
              F2
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
            <span className="text-muted-foreground">Charge / Open Payment Modal</span>
            <kbd className="px-2 py-0.5 rounded bg-card border font-mono font-bold text-xs">
              F4
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
            <span className="text-muted-foreground">Park / Hold Current Bill</span>
            <kbd className="px-2 py-0.5 rounded bg-card border font-mono font-bold text-xs">
              F8
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
            <span className="text-muted-foreground">Clear Cart / New Sale</span>
            <kbd className="px-2 py-0.5 rounded bg-card border font-mono font-bold text-xs">
              F9
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
            <span className="text-muted-foreground">Sales Return & Credit Note</span>
            <kbd className="px-2 py-0.5 rounded bg-card border font-mono font-bold text-xs">
              F10
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
            <span className="text-muted-foreground">Focus Barcode / Search Input</span>
            <kbd className="px-2 py-0.5 rounded bg-card border font-mono font-bold text-xs">
              Ctrl + K
            </kbd>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
