import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Receipt,
  RefreshCw,
  Download,
  Wallet,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Search,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/core/integrations/supabase/client";
import { exportPaymentsToCsv, formatDate } from "../lib/adminUtils";

export const AdminPaymentsSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"transactions" | "subscriptions">("transactions");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch all payments
  const { data: payments = [], isLoading: paymentsLoading, refetch: refetchPayments, isFetching: fetchingPayments } = useQuery<any[]>({
    queryKey: ["admin_payments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) console.warn("Fetch payments error:", error.message);
      return data || [];
    },
    refetchInterval: 30_000,
  });

  // Fetch all subscription status records
  const { data: subscriptions = [], isLoading: subsLoading, refetch: refetchSubs, isFetching: fetchingSubs } = useQuery<any[]>({
    queryKey: ["admin_subscriptions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("subscription_status")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) console.warn("Fetch subscriptions error:", error.message);
      return data || [];
    },
    refetchInterval: 30_000,
  });

  // Mutation to manually update merchant tier (Admin Override)
  const upgradeMutation = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: string }) => {
      const now = new Date();
      const periodEnd = new Date();
      periodEnd.setFullYear(now.getFullYear() + 1);

      const { error } = await (supabase as any)
        .from("subscription_status")
        .upsert({
          user_id: userId,
          plan,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          updated_at: now.toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Merchant tier updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin_subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscription_status"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update merchant tier.");
    }
  });

  // Calculations for KPI cards
  const successfulPayments = payments.filter(p => p.status === "success");
  const totalRevenue = successfulPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const activeProCount = subscriptions.filter(s => s.plan === "pro" && s.status === "active").length;
  const activeBusinessCount = subscriptions.filter(s => s.plan === "business" && s.status === "active").length;
  const activePaidTotal = activeProCount + activeBusinessCount;

  // Filtered payments list
  const filteredPayments = payments.filter(p => {
    const matchesSearch = !search.trim() ||
      (p.gateway_order_id && p.gateway_order_id.toLowerCase().includes(search.toLowerCase())) ||
      (p.gateway_payment_id && p.gateway_payment_id.toLowerCase().includes(search.toLowerCase())) ||
      (p.user_id && p.user_id.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered subscriptions list
  const filteredSubscriptions = subscriptions.filter(s => {
    return !search.trim() ||
      (s.user_id && s.user_id.toLowerCase().includes(search.toLowerCase())) ||
      (s.plan && s.plan.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-violet-400" />
            Payments & Subscription Upgrades
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Platform financial audit log, gateway transactions, and active merchant subscription tiers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetchPayments(); refetchSubs(); }}
            disabled={fetchingPayments || fetchingSubs}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${(fetchingPayments || fetchingSubs) ? "animate-spin" : ""}`} />
            Sync
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportPaymentsToCsv(filteredPayments)}
            disabled={filteredPayments.length === 0}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg h-8"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Payments CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Revenue</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tabular-nums">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">All successful platform payments</p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-500 to-indigo-400" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Active Paid Subscriptions</span>
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tabular-nums">
            {activePaidTotal}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {activeProCount} Pro · {activeBusinessCount} Business
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Transactions</span>
            <Receipt className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tabular-nums">
            {payments.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {successfulPayments.length} Success · {payments.filter(p => p.status === 'pending').length} Pending
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 to-orange-400" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Gateway Health</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
            <CheckCircle2 className="w-5 h-5" /> Active & Verified
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Razorpay / Mock Gateway Drivers</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "transactions"
                ? "bg-violet-600 text-white shadow-md"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            All Payment Transactions ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "subscriptions"
                ? "bg-violet-600 text-white shadow-md"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            Merchant Tiers & Subscriptions ({subscriptions.length})
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              placeholder={activeTab === "transactions" ? "Search Order ID, Payment ID, User..." : "Search User ID, Plan..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-600 rounded-lg"
            />
          </div>

          {activeTab === "transactions" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-300 w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* TRANSACTIONS TAB TABLE */}
      {activeTab === "transactions" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {paymentsLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              <p className="text-xs text-slate-400">Loading platform payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No payment transactions found matching filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Gateway Order ID</th>
                    <th className="px-4 py-3">Merchant / User ID</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Gateway</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-200">
                        {p.gateway_order_id || p.id.substring(0, 16)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px] truncate max-w-[150px]" title={p.user_id}>
                        {p.user_id ? p.user_id.substring(0, 12) + "..." : "Anonymous"}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-400">
                        ₹{Number(p.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-medium uppercase text-[11px]">
                        {p.payment_method || "UPI / Card"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 capitalize">
                        {p.gateway || "Razorpay"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === "success"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : p.status === "pending"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-red-500/15 text-red-400 border border-red-500/30"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 tabular-nums">
                        {formatDate(p.created_at || new Date().toISOString())}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBSCRIPTIONS TAB TABLE */}
      {activeTab === "subscriptions" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {subsLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              <p className="text-xs text-slate-400">Loading merchant subscription statuses...</p>
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No merchant subscription records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Merchant User ID</th>
                    <th className="px-4 py-3">Active Tier</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Period Start</th>
                    <th className="px-4 py-3">Renewal / Expiry</th>
                    <th className="px-4 py-3 text-right">Admin Quick Tier Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSubscriptions.map((sub) => (
                    <tr key={sub.id || sub.user_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-slate-200 font-mono text-xs" title={sub.user_id}>
                        {sub.user_id}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
                          sub.plan === "business"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                            : sub.plan === "pro"
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}>
                          {sub.plan || "STARTER"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {sub.status || "ACTIVE"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 tabular-nums">
                        {sub.current_period_start ? formatDate(sub.current_period_start) : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 tabular-nums">
                        {sub.current_period_end ? formatDate(sub.current_period_end) : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => upgradeMutation.mutate({ userId: sub.user_id, plan: "pro" })}
                            disabled={upgradeMutation.isPending || sub.plan === "pro"}
                            className="h-7 text-[10px] font-bold border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/20"
                          >
                            Grant Pro
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => upgradeMutation.mutate({ userId: sub.user_id, plan: "business" })}
                            disabled={upgradeMutation.isPending || sub.plan === "business"}
                            className="h-7 text-[10px] font-bold border-purple-500/40 text-purple-400 hover:bg-purple-500/20"
                          >
                            Grant Business
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPaymentsSection;
