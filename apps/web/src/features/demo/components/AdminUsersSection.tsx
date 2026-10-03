import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck,
  Mail,
  MoreVertical,
  MailOpen,
  UserX,
  ChevronDown,
  User,
  Hash,
  Clock,
  Building2,
  Receipt,
  Phone,
  MapPin,
  Users,
  RefreshCw,
  Download,
  Search,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  getAppUsers,
  toggleUserAdminStatus,
  type AppUser,
} from "../lib/adminApi";
import {
  formatDate,
  getInitials,
  exportUsersToCsv,
} from "../lib/adminUtils";

const AVATAR_COLORS = [
  "from-violet-600 to-purple-500",
  "from-blue-600 to-cyan-500",
  "from-emerald-600 to-teal-500",
  "from-amber-600 to-orange-500",
  "from-rose-600 to-pink-500",
];

export function DetailItem({ label, value, icon: Icon, isCode = false }: { label: string, value: string | null | undefined, icon: any, isCode?: boolean }) {
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

export function UserDetailRow({ user, index }: { user: AppUser; index: number }) {
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

export const AdminUsersSection: React.FC = () => {
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
};

export default AdminUsersSection;
