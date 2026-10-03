import { CheckCircle2, RotateCcw, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface POSReturnSuccessViewProps {
  completedReturn: any;
  onReset: () => void;
  onPrintReceipt: () => void;
}

export const POSReturnSuccessView = ({
  completedReturn,
  onReset,
  onPrintReceipt,
}: POSReturnSuccessViewProps) => {
  return (
    <div className="py-8 text-center space-y-5">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-xs">
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-foreground">Return Successfully Processed</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Credit Note #{completedReturn.credit_note?.invoice_number || "CN-GENERATED"} has been recorded into the sales ledger.
        </p>
      </div>

      <div className="bg-muted/40 border border-border/80 rounded-2xl p-5 max-w-md mx-auto text-left space-y-3 shadow-xs">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Return Reference:</span>
          <span className="font-mono text-primary font-semibold">
            {completedReturn.return?.return_number}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Original Invoice:</span>
          <span className="font-medium text-foreground">
            {completedReturn.originalSale?.invoice_number}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Refund Method:</span>
          <span className="capitalize font-medium text-foreground">
            {completedReturn.return?.refund_method}
          </span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t border-border/80">
          <span className="text-foreground font-semibold">Total Refund:</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{completedReturn.totalRefund.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 pt-4">
        <Button
          variant="outline"
          className="border-border hover:bg-muted text-foreground font-semibold"
          onClick={onReset}
        >
          <RotateCcw className="w-4 h-4 mr-2" /> Process Another Return
        </Button>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
          onClick={onPrintReceipt}
        >
          <Printer className="w-4 h-4 mr-2" /> Print Credit Note Receipt
        </Button>
      </div>
    </div>
  );
};
