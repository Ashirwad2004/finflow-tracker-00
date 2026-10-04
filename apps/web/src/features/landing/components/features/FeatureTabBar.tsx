import React from "react";
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
  return (
    <div className="flex justify-center mb-8 sm:mb-12 px-1">
      <div className="w-full max-w-5xl p-1.5 sm:p-2 bg-muted/70 dark:bg-muted/40 border border-[hsl(var(--lp-rule))] overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max justify-start md:justify-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3  text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  isSelected
                    ? "bg-[hsl(var(--lp-ink))] text-[hsl(var(--lp-paper))] border border-[hsl(var(--lp-ink))]"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                <span>{tab.title}</span>
                <span
                  className={`text-[10px] px-2 py-0.5  font-semibold ${
                    isSelected
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-muted text-muted-foreground"
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
