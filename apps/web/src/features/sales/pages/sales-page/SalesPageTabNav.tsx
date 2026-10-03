import React from "react";
import { FileText, ArrowDownLeft, ShoppingBag } from "lucide-react";
import { Sale } from "../../types";

interface SalesPageTabNavProps {
  activeTab: "invoices" | "payment-in" | "sales-order";
  setActiveTab: (tab: "invoices" | "payment-in" | "sales-order") => void;
  invoices: Sale[];
}

export const SalesPageTabNav: React.FC<SalesPageTabNavProps> = ({
  activeTab,
  setActiveTab,
  invoices,
}) => {
  const salesCount = invoices.filter(
    (i) => (i as any).document_type !== "receipt" && !i.invoice_number?.startsWith("REC-")
  ).length;

  return (
    <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit mb-4">
      <button
        onClick={() => setActiveTab("invoices")}
        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
          activeTab === "invoices"
            ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>Sales</span>
        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700">
          {salesCount}
        </span>
      </button>
      <button
        onClick={() => setActiveTab("payment-in")}
        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
          activeTab === "payment-in"
            ? "bg-emerald-600 text-white shadow-xs"
            : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
        }`}
      >
        <ArrowDownLeft className="w-4 h-4" />
        <span>Payment In</span>
      </button>
      <button
        onClick={() => setActiveTab("sales-order")}
        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
          activeTab === "sales-order"
            ? "bg-indigo-600 text-white shadow-xs"
            : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        }`}
      >
        <ShoppingBag className="w-4 h-4" />
        <span>Sales Order</span>
      </button>
    </div>
  );
};
