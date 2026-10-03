import { ShieldCheck, ChevronUp, ChevronDown, Zap, MapPin } from "lucide-react";

interface PaymentHeaderProps {
  storeName: string;
  amount: number;
  currency: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  showOrderSummary: boolean;
  setShowOrderSummary: (show: boolean) => void;
}

export const PaymentHeader = ({
  storeName,
  amount,
  currency,
  orderId,
  customerName,
  customerPhone,
  showOrderSummary,
  setShowOrderSummary,
}: PaymentHeaderProps) => {
  return (
    <>
      {/* Dynamic Header */}
      <div className="p-6 pb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Secure Checkout
          </h2>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <span>Paying</span>
            <span className="font-semibold text-slate-800">{storeName}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-indigo-600">
            {currency === "INR" ? "₹" : "$"}
            {Number(amount).toFixed(2)}
          </div>
          <button
            type="button"
            onClick={() => setShowOrderSummary(!showOrderSummary)}
            className="text-[10px] text-muted-foreground font-bold hover:text-indigo-600 transition-colors flex items-center gap-0.5 mt-0.5 ml-auto border border-dashed px-1.5 py-0.5 rounded-md hover:bg-slate-50"
          >
            Order Details
            {showOrderSummary ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Collapsible Order Summary & Delivery Notice */}
      <div className="px-6 pb-2">
        {showOrderSummary && (
          <div className="mb-3 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs space-y-2 animate-in slide-in-from-top-2 duration-150">
            <div className="flex justify-between">
              <span className="text-slate-500">Order Reference</span>
              <span className="font-mono text-slate-800">#{orderId.substring(0, 10)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer</span>
              <span className="font-medium text-slate-800">
                {customerName} ({customerPhone})
              </span>
            </div>
          </div>
        )}

        {/* Blinkit Style Delivery Notice */}
        <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-3.5 flex items-center gap-3 animate-in fade-in duration-200">
          <div
            className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 animate-pulse"
            style={{ animationDuration: "2.5s" }}
          >
            <Zap className="w-4 h-4 text-white fill-current" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest">
              Delivery in 10 - 15 Mins
            </p>
            <p className="text-[10px] text-emerald-700/80 mt-0.5 flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-emerald-600/70 flex-shrink-0" />
              Shipping to your saved address
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
