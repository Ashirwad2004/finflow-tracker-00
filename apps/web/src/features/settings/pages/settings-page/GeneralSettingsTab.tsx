import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Globe, Download, Loader2, FileJson, FileSpreadsheet, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENCIES, Currency } from "@/core/contexts/CurrencyContext";
import { BackupFormat } from "./types";

interface GeneralSettingsTabProps {
  isBusinessMode: boolean;
  onBusinessToggle: (checked: boolean) => void;
  autoAddParties: boolean;
  onAutoAddPartiesToggle: (checked: boolean) => void;
  overdueDays: number;
  onOverdueDaysChange: (val: string) => void;
  currency: Currency;
  onCurrencyChange: (val: Currency) => void;
  isBackingUp: boolean;
  onBackup: (format: BackupFormat) => void;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  isBusinessMode,
  onBusinessToggle,
  autoAddParties,
  onAutoAddPartiesToggle,
  overdueDays,
  onOverdueDaysChange,
  currency,
  onCurrencyChange,
  isBackingUp,
  onBackup,
}) => {
  return (
    <div className="space-y-4 outline-none">
      {/* Business Mode Section */}
      <Card className="rounded-md">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Business Preferences</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Customize features for small business usage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
              <Label htmlFor="business-mode" className="text-sm font-semibold">Business Mode</Label>
              <p className="text-[11px] text-muted-foreground">
                Enable tax tracking, invoices, and reimbursable expenses.
              </p>
            </div>
            <Switch
              id="business-mode"
              checked={isBusinessMode}
              onCheckedChange={onBusinessToggle}
              className="transition-all duration-300 scale-90"
              title="Toggle Business Mode"
              aria-label="Toggle Business Mode"
            />
          </div>
          {isBusinessMode && (
            <div className="flex items-center justify-between space-x-2 border-t pt-4 mt-4">
              <div className="space-y-1">
                <Label htmlFor="auto-add-parties" className="text-sm font-semibold">Auto-Add Customers to Parties</Label>
                <p className="text-[11px] text-muted-foreground">
                  Automatically save new customer details to the Parties directory when creating an invoice.
                </p>
              </div>
              <Switch
                id="auto-add-parties"
                checked={autoAddParties}
                onCheckedChange={onAutoAddPartiesToggle}
                className="transition-all duration-300 scale-90"
                title="Toggle Auto-Add Customers"
                aria-label="Toggle Auto-Add Customers"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* System-wide Overdue Threshold Settings */}
      <Card className="rounded-md">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <CardTitle className="text-base">Payment Terms & Overdue Threshold</CardTitle>
          </div>
          <CardDescription className="text-xs">
            System-wide rule for automatic overdue calculation on unpaid bills & invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            <Label htmlFor="overdue-threshold" className="text-xs font-semibold">Overdue Period (Days)</Label>
            <Select
              value={overdueDays.toString()}
              onValueChange={onOverdueDaysChange}
            >
              <SelectTrigger id="overdue-threshold" className="h-8 text-xs">
                <SelectValue placeholder="Select Overdue Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days (Weekly)</SelectItem>
                <SelectItem value="15">15 Days (Net 15)</SelectItem>
                <SelectItem value="30">30 Days (Net 30)</SelectItem>
                <SelectItem value="45">45 Days (Net 45)</SelectItem>
                <SelectItem value="60">60 Days (Net 60)</SelectItem>
                <SelectItem value="90">90 Days (Quarterly)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Unpaid bills and invoices older than <span className="font-bold text-slate-700 dark:text-slate-200">{overdueDays} days</span> are automatically classified as Overdue across Purchases, Sales, and Reports.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Currency Section */}
      <Card className="rounded-md">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Regional Settings</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Set your currency and locale preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            <Label htmlFor="currency" className="text-xs">Currency</Label>
            <Select
              value={currency.code}
              onValueChange={(val) => {
                const selected = CURRENCIES.find((c) => c.code === val);
                if (selected) onCurrencyChange(selected);
              }}
            >
              <SelectTrigger id="currency" className="h-8 text-xs">
                <SelectValue placeholder="Select Currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name} ({c.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Backup Section */}
      <Card className="rounded-md">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Data Backup</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Download a complete backup of all your data.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">
                Export expenses, sales, purchases, lent/borrowed money, and more.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={isBackingUp} className="ml-4" size="sm">
                  {isBackingUp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Backing up...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Data
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onBackup("json")}>
                  <FileJson className="mr-2 h-4 w-4" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBackup("csv")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export as CSV (Excel)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
