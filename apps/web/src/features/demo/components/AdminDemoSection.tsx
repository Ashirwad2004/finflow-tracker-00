import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  RefreshCw,
  Download,
  Search,
  AlertTriangle,
  Inbox,
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
import {
  getDemoRequests,
  updateDemoRequest,
  type DemoRequest,
  type DemoStatus,
} from "../lib/demoApi";
import {
  STATUS_CONFIG,
  type DemoFilter,
  exportToCsv,
  formatDate,
} from "../lib/adminUtils";

export function DemoLeadRow({ request }: { request: DemoRequest }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState(request.notes ?? "");
  const [notesChanged, setNotesChanged] = useState(false);

  const updateMut = useMutation({
    mutationFn: (u: { status?: DemoStatus; notes?: string }) =>
      updateDemoRequest(request.id, u),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demo_requests"] }),
  });

  const cfg = STATUS_CONFIG[request.status];

  return (
    <tr className="border-b border-slate-700/40 hover:bg-slate-700/20 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bgColor}`}>
            <cfg.icon className={`w-3 h-3 ${cfg.textColor}`} />
          </div>
          <div>
            <div className="text-slate-200 font-mono text-sm font-semibold">{request.phone}</div>
            <div className="text-slate-500 text-xs">{request.name || <span className="italic">No name</span>}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Select
          defaultValue={request.status}
          onValueChange={(v) => updateMut.mutate({ status: v as DemoStatus })}
          disabled={updateMut.isPending}
        >
          <SelectTrigger className={`w-32 h-7 text-xs rounded-full border-0 font-semibold ${cfg.bgColor} ${cfg.textColor} focus:ring-0`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs text-slate-200 focus:bg-slate-700">
                <span className={v.textColor}>{v.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3 text-slate-400 text-xs tabular-nums">{formatDate(request.submitted_at)}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2 items-center">
          <Input
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesChanged(e.target.value !== (request.notes ?? ""));
            }}
            placeholder="Add notes..."
            className="h-7 text-xs bg-slate-900/50 border-slate-700 text-slate-300 placeholder:text-slate-600 rounded-lg"
          />
          <AnimatePresence>
            {notesChanged && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <Button size="sm" onClick={() => { updateMut.mutate({ notes }); setNotesChanged(false); }}
                  disabled={updateMut.isPending} className="h-7 px-2.5 text-xs rounded-lg bg-violet-600 hover:bg-violet-500 flex-shrink-0">
                  {updateMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </td>
    </tr>
  );
}

export const AdminDemoSection: React.FC = () => {
  const [filter, setFilter] = useState<DemoFilter>("all");
  const [search, setSearch] = useState("");

  const { data: requests = [], isLoading, isError, refetch, isFetching } =
    useQuery<DemoRequest[]>({
      queryKey: ["demo_requests", filter],
      queryFn: () => getDemoRequests(filter),
      refetchInterval: 30_000,
    });

  const filtered = requests.filter(
    (r) =>
      !search.trim() ||
      r.phone.includes(search.trim()) ||
      r.name?.toLowerCase().includes(search.toLowerCase())
  );

  const filterTabs: { key: DemoFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "called", label: "Called" },
    { key: "converted", label: "Converted" },
    { key: "spam", label: "Spam" },
  ];

  const allCount = requests.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Demo Leads</h2>
          <p className="text-slate-400 text-sm mt-1">Manage and track all demo call requests.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg h-8">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Sync
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToCsv(filtered)} disabled={filtered.length === 0}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg h-8">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {(["new","called","converted","spam"] as DemoStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const count = requests.filter(r => r.status === s).length;
          return (
            <div key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.bgColor} ${cfg.textColor}`}>
              <cfg.icon className="w-3 h-3" />{cfg.label}: {count}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input placeholder="Search phone or name..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 rounded-xl" />
        </div>
        <div className="flex p-1 gap-0.5 bg-slate-800 border border-slate-700 rounded-xl">
          {filterTabs.map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === t.key
                  ? "bg-violet-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}>
              {t.label}
              {t.key !== "all" && (
                <span className={`ml-1 ${filter === t.key ? "text-violet-300" : "text-slate-600"}`}>
                  {requests.filter(r => r.status === t.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading leads...</span>
          </div>
        ) : isError ? (
          <div className="text-center py-20">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Failed to load. Check your Supabase connection.</p>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4 border-slate-700 text-slate-300">Try Again</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{search ? "No results match your search." : "No demo requests yet."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => <DemoLeadRow key={r.id} request={r} />)}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-slate-700/40 text-xs text-slate-500 text-center">
              Showing {filtered.length} of {allCount} leads · Auto-refreshes every 30s
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDemoSection;
