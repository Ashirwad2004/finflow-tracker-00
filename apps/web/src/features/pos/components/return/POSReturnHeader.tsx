import { RotateCcw } from "lucide-react";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const POSReturnHeader = () => {
  return (
    <DialogHeader className="p-5 border-b border-border/80 bg-muted/30 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-2xs">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-foreground">
              Sales Return & Credit Note
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Look up customer invoice, select items to return, restock inventory, and issue an official GST Credit Note.
            </p>
          </div>
        </div>
      </div>
    </DialogHeader>
  );
};
