import React from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface BulkReminderProgressProps {
  currentIndex: number;
  totalToSend: number;
  progressPercent: number;
  sentCount: number;
  failedCount: number;
}

export const BulkReminderProgress: React.FC<BulkReminderProgressProps> = ({
  currentIndex,
  totalToSend,
  progressPercent,
  sentCount,
  failedCount,
}) => {
  return (
    <div className="space-y-2 p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20">
      <div className="flex justify-between items-center text-xs font-semibold">
        <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          Sending reminder {currentIndex} of {totalToSend}...
        </span>
        <span className="text-slate-500 font-mono">
          {Math.round(progressPercent)}%
        </span>
      </div>
      <Progress value={progressPercent} className="h-2 bg-slate-200 dark:bg-slate-800" />
      <div className="flex justify-between text-[11px] text-slate-500 pt-1">
        <span>
          Sent: <strong className="text-emerald-600">{sentCount}</strong>
        </span>
        <span>
          Failed: <strong className="text-rose-600">{failedCount}</strong>
        </span>
        <span>
          Remaining: <strong>{totalToSend - sentCount - failedCount}</strong>
        </span>
      </div>
    </div>
  );
};
