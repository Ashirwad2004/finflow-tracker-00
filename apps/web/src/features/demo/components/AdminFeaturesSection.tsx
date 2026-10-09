import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  RefreshCw,
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
  getFeatureRequests,
  updateFeatureRequest,
  type FeatureRequest,
  type FeatureRequestStatus,
} from "../lib/featureRequestsApi";
import { FEATURE_STATUS_CONFIG, formatDate } from "../lib/adminUtils";

export function FeatureRequestRow({ request }: { request: FeatureRequest }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState(request.notes ?? "");
  const [notesChanged, setNotesChanged] = useState(false);

  const updateMut = useMutation({
    mutationFn: (u: { status?: FeatureRequestStatus; notes?: string }) =>
      updateFeatureRequest(request.id, u),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feature_requests"] }),
  });

  const cfg = FEATURE_STATUS_CONFIG[request.status];

  return (
    <tr className="border-b border-slate-700/40 hover:bg-slate-700/20 transition-colors group">
      <td className="px-4 py-3">
        <div>
          {/*
            A landing-page request has no account behind it, so the phone number
            the visitor typed is the only way to reach them. Showing the email
            column alone would label a real lead "Anonymous" and lose it.
          */}
          {request.source === "landing" ? (
            <>
              <div className="text-slate-200 font-medium text-sm truncate max-w-[180px]" title={request.contact_name ?? ""}>
                {request.contact_name || <span className="italic text-slate-500">No name given</span>}
              </div>
              {request.contact_phone && (
                <a
                  href={`tel:${request.contact_phone.replace(/[^\d+]/g, "")}`}
                  className="text-emerald-400 hover:text-emerald-300 text-xs tabular-nums"
                >
                  {request.contact_phone}
                </a>
              )}
              {request.user_email && (
                <div className="text-slate-500 text-xs truncate max-w-[180px]" title={request.user_email}>
                  {request.user_email}
                </div>
              )}
              <span className="mt-1 inline-block rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">
                From landing page
              </span>
            </>
          ) : (
            <div className="text-slate-200 font-medium text-sm truncate max-w-[180px]" title={request.user_email ?? ""}>
              {request.user_email || <span className="italic text-slate-500">Anonymous</span>}
            </div>
          )}
          <div className="text-slate-500 text-xs tabular-nums">{formatDate(request.submitted_at)}</div>
        </div>
      </td>
      <td className="px-4 py-3 max-w-md">
        <div>
          <div className="text-slate-200 font-semibold text-sm">{request.title}</div>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed whitespace-pre-wrap">{request.description}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <Select
          defaultValue={request.status}
          onValueChange={(v) => updateMut.mutate({ status: v as FeatureRequestStatus })}
          disabled={updateMut.isPending}
        >
          <SelectTrigger className={`w-32 h-7 text-xs rounded-full border-0 font-semibold ${cfg.bgColor} ${cfg.textColor} focus:ring-0`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {Object.entries(FEATURE_STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs text-slate-200 focus:bg-slate-700">
                <span className={v.textColor}>{v.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2 items-center">
          <Input
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesChanged(e.target.value !== (request.notes ?? ""));
            }}
            placeholder="Add developer notes..."
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

export const AdminFeaturesSection: React.FC = () => {
  const [filter, setFilter] = useState<FeatureRequestStatus | "all">("all");
  const [search, setSearch] = useState("");

  const { data: requests = [], isLoading, isError, refetch, isFetching } =
    useQuery<FeatureRequest[]>({
      queryKey: ["feature_requests", filter],
      queryFn: () => getFeatureRequests(filter),
      refetchInterval: 30_000,
    });

  const filtered = requests.filter(
    (r) => {
      if (!search.trim()) return true;
      const needle = search.toLowerCase();
      // Landing-page leads are looked up by who called, so the contact fields
      // have to be searchable alongside the request text.
      return [
        r.title,
        r.description,
        r.user_email,
        r.contact_name,
        r.contact_phone,
        r.business_name,
      ].some((field) => field?.toLowerCase().includes(needle));
    }
  );

  const filterTabs: { key: FeatureRequestStatus | "all"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "reviewed", label: "Reviewed" },
    { key: "approved", label: "Approved" },
    { key: "declined", label: "Declined" },
    { key: "completed", label: "Completed" },
  ];

  const allCount = requests.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Feature Requests</h2>
          <p className="text-slate-400 text-sm mt-1">Manage and track user submitted feature requests.</p>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg h-8">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Sync
          </Button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {(["pending", "reviewed", "approved", "declined", "completed"] as FeatureRequestStatus[]).map((s) => {
          const cfg = FEATURE_STATUS_CONFIG[s];
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
          <Input placeholder="Search requests or email..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 rounded-xl" />
        </div>
        <div className="flex p-1 gap-0.5 bg-slate-800 border border-slate-700 rounded-xl overflow-x-auto max-w-full">
          {filterTabs.map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
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
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading requests...</span>
          </div>
        ) : isError ? (
          <div className="text-center py-20">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Failed to load. Check your database / api connection.</p>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4 border-slate-700 text-slate-300">Try Again</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{search ? "No results match your search." : "No feature requests yet."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Requester</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Feature</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Developer Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => <FeatureRequestRow key={r.id} request={r} />)}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-slate-700/40 text-xs text-slate-500 text-center">
              Showing {filtered.length} of {allCount} requests · Auto-refreshes every 30s
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFeaturesSection;
