import React from "react";
import { ChevronRight, ExternalLink, LogOut } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { AdminSection, NAV_ITEMS } from "../lib/adminUtils";

interface AdminSidebarProps {
  active: AdminSection;
  onNav: (section: AdminSection) => void;
  onSignOut: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  active,
  onNav,
  onSignOut,
}) => {
  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col sticky top-0 h-screen">
      <div className="px-6 py-5 border-b border-slate-800/70">
        <div className="flex flex-col gap-2">
          <Logo size={28} showText={true} theme="dark" />
          <div className="px-2 py-0.5 bg-slate-800/50 rounded-md border border-slate-700/50 w-fit">
            <span className="text-slate-400 text-[9px] uppercase tracking-widest font-bold">Admin Panel</span>
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
};

export default AdminSidebar;
