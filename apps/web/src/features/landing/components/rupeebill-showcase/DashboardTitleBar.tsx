import React from "react";

export const DashboardTitleBar: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#9333ea] px-4 py-2 flex items-center justify-between text-white text-xs select-none">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-xs tracking-wide flex items-center gap-1.5 truncate max-w-[280px] sm:max-w-none">
          <span className="w-2.5 h-2.5 rounded-full bg-white/30 inline-block" />
          RupeeBill Tracker - RupeeBill — Billing, Inventory &amp; Online Store
        </span>
      </div>

      {/* Windows Controls */}
      <div className="flex items-center gap-3 text-white/80 font-mono text-xs">
        <span className="hover:text-white cursor-pointer hidden sm:inline">⧉</span>
        <span className="hover:text-white cursor-pointer hidden sm:inline">⋮</span>
        <span className="hover:text-white cursor-pointer text-base leading-none">─</span>
        <span className="hover:text-white cursor-pointer text-sm leading-none">□</span>
        <span className="hover:text-white cursor-pointer text-sm leading-none">✕</span>
      </div>
    </div>
  );
};
