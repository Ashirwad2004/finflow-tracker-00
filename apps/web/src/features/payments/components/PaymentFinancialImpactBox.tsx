import React from "react";
import { ChevronRight } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";

interface PaymentFinancialImpactBoxProps {
  partyBalance: number;
  enteredAmount: number;
  balanceAfterPayment: number;
}

export const PaymentFinancialImpactBox: React.FC<PaymentFinancialImpactBoxProps> = ({
  partyBalance,
  enteredAmount,
  balanceAfterPayment,
}) => {
  const { formatCurrency } = useCurrency();

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-xs">
      <div>
        <span className="text-slate-400 block text-[10px] uppercase font-bold">
          Party Balance Before
        </span>
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {formatCurrency(partyBalance)}
        </span>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400" />
      <div>
        <span className="text-slate-400 block text-[10px] uppercase font-bold">
          Payment
        </span>
        <span className="font-extrabold text-emerald-600">
          - {formatCurrency(enteredAmount)}
        </span>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400" />
      <div>
        <span className="text-slate-400 block text-[10px] uppercase font-bold">
          Remaining Outstanding
        </span>
        <span
          className={`font-black ${
            balanceAfterPayment > 0
              ? "text-rose-600"
              : balanceAfterPayment < 0
              ? "text-emerald-600"
              : "text-slate-900 dark:text-white"
          }`}
        >
          {balanceAfterPayment > 0
            ? `${formatCurrency(balanceAfterPayment)} Dr`
            : balanceAfterPayment < 0
            ? `${formatCurrency(Math.abs(balanceAfterPayment))} Cr`
            : "₹0.00 (Settled)"}
        </span>
      </div>
    </div>
  );
};
