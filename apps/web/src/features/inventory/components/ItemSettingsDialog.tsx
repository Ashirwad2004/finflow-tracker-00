import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings2, Info } from "lucide-react";

interface ItemSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: {
    stopSaleOnNegativeStock: boolean;
    lowStockWarningThreshold: number;
    deductStockOnlyOnPaid: boolean;
    showStockInItemPicker: boolean;
    showRackLocations: boolean;
  };
  updateSetting: (key: string, value: any) => void;
  resetSettings: () => void;
}

export const ItemSettingsDialog: React.FC<ItemSettingsDialogProps> = ({
  open,
  onOpenChange,
  settings,
  updateSetting,
  resetSettings,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Item Settings
          </DialogTitle>
          <DialogDescription>
            Configure how items behave across sales and inventory tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 py-2">
          {/* Section: Stock Control */}
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
            Stock Control
          </p>

          {/* Stop Sale on Negative Stock */}
          <div
            className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all ${
              settings.stopSaleOnNegativeStock
                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  Stop Sale on Negative Stock
                </p>
                {settings.stopSaleOnNegativeStock && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Block invoice creation when an item's sold quantity exceeds current stock. Prevents selling items you don't have.
              </p>
            </div>
            <Switch
              checked={settings.stopSaleOnNegativeStock}
              onCheckedChange={(value) => updateSetting("stopSaleOnNegativeStock", value)}
              aria-label="Toggle stop sale on negative stock"
            />
          </div>

          {/* Low Stock Threshold */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
                Low Stock Warning Threshold
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Show a low stock badge when quantity falls below this number. Set to 0 to disable.
              </p>
            </div>
            <div className="flex flex-col">
              <Label htmlFor="low_stock_warning_threshold" className="sr-only">
                Low stock warning threshold
              </Label>
              <input
                id="low_stock_warning_threshold"
                type="number"
                min={0}
                max={9999}
                aria-label="Low stock warning threshold"
                title="Low stock warning threshold"
                value={settings.lowStockWarningThreshold}
                onChange={(e) =>
                  updateSetting("lowStockWarningThreshold", Math.max(0, Number(e.target.value)))
                }
                className="w-20 h-9 text-right text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Section: Invoice Behaviour */}
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-5 mb-3">
            Invoice Behaviour
          </p>

          {/* Deduct Stock Only on Paid */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
                Deduct Stock Only on Paid Invoices
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                When enabled, stock is only reduced when an invoice is marked as Paid — not for Pending or Draft invoices.
              </p>
            </div>
            <Switch
              checked={settings.deductStockOnlyOnPaid}
              onCheckedChange={(value) => updateSetting("deductStockOnlyOnPaid", value)}
              aria-label="Toggle deduct stock only on paid invoices"
            />
          </div>

          {/* Section: Display */}
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-5 mb-3">
            Display
          </p>

          {/* Show stock in item picker */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
                Show Stock in Item Picker
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Display available stock count next to each item when adding lines to an invoice.
              </p>
            </div>
            <Switch
              checked={settings.showStockInItemPicker}
              onCheckedChange={(value) => updateSetting("showStockInItemPicker", value)}
              aria-label="Toggle show stock in item picker"
            />
          </div>

          {/* Enable Rack Locations */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
                Enable Rack Locations
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enable tracking and displaying physical rack or shelf locations for each product in your inventory (ideal for pharmacies).
              </p>
            </div>
            <Switch
              checked={settings.showRackLocations}
              onCheckedChange={(value) => updateSetting("showRackLocations", value)}
              aria-label="Toggle enable rack locations"
            />
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              All settings are saved automatically and apply immediately across your account.
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
