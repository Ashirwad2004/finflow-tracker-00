import { Loader2, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentFooterProps {
  isProcessing: boolean;
  onClose: () => void;
}

export const PaymentFooter = ({ isProcessing, onClose }: PaymentFooterProps) => {
  return (
    <>
      <div className="mt-8 flex gap-3 border-t pt-5">
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-2xl h-12 text-slate-600 hover:bg-slate-150 border-slate-200 text-sm font-bold"
          disabled={isProcessing}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 rounded-2xl h-12 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 hover:shadow-indigo-600/35 transition-all active:scale-[0.98]"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              Pay Securely
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      <div className="bg-slate-50/80 border-t border-slate-100 py-3.5 px-6 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground font-semibold -mx-6 -mb-6 mt-6">
        <Lock className="w-3.5 h-3.5 text-slate-400" />
        <span>PCI-DSS Secured · 128-bit Encrypted Connection</span>
      </div>
    </>
  );
};
