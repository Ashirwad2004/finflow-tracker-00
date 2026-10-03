import { ReceiptIndianRupee, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentRegisterType } from "./types";

interface PaymentRegisterEmptyStateProps {
  type: PaymentRegisterType;
  hasFilter: boolean;
  onAction: () => void;
}

export const PaymentRegisterEmptyState = ({
  type,
  hasFilter,
  onAction,
}: PaymentRegisterEmptyStateProps) => {
  const isIn = type === "in";

  return (
    <tr>
      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isIn
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-600"
            }`}
          >
            <ReceiptIndianRupee className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {isIn ? "No Payment In Transactions Found" : "No Payment Out Transactions Found"}
          </p>
          <p className="text-xs text-slate-500">
            {hasFilter
              ? "No transactions match your search/filter criteria."
              : isIn
              ? "Every payment you receive from customers will appear here in chronological order in FinFlow."
              : "Every payment you make to vendors or suppliers will appear here in chronological order in FinFlow."}
          </p>
          <Button
            onClick={onAction}
            size="sm"
            className={`mt-2 text-white font-bold text-xs ${
              isIn ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>{isIn ? "Record First Payment In" : "Record First Payment Out"}</span>
          </Button>
        </div>
      </td>
    </tr>
  );
};
