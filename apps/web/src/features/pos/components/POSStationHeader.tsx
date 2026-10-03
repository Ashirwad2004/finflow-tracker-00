import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Store,
  Wifi,
  WifiOff,
  Clock,
  RotateCcw,
  Keyboard,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { POSShift, POSShiftSummary } from "../types";

interface POSStationHeaderProps {
  currentStoreName: string;
  userEmail?: string;
  isOnline: boolean;
  activeShift: POSShift | null;
  shiftSummary: POSShiftSummary | null;
  heldBillsCount: number;
  formatCurrency: (val: number) => string;
  onOpenShift: () => void;
  onOpenHoldResume: () => void;
  onOpenReturn: () => void;
  onOpenShortcuts: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const POSStationHeader: React.FC<POSStationHeaderProps> = ({
  currentStoreName,
  userEmail,
  isOnline,
  activeShift,
  shiftSummary,
  heldBillsCount,
  formatCurrency,
  onOpenShift,
  onOpenHoldResume,
  onOpenReturn,
  onOpenShortcuts,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <header className="h-16 px-4 sm:px-6 border-b border-border/80 bg-card/60 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 sticky top-0 z-10 shadow-2xs">
      {/* Left station identity & status pills */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold shadow-2xs">
            <Store className="w-5 h-5" />
          </div>
          <div className="min-w-0 hidden md:block">
            <h1 className="text-sm font-bold text-foreground truncate leading-tight">
              {currentStoreName || "Retail Billing Register"}
            </h1>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
              <span>Counter Terminal</span>
              <span>•</span>
              <span className="truncate">{userEmail}</span>
            </p>
          </div>
        </div>

        {/* Online / Offline status badge */}
        <Badge
          variant="outline"
          className={`text-[11px] font-medium h-7 px-2.5 flex items-center gap-1.5 transition-colors ${
            isOnline
              ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
              : "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 animate-pulse"
          }`}
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isOnline ? "Online" : "Offline Cache"}</span>
        </Badge>

        {/* Register Shift Pill */}
        <button
          onClick={onOpenShift}
          className="flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-background hover:bg-muted/80 text-xs text-foreground transition-all shadow-2xs group cursor-pointer"
          title="Click to view Cash Register Float / Shift"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              activeShift
                ? "bg-emerald-500 shadow-xs shadow-emerald-500/50 animate-pulse"
                : "bg-amber-500"
            }`}
          />
          <span className="font-semibold group-hover:text-primary transition-colors">
            {activeShift ? "Register Open" : "Register Closed"}
          </span>
          {activeShift && shiftSummary && (
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold ml-0.5">
              {formatCurrency(shiftSummary.expected_cash || 0)}
            </span>
          )}
        </button>
      </div>

      {/* Right Action Hub */}
      <div className="flex items-center gap-2">
        {/* Parked / Held Bills Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenHoldResume}
          className="h-9 px-3 text-xs border-border/80 bg-background hover:bg-muted font-medium relative shadow-2xs"
          title="Parked / Held Bills (F8)"
        >
          <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
          <span className="hidden sm:inline">Parked Bills</span>
          <kbd className="hidden lg:inline-block ml-1 text-[9px] text-muted-foreground bg-muted px-1 rounded border">
            F8
          </kbd>
          {heldBillsCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {heldBillsCount}
            </span>
          )}
        </Button>

        {/* Returns & Credit Note Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenReturn}
          className="h-9 px-3 text-xs border-border/80 bg-background hover:bg-muted font-medium shadow-2xs"
          title="Process Customer Return & Issue Credit Note (F10)"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-primary" />
          <span>Return</span>
          <kbd className="hidden lg:inline-block ml-1 text-[9px] text-muted-foreground bg-muted px-1 rounded border">
            F10
          </kbd>
        </Button>

        {/* Keyboard Shortcuts Dialog Trigger */}
        <Button
          size="icon"
          variant="ghost"
          onClick={onOpenShortcuts}
          className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
          title="Keyboard Shortcuts Cheat Sheet"
        >
          <Keyboard className="w-4 h-4" />
        </Button>

        {/* Fullscreen Mode Toggle */}
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleFullscreen}
          className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 hidden sm:flex"
          title="Toggle Fullscreen Mode"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  );
};
