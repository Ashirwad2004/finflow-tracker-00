import React from "react";
import { Settings2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SalesSettings } from "@/core/hooks/use-sales-settings";
import { InvoicingDefaultsSection } from "./InvoicingDefaultsSection";
import { AccountingControlsSection } from "./AccountingControlsSection";
import { WorkflowSettingsSection } from "./WorkflowSettingsSection";

export interface SalesSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: SalesSettings;
  updateSetting: <K extends keyof SalesSettings>(key: K, value: SalesSettings[K]) => void;
  resetSettings: () => void;
}

export const SalesSettingsDialog: React.FC<SalesSettingsDialogProps> = ({
  open,
  onOpenChange,
  settings,
  updateSetting,
  resetSettings,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Sales Settings
          </DialogTitle>
          <DialogDescription>
            Configure invoicing defaults, accounting controls, and workflow preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 py-2">
          <InvoicingDefaultsSection settings={settings} updateSetting={updateSetting} />
          <AccountingControlsSection settings={settings} updateSetting={updateSetting} />
          <WorkflowSettingsSection settings={settings} updateSetting={updateSetting} />

          {/* Info note */}
          <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              All changes apply immediately. Defaults apply to new invoices only; existing invoices
              are unaffected.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetSettings}
            className="text-slate-500 mr-auto"
          >
            Reset to Defaults
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
