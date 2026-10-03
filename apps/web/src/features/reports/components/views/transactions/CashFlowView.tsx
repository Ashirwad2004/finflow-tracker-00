import React, { useMemo } from "react";

export function CashFlowView({ cashFlow, formatCurrency }: any) {
  return (
    <div className="max-w-4xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-sm">
        Cash Flow Statement (Direct Method - AS-3)
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-800 dark:text-slate-200">
            <td className="py-2 px-4" colSpan={2}>
              A. CASH FLOW FROM OPERATING ACTIVITIES
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">Cash Receipts from Customers (Sales collections)</td>
            <td className="py-1.5 px-4 text-right font-mono text-emerald-600 font-semibold">
              {formatCurrency(cashFlow.cashFromCustomers)}
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8 text-rose-600">Cash Paid to Suppliers (Purchases)</td>
            <td className="py-1.5 px-4 text-right font-mono text-rose-600">
              ({formatCurrency(cashFlow.cashPaidToSuppliers)})
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8 text-rose-600">Cash Paid for Operating Expenses</td>
            <td className="py-1.5 px-4 text-right font-mono text-rose-600">
              ({formatCurrency(cashFlow.cashPaidForExpenses)})
            </td>
          </tr>
          <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
            <td className="py-2 px-6">Net Cash from Operating Activities (A)</td>
            <td
              className={`py-2 px-4 text-right font-mono ${
                cashFlow.netOperatingCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatCurrency(cashFlow.netOperatingCashFlow)}
            </td>
          </tr>

          <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-800 dark:text-slate-200">
            <td className="py-2 px-4" colSpan={2}>
              B. CASH FLOW FROM FINANCING ACTIVITIES
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">Proceeds from Loans & Borrowings</td>
            <td className="py-1.5 px-4 text-right font-mono text-emerald-600 font-semibold">
              {formatCurrency(cashFlow.borrowingsReceived)}
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8 text-rose-600">Loans Given / Advances Repaid</td>
            <td className="py-1.5 px-4 text-right font-mono text-rose-600">
              ({formatCurrency(cashFlow.loansDisbursed)})
            </td>
          </tr>
          <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
            <td className="py-2 px-6">Net Cash from Financing Activities (B)</td>
            <td className="py-2 px-4 text-right font-mono">
              {formatCurrency(cashFlow.netFinancingCashFlow)}
            </td>
          </tr>

          <tr className="bg-blue-50 dark:bg-blue-950/30 font-bold text-sm border-t-2 border-blue-600">
            <td className="py-2.5 px-4 text-blue-900 dark:text-blue-200">
              NET INCREASE / (DECREASE) IN CASH & BANK (A + B)
            </td>
            <td
              className={`py-2.5 px-4 text-right font-mono ${
                cashFlow.netCashChange >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatCurrency(cashFlow.netCashChange)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// 7. PROFIT AND LOSS VIEW (Standard Schedule III)
