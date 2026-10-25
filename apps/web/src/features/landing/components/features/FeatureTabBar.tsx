import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_DRAW, useTabKeys } from "@/features/landing/motion";
import { FeatureTabId, TabItem } from "./types";

interface FeatureTabBarProps {
  tabs: TabItem[];
  activeTab: FeatureTabId;
  onSelectTab: (tabId: FeatureTabId) => void;
}

export const FeatureTabBar: React.FC<FeatureTabBarProps> = ({
  tabs,
  activeTab,
  onSelectTab,
}) => {
  const reduced = useReducedMotion();
  const { tabProps } = useTabKeys(
    tabs.map((t) => t.id),
    activeTab,
    onSelectTab
  );

  return (
    <div className="mb-8 flex justify-center px-2 sm:mb-12">
      <div className="w-full max-w-5xl rounded-2xl p-1.5 sm:p-2 bg-muted/60 dark:bg-muted/30 border border-border/80 shadow-inner backdrop-blur-md overflow-x-auto no-scrollbar">
        {/* `role="tab"` only carries meaning inside a `tablist` */}
        <div
          role="tablist"
          aria-label="Choose a module"
          className="flex items-center gap-1.5 min-w-max justify-start md:justify-center"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                {...tabProps(tab.id)}
                id={`lp-feature-tab-${tab.id}`}
                aria-controls={`lp-feature-panel-${tab.id}`}
                className={`group relative isolate flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 sm:px-4 sm:py-3 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected
                    ? "text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
              >
                {/* Active Sliding Indicator: Elevated Card with guaranteed contrast in light & dark */}
                {isSelected && (
                  <motion.span
                    aria-hidden="true"
                    layoutId={reduced ? undefined : "lp-feature-tab-active"}
                    className="absolute inset-0 rounded-xl bg-background dark:bg-card shadow-sm border border-border/80 -z-10"
                    transition={{ duration: 0.35, ease: EASE_DRAW }}
                  />
                )}
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isSelected
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <span className="tracking-tight">{tab.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] transition-all ${
                    isSelected
                      ? "bg-violet-500/10 dark:bg-violet-400/20 text-violet-700 dark:text-violet-300 font-bold border border-violet-500/20"
                      : "bg-muted/80 text-muted-foreground font-medium border border-border/40"
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
