import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BalanceRingProps {
  balance: number;
  budgetLimit: number;
  className?: string;
}

export const BalanceRing = ({ balance, budgetLimit, className }: BalanceRingProps) => {
  const percentage = budgetLimit > 0 ? Math.min((balance / budgetLimit) * 100, 100) : 0;
  const circumference = 2 * Math.PI * 90; // radius = 90
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const isOverBudget = balance > budgetLimit && budgetLimit > 0;
  const isWarning = percentage >= 80 && !isOverBudget;

  const getStrokeColor = () => {
    if (isOverBudget) return "stroke-red-500";
    if (isWarning) return "stroke-amber-500";
    return "stroke-primary";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Background Ring */}
      <svg className="w-56 h-56 -rotate-90" viewBox="0 0 200 200">
        {/* Track */}
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          strokeWidth="8"
          className="stroke-slate-700/50"
        />
        
        {/* Progress */}
        <motion.circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={cn(getStrokeColor(), "drop-shadow-lg")}
          style={{
            strokeDasharray: circumference,
            filter: isOverBudget ? "drop-shadow(0 0 8px rgb(239 68 68 / 0.5))" : 
                   isWarning ? "drop-shadow(0 0 8px rgb(245 158 11 / 0.5))" :
                   "drop-shadow(0 0 8px rgb(139 92 246 / 0.5))"
          }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center"
        >
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">This Month</p>
          <p className={cn(
            "text-3xl font-bold tabular-nums",
            isOverBudget ? "text-red-400" : "text-slate-100"
          )}>
            {formatCurrency(balance)}
          </p>
          {budgetLimit > 0 && (
            <p className="text-sm text-slate-500 mt-1">
              of {formatCurrency(budgetLimit)}
            </p>
          )}
          {isOverBudget && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-red-400 mt-2 font-medium"
            >
              Budget Exceeded
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
};
