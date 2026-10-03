import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PoVendorFieldsProps {
  vendorName: string;
  onVendorNameChange: (val: string) => void;
  vendorPhone: string;
  onVendorPhoneChange: (val: string) => void;
  vendorGstin: string;
  onVendorGstinChange: (val: string) => void;
  orderDate: string;
  onOrderDateChange: (val: string) => void;
  expectedDeliveryDate: string;
  onExpectedDeliveryDateChange: (val: string) => void;
  parties?: any[];
  onVendorSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const PoVendorFields: React.FC<PoVendorFieldsProps> = ({
  vendorName,
  onVendorNameChange,
  vendorPhone,
  onVendorPhoneChange,
  vendorGstin,
  onVendorGstinChange,
  orderDate,
  onOrderDateChange,
  expectedDeliveryDate,
  onExpectedDeliveryDateChange,
  parties = [],
  onVendorSelect,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
      <div className="space-y-1.5 md:col-span-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Supplier / Vendor <span className="text-rose-500">*</span>
          </Label>
          {parties.length > 0 && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              or quick-select:
            </span>
          )}
        </div>
        {parties.length > 0 && (
          <select
            onChange={onVendorSelect}
            className="w-full text-xs h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 mb-1"
            defaultValue=""
          >
            <option value="" disabled>-- Select Existing Supplier --</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.phone ? `(${p.phone})` : ""}
              </option>
            ))}
          </select>
        )}
        <Input
          placeholder="Enter or select vendor name"
          value={vendorName}
          onChange={(e) => onVendorNameChange(e.target.value)}
          className="h-9 text-xs"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Contact & GSTIN</Label>
        <Input
          placeholder="Phone number"
          value={vendorPhone}
          onChange={(e) => onVendorPhoneChange(e.target.value)}
          className="h-9 text-xs mb-1"
        />
        <Input
          placeholder="Vendor GSTIN (Optional)"
          value={vendorGstin}
          onChange={(e) => onVendorGstinChange(e.target.value.toUpperCase())}
          className="h-9 text-xs font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Timeline</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-slate-400">PO Date</span>
            <Input
              type="date"
              value={orderDate}
              onChange={(e) => onOrderDateChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400">Expected Delivery</span>
            <Input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => onExpectedDeliveryDateChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
