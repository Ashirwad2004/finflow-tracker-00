import React, { useState } from "react";
import {
  Lightbulb,
  Calculator,
  Bell,
  Sun,
  LogOut,
  ChevronDown,
  ChevronLeft,
} from "lucide-react";
import {
  businessMenuItems,
  personalMenuItems,
} from "@/components/layout/sidebar/sidebarNavItems";
import { SidebarMenuItem } from "@/components/layout/sidebar/types";

interface DashboardSimulatedSidebarProps {
  activeMenu: "dashboard" | "pos";
  onSelectMenu: (menu: "dashboard" | "pos") => void;
  businessMode: boolean;
  onToggleBusinessMode: () => void;
}

/**
 * The menu is the app's own `businessMenuItems` and `personalMenuItems`, imported
 * rather than retyped, so the landing page always shows every module that
 * actually ships — titles, descriptions, icons, badges and sub-items included.
 * Add a module to the app's sidebar and it appears here with no edit.
 *
 * The two paths that have a live view in this showcase. Everything else is a
 * real menu row a visitor can read, but it does not pretend to open a screen
 * that is not here.
 */
const WIRED: Record<string, "dashboard" | "pos"> = {
  "/business-dashboard": "dashboard",
  "/pos": "pos",
};

const RowBody: React.FC<{ item: SidebarMenuItem; active: boolean }> = ({
  item,
  active,
}) => (
  <>
    <item.icon
      className={`w-4 h-4 shrink-0 ${active ? "" : "text-slate-400"}`}
    />
    <div className="min-w-0 flex-1">
      <div className="text-xs font-black leading-tight truncate">
        {item.title}
      </div>
      <div
        className={`text-[10px] font-normal truncate ${
          active ? "text-violet-200" : "text-slate-400"
        }`}
      >
        {item.description}
      </div>
    </div>
    {item.badge && (
      <span
        className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${
          active
            ? "bg-white/20 text-white"
            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        }`}
      >
        {item.badge}
      </span>
    )}
  </>
);

export const DashboardSimulatedSidebar: React.FC<
  DashboardSimulatedSidebarProps
> = ({ activeMenu, onSelectMenu, businessMode, onToggleBusinessMode }) => {
  const items = businessMode ? businessMenuItems : personalMenuItems;

  // Opening a group is the visitor's own action, so it is allowed to animate.
  const [open, setOpen] = useState<Record<string, boolean>>({
    "/sales": true,
  });

  const ACTIVE =
    "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/25";
  const IDLE =
    "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800";

  return (
    <div className="w-64 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col shrink-0">
      {/* Logo Row */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-sm">
            ₹
          </div>
          <div>
            <div className="font-black text-sm tracking-tight text-slate-900 dark:text-white leading-none">
              <span className="text-violet-600">₹upee</span>
              <span className="text-emerald-500">Bill</span>
            </div>
            <div className="text-[9px] font-bold text-slate-400 tracking-wider mt-0.5">
              Finance &amp; billing
            </div>
          </div>
        </div>
        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <ChevronLeft className="w-3 h-3" />
        </div>
      </div>

      {/* Store & plan */}
      <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black tracking-wider text-slate-400">
            RupeeBill Business
          </span>
          <span className="text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
            Pro
          </span>
        </div>
        <div className="font-black text-xs text-slate-800 dark:text-slate-100 mt-1 truncate">
          Satyam Hardware &amp; Material
        </div>
      </div>

      {/* Business mode actually swaps the menu, the way it does in the app. */}
      <div className="mt-4 flex items-center justify-between px-1">
        <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
          Business mode
        </span>
        <button
          onClick={onToggleBusinessMode}
          aria-pressed={businessMode}
          aria-label="Toggle business mode"
          className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
            businessMode ? "bg-violet-600" : "bg-slate-300 dark:bg-slate-700"
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white transition-transform ${
              businessMode ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Every module the app ships, scrollable exactly as it is in the app. */}
      <nav className="mt-3 flex-1 space-y-1 overflow-y-auto pr-0.5 max-h-[400px] lg:max-h-[430px]">
        {items.map((item) => {
          const wired = WIRED[item.path];
          const active = wired ? activeMenu === wired : false;
          const hasChildren = !!item.children?.length;
          const isOpen = open[item.path] ?? false;

          return (
            <div key={item.path}>
              {wired ? (
                <button
                  onClick={() => onSelectMenu(wired)}
                  className={`w-full text-left p-2.5 rounded-xl font-bold flex items-center gap-3 transition-colors ${
                    active ? ACTIVE : IDLE
                  }`}
                >
                  <RowBody item={item} active={active} />
                </button>
              ) : hasChildren ? (
                <button
                  onClick={() =>
                    setOpen((prev) => ({ ...prev, [item.path]: !isOpen }))
                  }
                  aria-expanded={isOpen}
                  className={`w-full text-left p-2.5 rounded-xl font-bold flex items-center gap-3 transition-colors ${IDLE}`}
                >
                  <RowBody item={item} active={false} />
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${
                      isOpen ? "" : "-rotate-90"
                    }`}
                  />
                </button>
              ) : (
                <div
                  className={`p-2.5 rounded-xl font-bold flex items-center gap-3 transition-colors ${IDLE}`}
                >
                  <RowBody item={item} active={false} />
                </div>
              )}

              {hasChildren && isOpen && (
                <div className="pl-9 pt-1 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {item.children?.map((child) => (
                    <div
                      key={child.path}
                      className="py-1 flex items-center gap-2 hover:text-violet-600 dark:hover:text-violet-400"
                    >
                      {child.icon && <child.icon className="w-3 h-3 shrink-0" />}
                      <span className="truncate">{child.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-2 text-xs">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Request a feature
        </div>
        <div className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-2 text-xs">
          <Calculator className="w-3.5 h-3.5 text-violet-600" /> GST calculator
        </div>

        <div className="flex items-center justify-between pt-2 text-slate-400">
          <Bell className="w-4 h-4" />
          <Sun className="w-4 h-4" />
          <LogOut className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
