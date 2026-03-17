import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone,
  Search,
  Download,
  RefreshCw,
  Users,
  PhoneCall,
  TrendingUp,
  AlertTriangle,
  Clock,
  Loader2,
} from "lucide-react";
import { useDemoRequests, useUpdateDemoRequest } from "@/features/demo/hooks/useDemoRequests";
import type { DemoStatus, DemoRequest } from "@/features/demo/lib/demoApi";

// ---- Status Config ----
const STATUS_CONFIG: Record<
  DemoStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  new: { label: "New", color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/20", icon: Clock },
  called: { label: "Called", color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/20", icon: PhoneCall },
  converted: { label: "Converted", color: "text-green-600", bg: "bg-green-500/10 border-green-500/20", icon: TrendingUp },
  spam: { label: "Spam", color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", icon: AlertTriangle },
};

type FilterTab = DemoStatus | "all";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "called", label: "Called" },
  { key: "converted", label: "Converted" },
  { key: "spam", label: "Spam" },
];

// ---- Helpers ----
function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function exportToCsv(requests: DemoRequest[]) {
  const headers = ["Phone", "Name", "Status", "Notes", "Submitted At"];
  const rows = requests.map((r) => [
    r.phone,
    r.name ?? "",
    r.status,
    (r.notes ?? "").replace(/,/g, " "),
    formatDate(r.submitted_at),
  ]);
  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `demo-requests-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Request Row ----
function RequestRow({ request }: { request: DemoRequest }) {
  const updateMutation = useUpdateDemoRequest();
  const [notes, setNotes] = useState(request.notes ?? "");
  const [notesChanged, setNotesChanged] = useState(false);

  const cfg = STATUS_CONFIG[request.status];
  const StatusIcon = cfg.icon;

  const handleStatusChange = (value: string) => {
    updateMutation.mutate({ id: request.id, updates: { status: value as DemoStatus } });
  };

  const handleNotesSave = () => {
    updateMutation.mutate({ id: request.id, updates: { notes } });
    setNotesChanged(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group p-4 rounded-2xl border bg-card hover:shadow-md transition-all duration-200 hover:border-primary/20"
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Left — phone & name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border flex-shrink-0 ${cfg.bg}`}>
            <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold font-mono tracking-wide text-sm truncate flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              {request.phone}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {request.name || <span className="italic">No name provided</span>}
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">
              {formatDate(request.submitted_at)}
            </div>
          </div>
        </div>

        {/* Right — status + notes */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Status selector */}
          <Select
            defaultValue={request.status}
            onValueChange={handleStatusChange}
            disabled={updateMutation.isPending}
          >
            <SelectTrigger className={`w-36 h-8 text-xs rounded-full border font-semibold ${cfg.bg} ${cfg.color}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  <span className={val.color}>{val.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Notes */}
          <div className="flex gap-2 items-start w-full sm:w-64">
            <Textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesChanged(e.target.value !== (request.notes ?? ""));
              }}
              placeholder="Add notes..."
              rows={1}
              className="text-xs resize-none rounded-xl min-h-0 h-8 flex items-center py-1.5 leading-tight"
            />
            {notesChanged && (
              <Button
                size="sm"
                onClick={handleNotesSave}
                disabled={updateMutation.isPending}
                className="h-8 px-3 text-xs rounded-xl flex-shrink-0"
              >
                {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---- Main Admin Dashboard ----
export default function AdminDashboard() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const { data: requests = [], isLoading, isError, refetch, isFetching } = useDemoRequests(filter);

  // Client-side search
  const filtered = requests.filter(
    (r) =>
      search.trim() === "" ||
      r.phone.includes(search.trim()) ||
      r.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const allRequests = requests;
  const stats = [
    { label: "Total", value: allRequests.length, icon: Users, color: "text-foreground" },
    { label: "New", value: allRequests.filter((r) => r.status === "new").length, icon: Clock, color: "text-blue-600" },
    { label: "Called", value: allRequests.filter((r) => r.status === "called").length, icon: PhoneCall, color: "text-amber-600" },
    { label: "Converted", value: allRequests.filter((r) => r.status === "converted").length, icon: TrendingUp, color: "text-green-600" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Demo Requests
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage all "Book a Demo" submissions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCsv(filtered)}
              disabled={filtered.length === 0}
              className="rounded-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-2xl border bg-card shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className={`text-3xl font-extrabold tabular-nums ${stat.color}`}>{stat.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by phone or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === tab.key
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.key !== "all" && (
                  <span className={`ml-1.5 tabular-nums ${filter === tab.key ? "text-primary" : ""}`}>
                    {allRequests.filter((r) => r.status === tab.key).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading requests...</span>
          </div>
        ) : isError ? (
          <div className="text-center py-24">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Failed to load requests.</p>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4 rounded-full">
              Try Again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Phone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No results match your search." : "No demo requests yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((request) => (
              <RequestRow key={request.id} request={request} />
            ))}
            <p className="text-center text-xs text-muted-foreground pt-4">
              Showing {filtered.length} of {requests.length} requests · Auto-refreshes every 30s
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
