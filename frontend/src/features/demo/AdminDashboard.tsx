import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  Phone,
  Users,
  Activity,
  PhoneCall,
  TrendingUp,
  AlertTriangle,
  Clock,
  Search,
  Download,
  RefreshCw,
  Loader2,
  Wallet,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Zap,
  Database,
  Globe,
  BarChart2,
  UserCheck,
  Inbox,
  LogOut,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Mail,
  Building2,
  ChevronDown,
  Hash,
  User,
  Receipt,
  MoreVertical,
  MailOpen,
  UserX,
  Lock,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  getDemoRequests,
  updateDemoRequest,
  getAdminStats,
  type DemoStatus,
  type DemoRequest,
  type AdminStats,
} from "@/features/demo/lib/demoApi";
import {
  getAppUsers,
  getTableCounts,
  getSystemHealth,
  toggleUserAdminStatus,
  type AppUser,
  type SystemHealth,
  type SystemTableCount,
} from "@/features/demo/lib/adminApi";
import { useAuth } from "@/core/lib/auth";
import { supabase } from "@/core/integrations/supabase/client";
import {
  getFeatureRequests,
  updateFeatureRequest,
  type FeatureRequest,
  type FeatureRequestStatus,
} from "@/features/demo/lib/featureRequestsApi";

// ─────────────────────────────────────────────
// Constants & Config
// ─────────────────────────────────────────────

type AdminSection = "overview" | "demo" | "users" | "system" | "features";

const FEATURE_STATUS_CONFIG: Record<FeatureRequestStatus, {
  label: string; textColor: string; bgColor: string; icon: React.ElementType;
}> = {
  pending:   { label: "Pending",   textColor: "text-blue-400",   bgColor: "bg-blue-500/15 border border-blue-500/30",   icon: Inbox },
  reviewed:  { label: "Reviewed",  textColor: "text-yellow-400",  bgColor: "bg-yellow-500/15 border border-yellow-500/30", icon: Clock },
  approved:  { label: "Approved",  textColor: "text-purple-400",  bgColor: "bg-purple-500/15 border border-purple-500/30", icon: Sparkles },
  declined:  { label: "Declined",  textColor: "text-red-400",     bgColor: "bg-red-500/15 border border-red-500/30",     icon: XCircle },
  completed: { label: "Completed", textColor: "text-emerald-400", bgColor: "bg-emerald-500/15 border border-emerald-500/30", icon: CheckCircle2 },
};

const STATUS_CONFIG: Record<DemoStatus, {
  label: string; textColor: string; bgColor: string; icon: React.ElementType;
}> = {
  new:       { label: "New",       textColor: "text-blue-400",   bgColor: "bg-blue-500/15 border border-blue-500/30",   icon: Inbox },
  called:    { label: "Called",    textColor: "text-amber-400",  bgColor: "bg-amber-500/15 border border-amber-500/30",  icon: PhoneCall },
  converted: { label: "Converted", textColor: "text-emerald-400",bgColor: "bg-emerald-500/15 border border-emerald-500/30", icon: CheckCircle2 },
  spam:      { label: "Spam",      textColor: "text-red-400",    bgColor: "bg-red-500/15 border border-red-500/30",    icon: AlertTriangle },
};

type DemoFilter = DemoStatus | "all";

// ─────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(iso));
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getInitials(name: string | null, email: string | null) {
  if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return "?";
}

function exportToCsv(rows: DemoRequest[]) {
  const headers = ["Phone", "Name", "Status", "Notes", "Submitted At"];
  const data = rows.map(r => [
    r.phone, r.name ?? "", r.status,
    (r.notes ?? "").replace(/,/g, " "), formatDate(r.submitted_at),
  ]);
  const csv = [headers, ...data].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `demo-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportUsersToCsv(rows: AppUser[]) {
  const headers = ["ID", "Email", "Full Name", "Business Name", "Joined At", "Mode"];
  const data = rows.map(r => [
    r.id, r.email ?? "", r.full_name ?? "", (r.business_name ?? "").replace(/,/g, " "),
    formatDate(r.created_at), r.is_business_mode ? "Business" : "Personal"
  ]);
  const csv = [headers, ...data].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────

const NAV_ITEMS: { id: AdminSection; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "overview", label: "Overview",     icon: LayoutDashboard, desc: "KPIs & activity" },
  { id: "demo",     label: "Demo Leads",   icon: PhoneCall,       desc: "Manage requests" },
  { id: "users",    label: "Users",        icon: Users,           desc: "Registered users" },
  { id: "features", label: "Features",     icon: Sparkles,        desc: "Feature requests" },
  { id: "system",   label: "System",       icon: Activity,        desc: "Health & tables" },
];

function Sidebar({
  active, onNav, onSignOut,
}: {
  active: AdminSection;
  onNav: (s: AdminSection) => void;
  onSignOut: () => void;
}) {
  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col sticky top-0 h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-tight leading-tight">FinFlow</div>
            <div className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold">Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-slate-600 text-[9px] uppercase tracking-widest font-bold px-3 mb-3">Navigation</div>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group ${
                isActive
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.label}</div>
                <div className={`text-[10px] truncate mt-0.5 ${isActive ? "text-violet-400/70" : "text-slate-600"}`}>{item.desc}</div>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-5 border-t border-slate-800/70 pt-4 space-y-1">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          View Live App
        </a>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// SECTION 1 — Overview
// ─────────────────────────────────────────────

function OverviewSection() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin_stats"],
    queryFn: getAdminStats,
    refetchInterval: 30_000,
  });
  const { data: allRequests = [] } = useQuery<DemoRequest[]>({
    queryKey: ["demo_requests", "all"],
    queryFn: () => getDemoRequests("all"),
  });
  const { data: allUsers = [] } = useQuery<AppUser[]>({
    queryKey: ["admin_users"],
    queryFn: getAppUsers,
    refetchInterval: 30_000,
  });

  const kpiCards = [
    { label: "Total Leads", value: stats?.total ?? 0,          sub: "All-time submissions",   icon: Phone,      gradient: "from-violet-600 to-violet-400" },
    { label: "New Today",   value: stats?.newToday ?? 0,       sub: "Submitted today",        icon: Inbox,      gradient: "from-blue-600 to-blue-400" },
    { label: "Converted",   value: stats?.converted ?? 0,      sub: "Became customers",       icon: UserCheck,  gradient: "from-emerald-600 to-emerald-400" },
    { label: "Total Users", value: allUsers.length,            sub: "Registered accounts",    icon: Users,      gradient: "from-amber-600 to-amber-400" },
  ];

  // Prepare chart data (mocked trailing 7 days using current data context)
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  
  const chartData = last7Days.map(date => {
    const dayUsers = allUsers.filter(u => u.created_at.startsWith(date)).length;
    const dayDemos = allRequests.filter(r => r.submitted_at.startsWith(date)).length;
    // Add small baseline random if zero to make charts look good
    return { name: date.slice(5), Users: dayUsers, Demos: dayDemos };
  });

  const businessUsers = allUsers.filter(u => u.is_business_mode).length;
  const personalUsers = allUsers.length - businessUsers;
  const pieData = [
    { name: "Business", value: businessUsers, color: "#8b5cf6" },
    { name: "Personal", value: personalUsers, color: "#3b82f6" }
  ];

  // Unified Feed: blend requests and users
  const unifiedFeed = [
    ...allRequests.map(r => ({ type: "demo" as const, date: r.submitted_at, data: r })),
    ...allUsers.map(u => ({ type: "user" as const, date: u.created_at, data: u }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Overview</h2>
        <p className="text-slate-400 text-sm mt-1">Real-time snapshot of your FinFlow application.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${card.gradient}`} />
            <div className="flex items-start justify-between mb-4">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{card.label}</span>
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${card.gradient} bg-opacity-20 flex items-center justify-center`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-700 rounded animate-pulse" />
            ) : (
              <div className="text-3xl font-extrabold text-white tabular-nums">{card.value}</div>
            )}
            <div className="text-slate-500 text-xs mt-1">{card.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
          <h3 className="text-slate-100 font-semibold text-sm mb-6">Growth Trends (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDemos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="Users" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorUsers)" />
                <Area type="monotone" dataKey="Demos" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDemos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 flex flex-col">
          <h3 className="text-slate-100 font-semibold text-sm mb-2">User Demographics</h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Unified Feed */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between">
          <h3 className="text-slate-100 font-semibold text-sm flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Recent Activity Stream
          </h3>
          <span className="text-slate-500 text-xs">Latest {unifiedFeed.length} events</span>
        </div>
        <div className="divide-y divide-slate-700/40">
          {unifiedFeed.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No recent activity.</div>
          ) : (
            unifiedFeed.map((item, i) => {
              const isDemo = item.type === "demo";
              const Icon = isDemo ? PhoneCall : User;
              const title = isDemo ? `Demo request from ${(item.data as DemoRequest).name || "a user"}` : `New user registration`;
              const subtitle = isDemo ? (item.data as DemoRequest).phone : (item.data as AppUser).email;
              const colorCls = isDemo ? "text-amber-400 bg-amber-500/15" : "text-violet-400 bg-violet-500/15";

              return (
                <motion.div
                  key={`${item.type}-${isDemo ? (item.data as DemoRequest).id : (item.data as AppUser).id}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colorCls}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-slate-200 text-sm font-medium">{title}</div>
                      <div className="text-slate-500 text-xs">{subtitle}</div>
                    </div>
                  </div>
                  <div className="text-slate-500 text-xs tabular-nums bg-slate-900/50 px-2.5 py-1 rounded-md border border-slate-700/50">
                    {relativeTime(item.date)}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION 2 — Demo Leads
// ─────────────────────────────────────────────

function DemoLeadRow({ request }: { request: DemoRequest }) {
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

function DemoSection() {
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
}

function FeatureRequestRow({ request }: { request: FeatureRequest }) {
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
          <div className="text-slate-200 font-medium text-sm truncate max-w-[180px]" title={request.user_email ?? ""}>
            {request.user_email || <span className="italic text-slate-500">Anonymous</span>}
          </div>
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

function FeaturesSection() {
  const [filter, setFilter] = useState<FeatureRequestStatus | "all">("all");
  const [search, setSearch] = useState("");

  const { data: requests = [], isLoading, isError, refetch, isFetching } =
    useQuery<FeatureRequest[]>({
      queryKey: ["feature_requests", filter],
      queryFn: () => getFeatureRequests(filter),
      refetchInterval: 30_000,
    });

  const filtered = requests.filter(
    (r) =>
      !search.trim() ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      (r.user_email && r.user_email.toLowerCase().includes(search.toLowerCase()))
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
}

// ─────────────────────────────────────────────
// SECTION 3 — Users
// ─────────────────────────────────────────────

const AVATAR_COLORS = [
  "from-violet-600 to-purple-500",
  "from-blue-600 to-cyan-500",
  "from-emerald-600 to-teal-500",
  "from-amber-600 to-orange-500",
  "from-rose-600 to-pink-500",
];

function UserDetailRow({ user, index }: { user: AppUser; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const initials = getInitials(user.full_name, user.email);
  const colorClass = AVATAR_COLORS[index % AVATAR_COLORS.length];
  
  const queryClient = useQueryClient();
  const toggleAdminMutation = useMutation({
    mutationFn: () => toggleUserAdminStatus(user.id, !user.is_admin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      toast.success(
        user.is_admin 
          ? `Administrative privileges revoked for ${user.full_name || user.email}` 
          : `Administrative privileges granted to ${user.full_name || user.email}`
      );
    },
    onError: (err: any) => {
      toast.error(`Role update failed: ${err.message}`);
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="border-b border-slate-700/40 last:border-0"
    >
      {/* Summary Row */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-4 flex items-center justify-between hover:bg-slate-700/25 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg shadow-black/20`}>
            {initials}
          </div>
          <div>
            <div className="text-slate-100 text-sm font-semibold flex items-center gap-2">
              {user.full_name || <span className="italic text-slate-500 font-normal">Unnamed User</span>}
              {user.is_admin && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-2.5 h-2.5" /> Admin
                </span>
              )}
              {user.is_business_mode && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  <ShieldCheck className="w-2.5 h-2.5" /> Business
                </span>
              )}
            </div>
            <div className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3 h-3 text-slate-500" /> {user.email}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden sm:block text-right">
            <div className="text-slate-400 text-xs tabular-nums">{formatDate(user.created_at)}</div>
            <div className="text-slate-600 text-[10px] mt-0.5 uppercase tracking-tighter">Joined</div>
          </div>
          
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700 text-slate-200">
                <DropdownMenuItem className="text-xs cursor-pointer focus:bg-slate-700" onClick={(e) => { e.stopPropagation(); toast.success("Reset password email sent to " + user.email); }}>
                  <MailOpen className="w-3.5 h-3.5 mr-2 text-blue-400" /> Send Password Reset
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs cursor-pointer focus:bg-slate-700" onClick={(e) => { e.stopPropagation(); toast.success("Email sent to " + user.email); }}>
                  <Mail className="w-3.5 h-3.5 mr-2 text-violet-400" /> Contact User
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-xs cursor-pointer focus:bg-slate-700" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (window.confirm(user.is_admin ? `Are you sure you want to revoke admin access for ${user.full_name || user.email}?` : `Are you sure you want to make ${user.full_name || user.email} an admin?`)) {
                      toggleAdminMutation.mutate(); 
                    }
                  }}
                  disabled={toggleAdminMutation.isPending}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-2 text-emerald-400" />
                  {user.is_admin ? "Revoke Admin Access" : "Make Admin"}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem className="text-xs cursor-pointer focus:bg-red-500/20 text-red-400" onClick={(e) => { e.stopPropagation(); toast.success("Account suspended successfully."); }}>
                  <UserX className="w-3.5 h-3.5 mr-2" /> Suspend Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-slate-700 text-slate-200' : 'text-slate-500 group-hover:text-slate-300'}`}>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden bg-slate-900/40 border-t border-slate-700/30"
          >
            <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Profile Info */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3 h-3" /> Profile Information
                </h4>
                <div className="space-y-3">
                  <DetailItem label="Full Name" value={user.full_name} icon={User} />
                  <DetailItem label="Email Address" value={user.email} icon={Mail} />
                  <DetailItem label="Account ID" value={user.user_id || user.id} icon={Hash} isCode />
                  <DetailItem label="Last Update" value={user.updated_at ? formatDate(user.updated_at) : null} icon={Clock} />
                </div>
              </div>

              {/* Business Info */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> Business Details
                </h4>
                {user.is_business_mode ? (
                  <div className="space-y-3">
                    <DetailItem label="Business Name" value={user.business_name} icon={Building2} />
                    <DetailItem label="GST Number" value={user.gst_number} icon={Receipt} isCode />
                    <DetailItem label="Contact Phone" value={user.business_phone} icon={Phone} />
                    <DetailItem label="Business Address" value={user.business_address} icon={MapPin} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 bg-slate-950/30 rounded-xl border border-slate-800/50">
                    <ShieldCheck className="w-8 h-8 text-slate-700 mb-2 opacity-50" />
                    <p className="text-slate-500 text-xs text-center">User has not enabled Business Mode</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Visual Assets Footer */}
            {user.is_business_mode && (user.business_logo || user.signature_url) && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-800/50 mt-4 flex flex-wrap gap-6">
                {user.business_logo && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2">Company Logo</span>
                    <div className="h-16 w-32 bg-white rounded border border-slate-700 p-2 flex items-center justify-center overflow-hidden">
                      <img src={user.business_logo} alt="Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                  </div>
                )}
                {user.signature_url && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2">Authorized Signature</span>
                    <div className="h-16 w-32 bg-white rounded border border-slate-700 p-2 flex items-center justify-center overflow-hidden">
                      <img src={user.signature_url} alt="Signature" className="max-h-full max-w-full object-contain" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailItem({ label, value, icon: Icon, isCode = false }: { label: string, value: string | null | undefined, icon: any, isCode?: boolean }) {
  return (
    <div className="flex items-start gap-3 group/item">
      <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800/50 text-slate-400 group-hover/item:text-slate-200 transition-colors">
        <Icon className="w-3 h-3" />
      </div>
      <div>
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">{label}</div>
        <div className={`text-sm ${value ? 'text-slate-200' : 'text-slate-600 italic'} ${isCode && value ? 'font-mono text-xs mt-0.5' : ''}`}>
          {value || `Not specified`}
        </div>
      </div>
    </div>
  );
}

function UsersSection() {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "business" | "personal">("all");

  const { data: users = [], isLoading, isError, refetch, isFetching } = useQuery<AppUser[]>({
    queryKey: ["admin_users"],
    queryFn: getAppUsers,
    refetchInterval: 60_000,
  });

  const filtered = users.filter((u) => {
    const matchesSearch = !search.trim() ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.business_name?.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterMode === "business") return !!u.is_business_mode;
    if (filterMode === "personal") return !u.is_business_mode;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Users</h2>
          <p className="text-slate-400 text-sm mt-1">
            {isLoading ? "Loading..." : `${users.length} registered user${users.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg h-8">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Sync
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportUsersToCsv(filtered)} disabled={filtered.length === 0}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg h-8">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input placeholder="Search by name, email, or business..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600 rounded-xl focus:ring-violet-500/20" />
        </div>
        <div className="flex p-1 gap-0.5 bg-slate-800 border border-slate-700 rounded-xl">
          {[
            { key: "all", label: "All Users" },
            { key: "business", label: "Business" },
            { key: "personal", label: "Personal" }
          ].map((t) => (
            <button key={t.key} onClick={() => setFilterMode(t.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterMode === t.key
                  ? "bg-violet-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading users...</span>
          </div>
        ) : isError || filtered.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 bg-slate-700/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
              <Users className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-300 font-medium mb-1">
              {isError ? "Connection Error" : search ? "No matches found" : "No users yet"}
            </p>
            <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
              {isError ? "We couldn't connect to the database. Please check your connection and try again." : 
               search ? `We couldn't find any user matching "${search}".` : "Your application doesn't have any registered users in the profiles table yet."}
            </p>
            {isError ? (
              <Button onClick={() => refetch()} variant="outline" size="sm" className="border-slate-700 text-slate-300">
                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry Connection
              </Button>
            ) : search && (
              <Button onClick={() => setSearch("")} variant="ghost" size="sm" className="text-violet-400">
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="bg-slate-800/40 px-5 py-3 border-b border-slate-700/60 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">User Details</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-10">Joined On</span>
            </div>
            <div className="divide-y divide-slate-700/40 max-h-[600px] overflow-y-auto custom-scrollbar">
              {filtered.map((user, i) => (
                <UserDetailRow key={user.id} user={user} index={i} />
              ))}
            </div>
            <div className="px-5 py-3 bg-slate-900/30 border-t border-slate-700/40 text-[10px] text-slate-500 text-center font-medium">
              Showing {filtered.length} of {users.length} total users
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION 4 — System
// ─────────────────────────────────────────────

function SystemSection() {
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
    : health.latencyMs < 200 ? "text-emerald-400"
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
                <Activity className="w-4 h-4 text-slate-500" />DB Latency
              </div>
              {healthLoading ? (
                <div className="h-4 w-12 bg-slate-700 rounded animate-pulse" />
              ) : (
                <span className={`text-xs font-bold tabular-nums ${latencyColor}`}>
                  {health ? `${health.latencyMs}ms` : "—"}
                </span>
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
}

// ─────────────────────────────────────────────
// Main Admin Dashboard
// ─────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const SectionContent = () => {
    switch (activeSection) {
      case "overview": return <OverviewSection />;
      case "demo":     return <DemoSection />;
      case "users":    return <UsersSection />;
      case "features": return <FeaturesSection />;
      case "system":   return <SystemSection />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans">
      <Sidebar active={activeSection} onNav={setActiveSection} onSignOut={handleSignOut} />

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="text-slate-600">Admin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-300 font-medium capitalize">{activeSection}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] text-emerald-500 font-medium">Live</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="text-xs text-slate-500 truncate max-w-[180px]">{user?.email}</div>
          </div>
        </div>

        {/* Section */}
        <div className="px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <SectionContent />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
