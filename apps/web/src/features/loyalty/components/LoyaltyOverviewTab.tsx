import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Gift, Coins, Users, Award, ChevronRight, Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { CustomerLoyaltyData, LoyaltyConfig, MonthlyTrendItem, Tier } from "../types";

export const tierBadgeClass = (tier: Tier) =>
  tier === "Gold"
    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 border-amber-300"
    : tier === "Silver"
    ? "bg-slate-100 dark:bg-slate-800 text-slate-700 border-slate-300"
    : "bg-orange-100 dark:bg-orange-950/20 text-orange-700 border-orange-200";

interface LoyaltyOverviewTabProps {
  totalPointsIssued: number;
  vipCount: number;
  returningCustomerRate: string;
  config: LoyaltyConfig;
  monthlyTrend: MonthlyTrendItem[];
  customerLoyaltyData: CustomerLoyaltyData[];
  loadingParties: boolean;
  loadingSales: boolean;
  formatCurrency: (amount: number) => string;
  onNavigateTab: (tab: "overview" | "ledger" | "campaigns" | "settings") => void;
}

export function LoyaltyOverviewTab({
  totalPointsIssued,
  vipCount,
  returningCustomerRate,
  config,
  monthlyTrend,
  customerLoyaltyData,
  loadingParties,
  loadingSales,
  formatCurrency,
  onNavigateTab,
}: LoyaltyOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 rounded-lg">
              <Coins className="w-4 h-4" />
            </div>
            <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
              Point Pool
            </Badge>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total Points Issued</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{totalPointsIssued.toLocaleString()} pts</h3>
          <p className="text-[10px] text-slate-400 mt-1.5">Active currency circulating in rewards wallet</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Gift className="w-4 h-4" />
            </div>
            <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              Liability
            </Badge>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Redeemable Discount</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalPointsIssued * config.pointValue)}</h3>
          <p className="text-[10px] text-slate-400 mt-1.5">Point value rate of {formatCurrency(config.pointValue)}/pt</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
            <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              Retention
            </Badge>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Returning Customer Rate</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{returningCustomerRate}%</h3>
          <p className="text-[10px] text-slate-400 mt-1.5">Customers with more than 1 transaction</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <Award className="w-4 h-4" />
            </div>
            <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Tiers
            </Badge>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">VIP Gold Customers</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{vipCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1.5">Spent more than {formatCurrency(config.vipThreshold)}</p>
        </div>
      </div>

      {/* Analytics: spend trend */}
      <div className="bg-white dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <h4 className="text-xs font-semibold mb-3">Customer Spend Trend (6 months)</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={48} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
              />
              <Line type="monotone" dataKey="spend" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-violet-500/10 p-6 rounded-2xl border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary fill-primary/20" /> How Rewards Boost Your Business
          </h4>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Loyalty rewards give customers a reason to choose your counter over competitors. Earning 1 point per{" "}
            {formatCurrency(config.pointsPerUnit)} spent creates a habit of returning. Paired with WhatsApp campaigns,
            you can proactively re-engage customers who've gone quiet.
          </p>
        </div>
        <Button onClick={() => onNavigateTab("campaigns")} className="rounded-full shadow-lg h-8 px-4 text-[11px] hover:scale-105 transition-all">
          Launch WhatsApp Campaign <ChevronRight className="ml-1 w-3 h-3" />
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h4 className="text-xs font-semibold">Top Customer Loyalty Wallets</h4>
          <Button variant="ghost" size="sm" className="text-[11px] h-7" onClick={() => onNavigateTab("ledger")}>
            Manage All
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="text-[10px] font-semibold uppercase tracking-wide bg-slate-50 dark:bg-slate-800/50 text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Reward Tier</th>
                <th className="px-4 py-2.5">Points Balance</th>
                <th className="px-4 py-2.5 text-right">Total Business Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingParties || loadingSales ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1.5" /> Loading loyalty data...
                  </td>
                </tr>
              ) : customerLoyaltyData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Add customers in "Parties" to track loyalty!
                  </td>
                </tr>
              ) : (
                [...customerLoyaltyData]
                  .sort((a, b) => b.points - a.points)
                  .slice(0, 5)
                  .map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                      <td className="px-4 py-2.5">
                        <Badge className={"text-[10px] " + tierBadgeClass(c.tier)} variant="outline">
                          {c.tier}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-violet-600 dark:text-violet-400">{c.points} pts</td>
                      <td className="px-4 py-2.5 font-semibold text-right">{formatCurrency(c.totalSpent)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
