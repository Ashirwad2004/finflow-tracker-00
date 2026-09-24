import React, { useState, useMemo } from "react";
import {
  Search,
  ReceiptIndianRupee,
  Plus,
  Calendar,
  CreditCard,
  Building2,
  QrCode,
  Banknote,
  FileSpreadsheet,
  Coins,
  Receipt,
  FileText,
  User,
  Copy,
  Check,
  Filter,
  ArrowDownLeft,
  Share2,
} from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  UnifiedPaymentTransaction,
  extractAllPaymentInTransactions,
  getPaymentMethodDetails,
  PaymentMethodType,
} from "../utils/paymentTranscript";
import { Button } from "@/components/ui/button";

interface PaymentInRegisterProps {
  sales: any[];
  parties: any[];
  onOpenRecordPaymentIn: () => void;
  onOpenTranscript?: (saleRecord: any) => void;
  onPreviewInvoice?: (saleRecord: any) => void;
}

export function PaymentInRegister({
  sales,
  parties,
  onOpenRecordPaymentIn,
  onOpenTranscript,
  onPreviewInvoice,
}: PaymentInRegisterProps) {
  const { formatCurrency } = useCurrency();

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "this_month" | "this_year">("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [selectedPartyFilter, setSelectedPartyFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Extract each and every payment in transaction across all parties
  const allTransactions = useMemo(() => {
    return extractAllPaymentInTransactions(sales);
  }, [sales]);

  // 2. Metrics calculation
  const metrics = useMemo(() => {
    const totalAmount = allTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const cashAmount = allTransactions
      .filter((tx) => tx.paymentMethod === "cash")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const onlineAmount = allTransactions
      .filter((tx) => tx.paymentMethod !== "cash")
      .reduce((sum, tx) => sum + tx.amount, 0);
    return {
      totalAmount,
      cashAmount,
      onlineAmount,
      count: allTransactions.length,
    };
  }, [allTransactions]);

  // 3. Filtered transactions
  const filteredTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
    const currentYearStr = todayStr.substring(0, 4); // YYYY

    return allTransactions.filter((tx) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = tx.partyName.toLowerCase().includes(q);
        const matchesVoucher = tx.voucherNumber.toLowerCase().includes(q);
        const matchesRef = (tx.referenceNumber || "").toLowerCase().includes(q);
        const matchesNotes = (tx.notes || "").toLowerCase().includes(q);
        const matchesBill = (tx.linkedBillNumber || "").toLowerCase().includes(q);
        if (!matchesName && !matchesVoucher && !matchesRef && !matchesNotes && !matchesBill) {
          return false;
        }
      }

      // Date Filter
      if (dateFilter === "today") {
        if (!tx.date.startsWith(todayStr)) return false;
      } else if (dateFilter === "this_month") {
        if (!tx.date.startsWith(currentMonthStr)) return false;
      } else if (dateFilter === "this_year") {
        if (!tx.date.startsWith(currentYearStr)) return false;
      }

      // Mode Filter
      if (modeFilter !== "all") {
        if (tx.paymentMethod !== modeFilter) return false;
      }

      // Party Filter
      if (selectedPartyFilter !== "all") {
        if (tx.partyId !== selectedPartyFilter && tx.partyName !== selectedPartyFilter) {
          return false;
        }
      }

      return true;
    });
  }, [allTransactions, searchTerm, dateFilter, modeFilter, selectedPartyFilter]);

  const handleCopyVoucher = (voucherNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(voucherNo);
    setCopiedId(voucherNo);
    toast.success(`Voucher ${voucherNo} copied to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Metrics Strip (FinFlow Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Payment In
            </p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(metrics.totalAmount)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {metrics.count} total transactions
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cash Collection
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {formatCurrency(metrics.cashAmount)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Received in Hand</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Bank & Online / UPI
            </p>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {formatCurrency(metrics.onlineAmount)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Direct to Bank / QR</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <QrCode className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 rounded-xl text-white shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 block">
              Quick Action
            </span>
            <p className="text-sm font-extrabold text-white mt-0.5">Record New Payment In</p>
          </div>
          <button
            onClick={onOpenRecordPaymentIn}
            className="mt-2 w-full py-1.5 px-3 bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Payment In</span>
          </button>
        </div>
      </div>

      {/* Action and Filter Strip */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer, voucher #, UTR #, or bill..."
            className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="h-9 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="this_month">This Month</option>
            <option value="this_year">This Year</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="h-9 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="all">All Modes</option>
            <option value="cash">Cash in Hand</option>
            <option value="upi">UPI / QR</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
            <option value="cheque">Cheque</option>
          </select>

          {/* Customer / Party Filter */}
          <select
            value={selectedPartyFilter}
            onChange={(e) => setSelectedPartyFilter(e.target.value)}
            className="h-9 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary focus:outline-none max-w-[180px]"
          >
            <option value="all">All Customers</option>
            {parties.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Big Green Action Button */}
          <Button
            onClick={onOpenRecordPaymentIn}
            className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Payment In</span>
          </Button>
        </div>
      </div>

      {/* FinFlow-Style Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Receipt Voucher #</th>
                <th className="px-4 py-3">Party / Customer</th>
                <th className="px-4 py-3">Payment Mode</th>
                <th className="px-4 py-3">Settlement Type</th>
                <th className="px-4 py-3">Reference / Narration</th>
                <th className="px-4 py-3 text-right">Amount Received</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                        <ReceiptIndianRupee className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        No Payment In Transactions Found
                      </p>
                      <p className="text-xs text-slate-500">
                        {searchTerm || dateFilter !== "all" || modeFilter !== "all" || selectedPartyFilter !== "all"
                          ? "No transactions match your search/filter criteria."
                          : "Every payment you receive from customers will appear here in chronological order in FinFlow."}
                      </p>
                      <Button
                        onClick={onOpenRecordPaymentIn}
                        size="sm"
                        className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Record First Payment In
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const methodDetails = getPaymentMethodDetails(tx.paymentMethod);
                  const isCopied = copiedId === tx.voucherNumber;

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Date & Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {tx.date ? format(new Date(tx.date), "dd MMM yyyy") : "N/A"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {tx.time || "Regular Receipt"}
                        </div>
                      </td>

                      {/* Voucher Number */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                            {tx.voucherNumber}
                          </span>
                          <button
                            onClick={(e) => handleCopyVoucher(tx.voucherNumber, e)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            title="Copy Voucher Number"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Party Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {tx.partyName.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[170px]">
                              {tx.partyName}
                            </span>
                            {tx.partyPhone && (
                              <span className="text-[10px] text-slate-400 block truncate">
                                {tx.partyPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Payment Mode */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${methodDetails.badgeClass}`}
                        >
                          {tx.paymentMethod === "cash" && <Banknote className="w-3 h-3" />}
                          {tx.paymentMethod === "upi" && <QrCode className="w-3 h-3" />}
                          {tx.paymentMethod === "bank_transfer" && <Building2 className="w-3 h-3" />}
                          {tx.paymentMethod === "card" && <CreditCard className="w-3 h-3" />}
                          {tx.paymentMethod === "cheque" && <FileSpreadsheet className="w-3 h-3" />}
                          <span>{methodDetails.label}</span>
                        </span>
                      </td>

                      {/* Settlement Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {tx.isWithoutBill || !tx.linkedBillNumber ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            On Account / Advance
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Against Inv: {tx.linkedBillNumber}
                          </span>
                        )}
                      </td>

                      {/* Reference / Narration */}
                      <td className="px-4 py-3 max-w-[180px]">
                        <span className="text-slate-600 dark:text-slate-400 text-[11px] truncate block" title={tx.referenceNumber || tx.notes || "—"}>
                          {tx.referenceNumber ? `Ref: ${tx.referenceNumber}` : tx.notes || "—"}
                        </span>
                      </td>

                      {/* Amount Received */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          + {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {tx.rawBillRecord && onOpenTranscript && (
                            <button
                              onClick={() => onOpenTranscript(tx.rawBillRecord)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              title="View Payment Transcript / Ledger"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}
                          {tx.rawBillRecord && onPreviewInvoice && (
                            <button
                              onClick={() => onPreviewInvoice(tx.rawBillRecord)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-colors"
                              title="Preview Document PDF"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
