import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentSuccessModalProps {
  paidPaymentId: string;
  paidDateTime: string;
  onDownloadBill: () => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  paidPaymentId,
  paidDateTime,
  onDownloadBill,
}) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-card text-card-foreground border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl shadow-emerald-500/10 animate-scale-in">
        <div className="w-20 h-20 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-500">
          <Sparkles className="w-10 h-10 animate-spin" style={{ animationDuration: "6s" }} />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-2xl font-black text-foreground">Payment Confirmed!</h2>
          <p className="text-muted-foreground text-sm">
            Your RupeeBill Business software license is active for 6 Months.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-muted/50 border border-border text-xs text-muted-foreground space-y-2 text-left">
          <div className="flex justify-between">
            <span>Product:</span>
            <span className="font-semibold text-foreground">RupeeBill Business Pro</span>
          </div>
          <div className="flex justify-between">
            <span>License Term:</span>
            <span className="font-semibold text-primary">6 Months Access</span>
          </div>
          <div className="flex justify-between">
            <span>Amount Paid:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹299.00 (Flat)</span>
          </div>
          <div className="flex justify-between">
            <span>Payment ID:</span>
            <span className="font-mono text-[11px] text-foreground">{paidPaymentId || "Verified"}</span>
          </div>
          <div className="flex justify-between">
            <span>Date & Time:</span>
            <span className="text-foreground">{paidDateTime}</span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Button
            onClick={onDownloadBill}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" /> Download Official RupeeBill Bill (PDF)
          </Button>

          <Button
            onClick={() => navigate("/business-dashboard")}
            variant="outline"
            className="w-full h-12 border-border font-bold rounded-xl"
          >
            Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};
