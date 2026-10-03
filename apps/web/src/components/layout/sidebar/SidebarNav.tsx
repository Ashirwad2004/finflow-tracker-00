import React from "react";
import { NavLink, Location, NavigateFunction } from "react-router-dom";
import { ChevronDown, ArrowDown } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SidebarMenuItem } from "./types";
import { prefetchRoute } from "./sidebarNavItems";

interface SidebarNavProps {
  navigationRef: React.RefObject<HTMLElement>;
  rememberNavigationScroll: (event: React.UIEvent<HTMLElement>) => void;
  currentMenuItems: SidebarMenuItem[];
  collapsed: boolean;
  location: Location;
  navigate: NavigateFunction;
  expandedMenus: Record<string, boolean>;
  setExpandedMenus: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  toggleSubmenu: (path: string, e: React.MouseEvent) => void;
  isBusinessMode: boolean;
  pendingOrderCount: number;
  onNavigate?: () => void;
}

export const SidebarNav = ({
  navigationRef,
  rememberNavigationScroll,
  currentMenuItems,
  collapsed,
  location,
  navigate,
  expandedMenus,
  setExpandedMenus,
  toggleSubmenu,
  isBusinessMode,
  pendingOrderCount,
  onNavigate,
}: SidebarNavProps) => {
  return (
    <nav
      ref={navigationRef}
      onScroll={rememberNavigationScroll}
      className="flex-1 p-3 space-y-1 overflow-y-auto"
    >
      {currentMenuItems.map((item) => {
        const hasChildren = Array.isArray(item.children) && item.children.length > 0;
        const isSubmenuOpen = expandedMenus[item.path] ?? false;
        const isParentActive = location.pathname.startsWith(item.path);

        // If menu has children and sidebar is expanded, render collapsible submenu
        if (hasChildren && !collapsed) {
          return (
            <div key={item.path} className="space-y-1">
              {/* Parent Nav Row with Down Arrow */}
              <div
                onMouseEnter={() => prefetchRoute(item.path)}
                onFocus={() => prefetchRoute(item.path)}
                onClick={() => {
                  if (!isSubmenuOpen) {
                    setExpandedMenus((prev) => ({ ...prev, [item.path]: true }));
                    navigate(item.path);
                  } else {
                    setExpandedMenus((prev) => ({ ...prev, [item.path]: false }));
                  }
                  if (onNavigate) onNavigate();
                }}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group select-none",
                  isParentActive
                    ? "bg-primary/10 text-primary dark:bg-primary/20 font-bold"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <item.icon
                    className={cn(
                      "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
                      isParentActive && "text-primary"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{item.title}</p>
                    <p className="text-xs truncate text-muted-foreground/80">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Down Arrow / Chevron button */}
                <button
                  type="button"
                  onClick={(e) => toggleSubmenu(item.path, e)}
                  className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title={isSubmenuOpen ? "Collapse Submenu" : "Expand Submenu"}
                >
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform duration-200",
                      isSubmenuOpen ? "rotate-180 text-primary" : "rotate-0"
                    )}
                  />
                </button>
              </div>

              {/* Submenu Tree (Downwards) */}
              {isSubmenuOpen && (
                <div className="ml-5 pl-3 pr-1 py-1 space-y-0.5 border-l-2 border-slate-200 dark:border-slate-800 animate-in fade-in-50 duration-200">
                  {item.children?.map((child, idx) => {
                    const isChildActive = child.path.includes("?")
                      ? location.pathname + location.search === child.path
                      : location.pathname === child.path && !location.search.includes("tab=");

                    return (
                      <div key={child.path} className="flex flex-col">
                        {idx > 0 && (
                          <div className="flex items-center pl-3.5 py-0.5 text-slate-300 dark:text-slate-700 select-none">
                            <ArrowDown className="w-2.5 h-2.5 opacity-50" />
                          </div>
                        )}
                        <NavLink
                          to={child.path}
                          onClick={onNavigate}
                          onMouseEnter={() => prefetchRoute(child.path)}
                          onFocus={() => prefetchRoute(child.path)}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all group",
                            isChildActive
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {child.icon && (
                              <child.icon
                                className={cn(
                                  "w-4 h-4 shrink-0 transition-transform group-hover:scale-105",
                                  isChildActive ? "text-primary-foreground" : "text-muted-foreground"
                                )}
                              />
                            )}
                            <span className="truncate">{child.title}</span>
                          </div>
                          {child.badge && (
                            <span
                              className={cn(
                                "text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider",
                                isChildActive
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                              )}
                            >
                              {child.badge}
                            </span>
                          )}
                        </NavLink>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // Single Item or Collapsed View
        const currentFullPath = location.pathname + location.search;
        const isActive = item.path.includes("?")
          ? currentFullPath === item.path
          : location.pathname === item.path;
        const showPendingBadge =
          item.path === "/online-store" && isBusinessMode && pendingOrderCount > 0;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            onMouseEnter={() => prefetchRoute(item.path)}
            onFocus={() => prefetchRoute(item.path)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
              isActive
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon
              className={cn(
                "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
                isActive && "text-primary-foreground"
              )}
            />
            {!collapsed && (
              <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <p
                    className={cn(
                      "text-xs truncate",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {item.description}
                  </p>
                </div>
                {showPendingBadge && (
                  <Badge
                    variant={isActive ? "secondary" : "destructive"}
                    className="h-5 min-w-5 px-1.5 text-[10px] font-bold shrink-0"
                  >
                    {pendingOrderCount > 99 ? "99+" : pendingOrderCount}
                  </Badge>
                )}
              </div>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};
