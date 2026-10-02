import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Phone, Inbox, UserCheck, Users, PhoneCall, User } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  getDemoRequests,
  getAdminStats,
  type DemoRequest,
  type AdminStats,
} from "../lib/demoApi";
import { getAppUsers, type AppUser } from "../lib/adminApi";
import { relativeTime } from "../lib/adminUtils";

export const AdminOverviewSection: React.FC = () => {
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

  // Prepare chart data (trailing 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  
  const chartData = last7Days.map(date => {
    const dayUsers = allUsers.filter(u => u.created_at.startsWith(date)).length;
    const dayDemos = allRequests.filter(r => r.submitted_at.startsWith(date)).length;
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
        <p className="text-slate-400 text-sm mt-1">Real-time snapshot of your RupeeBill application.</p>
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
};

export default AdminOverviewSection;
