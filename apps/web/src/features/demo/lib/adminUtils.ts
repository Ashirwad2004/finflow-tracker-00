import React from "react";
import {
  Inbox,
  Clock,
  Sparkles,
  XCircle,
  CheckCircle2,
  PhoneCall,
  AlertTriangle,
  LayoutDashboard,
  Receipt,
  Users,
  Activity,
} from "lucide-react";
import type { FeatureRequestStatus } from "./featureRequestsApi";
import type { DemoStatus, DemoRequest } from "./demoApi";
import type { AppUser } from "./adminApi";

export type AdminSection = "overview" | "payments" | "demo" | "users" | "system" | "features";

export const FEATURE_STATUS_CONFIG: Record<FeatureRequestStatus, {
  label: string;
  textColor: string;
  bgColor: string;
  icon: React.ElementType;
}> = {
  pending:   { label: "Pending",   textColor: "text-blue-400",   bgColor: "bg-blue-500/15 border border-blue-500/30",   icon: Inbox },
  reviewed:  { label: "Reviewed",  textColor: "text-yellow-400",  bgColor: "bg-yellow-500/15 border border-yellow-500/30", icon: Clock },
  approved:  { label: "Approved",  textColor: "text-purple-400",  bgColor: "bg-purple-500/15 border border-purple-500/30", icon: Sparkles },
  declined:  { label: "Declined",  textColor: "text-red-400",     bgColor: "bg-red-500/15 border border-red-500/30",     icon: XCircle },
  completed: { label: "Completed", textColor: "text-emerald-400", bgColor: "bg-emerald-500/15 border border-emerald-500/30", icon: CheckCircle2 },
};

export const STATUS_CONFIG: Record<DemoStatus, {
  label: string;
  textColor: string;
  bgColor: string;
  icon: React.ElementType;
}> = {
  new:       { label: "New",       textColor: "text-blue-400",   bgColor: "bg-blue-500/15 border border-blue-500/30",   icon: Inbox },
  called:    { label: "Called",    textColor: "text-amber-400",  bgColor: "bg-amber-500/15 border border-amber-500/30",  icon: PhoneCall },
  converted: { label: "Converted", textColor: "text-emerald-400",bgColor: "bg-emerald-500/15 border border-emerald-500/30", icon: CheckCircle2 },
  spam:      { label: "Spam",      textColor: "text-red-400",    bgColor: "bg-red-500/15 border border-red-500/30",    icon: AlertTriangle },
};

export type DemoFilter = DemoStatus | "all";

export const NAV_ITEMS: { id: AdminSection; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "overview", label: "Overview",     icon: LayoutDashboard, desc: "KPIs & activity" },
  { id: "payments", label: "Payments",     icon: Receipt,         desc: "Transactions & tiers" },
  { id: "demo",     label: "Demo Leads",   icon: PhoneCall,       desc: "Manage requests" },
  { id: "users",    label: "Users",        icon: Users,           desc: "Registered users" },
  { id: "features", label: "Features",     icon: Sparkles,        desc: "Feature requests" },
  { id: "system",   label: "System",       icon: Activity,        desc: "Health & tables" },
];

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(iso));
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function getInitials(name: string | null, email: string | null) {
  if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return "?";
}

export function exportToCsv(rows: DemoRequest[]) {
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

export function exportUsersToCsv(rows: AppUser[]) {
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

export function exportPaymentsToCsv(rows: any[]) {
  const headers = ["ID", "Gateway Order ID", "Gateway Payment ID", "User ID", "Amount", "Currency", "Status", "Gateway", "Method", "Date"];
  const data = rows.map(r => [
    r.id, r.gateway_order_id ?? "", r.gateway_payment_id ?? "", r.user_id ?? "",
    r.amount, r.currency ?? "INR", r.status, r.gateway ?? "", r.payment_method ?? "",
    formatDate(r.created_at || new Date().toISOString())
  ]);
  const csv = [headers, ...data].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payments-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
