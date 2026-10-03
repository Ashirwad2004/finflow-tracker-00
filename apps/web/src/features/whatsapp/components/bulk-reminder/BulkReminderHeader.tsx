import React from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";

interface BulkReminderHeaderProps {
  invoiceCount: number;
  isCheckingStatus: boolean;
  isConnected: boolean;
  phoneNumber?: string | null;
  onOpenSettings?: () => void;
}

export const BulkReminderHeader: React.FC<BulkReminderHeaderProps> = ({
  invoiceCount,
  isCheckingStatus,
  isConnected,
  phoneNumber,
  onOpenSettings,
}) => {
  return (
    <DialogHeader className="p-6 pb-4 bg-emerald-500/5 dark:bg-emerald-950/20 border-b border-slate-100 dark:border-slate-800 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
            <MessageCircle className="w-5 h-5 fill-emerald-500/20" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              Send WhatsApp Reminders
              <Badge
                variant="secondary"
                className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs"
              >
                {invoiceCount} Overdue
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Deliver polite outstanding payment reminders directly to customers via WhatsApp.
            </DialogDescription>
          </div>
        </div>

        {/* Connection Pill */}
        <div className="flex items-center gap-2">
          {isCheckingStatus ? (
            <Badge variant="outline" className="text-xs text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin mr-1" /> Checking WhatsApp
            </Badge>
          ) : isConnected ? (
            <Badge
              variant="outline"
              className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 text-xs gap-1.5 py-1 px-2.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected {phoneNumber ? `(+${phoneNumber})` : ""}
            </Badge>
          ) : (
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 text-xs gap-1.5 py-1 px-2"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Disconnected
              </Badge>
              {onOpenSettings && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 text-primary hover:text-primary/80 px-2"
                  onClick={onOpenSettings}
                >
                  Connect
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </DialogHeader>
  );
};
