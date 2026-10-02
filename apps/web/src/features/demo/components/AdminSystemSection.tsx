import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  RefreshCw,
  Database,
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
  BarChart2,
  Users,
  UserCheck,
  Globe,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getSystemHealth,
  getTableCounts,
  type SystemHealth,
  type SystemTableCount,
} from "../lib/adminApi";

export const AdminSystemSection: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery<SystemHealth>({
    queryKey: ["admin_health"],
    queryFn: getSystemHealth,
    refetchInterval: 30_000,
  });

  const { data: tableCounts = [], isLoading: countsLoading, refetch: refetchCounts } = useQuery<SystemTableCount[]>({
    queryKey: ["admin_table_counts"],
    queryFn: getTableCounts,
    refetchInterval: 60_000,
  });

  const latencyColor = !health ? "text-slate-500"
    : health.latencyMs < 350 ? "text-emerald-400"
    : health.latencyMs < 600 ? "text-amber-400"
    : "text-red-400";

  const tableIcons: Record<string, React.ElementType> = {
    expenses: BarChart2,
    groups: Users,
    profiles: UserCheck,
    invoices: Globe,
    demo_requests: Phone,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">System</h2>
        <p className="text-slate-400 text-sm mt-1">Infrastructure health, table metrics, and live status.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Health Card */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-100 font-semibold text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" />System Health
            </h3>
            <Button variant="ghost" size="sm" onClick={() => { refetchHealth(); refetchCounts(); }}
              className="h-7 px-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-3">
            {/* Supabase status */}
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
              <div className="flex items-center gap-2.5 text-sm text-slate-300">
                <Database className="w-4 h-4 text-slate-500" />Supabase
              </div>
              {healthLoading ? (
                <div className="h-4 w-12 bg-slate-700 rounded animate-pulse" />
              ) : (
                <div className="flex items-center gap-2">
                  {health?.supabaseStatus === "ok"
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <XCircle className="w-4 h-4 text-red-400" />}
                  <span className={`text-xs font-semibold ${health?.supabaseStatus === "ok" ? "text-emerald-400" : "text-red-400"}`}>
                    {health?.supabaseStatus === "ok" ? "Connected" : "Error"}
                  </span>
                </div>
              )}
            </div>

            {/* Latency */}
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
              <div className="flex items-center gap-2.5 text-sm text-slate-300">
                <Activity className="w-4 h-4 text-slate-500" />DB Engine Latency
              </div>
              {healthLoading ? (
                <div className="h-4 w-12 bg-slate-700 rounded animate-pulse" />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-semibold">
                    PostgreSQL Exec: {health?.dbExecutionMs}ms ⚡
                  </span>
                  <span className={`text-xs font-bold tabular-nums ${latencyColor}`} title="Cloud Network Round-Trip Time">
                    {health ? `${health.latencyMs}ms RTT` : "—"}
                  </span>
                </div>
              )}
            </div>

            {/* Server time */}
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
              <div className="flex items-center gap-2.5 text-sm text-slate-300">
                <Clock className="w-4 h-4 text-slate-500" />Server Time
              </div>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {now.toLocaleTimeString("en-IN", { hour12: false })} IST
              </span>
            </div>
          </div>
        </div>

        {/* Table Counts Card */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-4">
          <h3 className="text-slate-100 font-semibold text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-violet-400" />Table Row Counts
          </h3>
          {countsLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-10 bg-slate-700/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {tableCounts.map((t) => {
                const Icon = tableIcons[t.table] ?? Database;
                return (
                  <div key={t.table} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-300">{t.label}</span>
                    </div>
                    <span className="text-sm font-bold text-violet-300 tabular-nums">{t.count.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Info footer */}
      <div className="p-4 rounded-2xl border border-slate-700/40 bg-slate-800/40 text-xs text-slate-500 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
        System health auto-refreshes every 30 seconds. Table counts refresh every 60 seconds.
      </div>
    </div>
  );
};

export default AdminSystemSection;
