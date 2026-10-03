import React from "react";
import { AlertCircle } from "lucide-react";

interface LowStockAlertBannerProps {
  lowStockCount: number;
  lowStockThreshold: number;
}

export const LowStockAlertBanner: React.FC<LowStockAlertBannerProps> = ({
  lowStockCount,
  lowStockThreshold,
}) => {
  if (lowStockCount <= 0) return null;

  return (
    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6 flex items-center gap-3">
      <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
      <div>
        <p className="font-medium text-orange-900 dark:text-orange-100">
          Low Stock Alert
        </p>
        <p className="text-sm text-orange-700 dark:text-orange-300">
          {lowStockCount} product{lowStockCount !== 1 ? "s" : ""}{" "}
          {lowStockCount !== 1 ? "are" : "is"} running low on stock (less than{" "}
          {lowStockThreshold} units)
        </p>
      </div>
    </div>
  );
};
