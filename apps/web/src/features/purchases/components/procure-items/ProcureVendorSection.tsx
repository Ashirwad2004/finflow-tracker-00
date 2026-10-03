import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ProcureVendorSectionProps {
  parties: any[];
  vendorId: string;
  vendorName: string;
  vendorPhone: string;
  vendorGstin: string;
  orderDate: string;
  expectedDeliveryDate: string;
  onVendorSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onVendorNameChange: (val: string) => void;
  onVendorPhoneChange: (val: string) => void;
  onVendorGstinChange: (val: string) => void;
  onOrderDateChange: (val: string) => void;
  onExpectedDeliveryDateChange: (val: string) => void;
}

export const ProcureVendorSection: React.FC<ProcureVendorSectionProps> = ({
  parties,
  vendorId,
  vendorName,
  vendorPhone,
  vendorGstin,
  orderDate,
  expectedDeliveryDate,
  onVendorSelect,
  onVendorNameChange,
  onVendorPhoneChange,
  onVendorGstinChange,
  onOrderDateChange,
  onExpectedDeliveryDateChange,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
      <div className="space-y-1.5 md:col-span-1">
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Supplier / Vendor <span className="text-rose-500">*</span>
        </Label>
        {parties.length > 0 && (
          <select
            onChange={onVendorSelect}
            className="w-full text-xs h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 mb-1"
            value={vendorId}
          >
            <option value="">-- Choose Existing Supplier --</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.phone ? `(${p.phone})` : ""}
              </option>
            ))}
          </select>
        )}
        <Input
          placeholder="Enter or select supplier"
          value={vendorName}
          onChange={(e) => onVendorNameChange(e.target.value)}
          className="h-9 text-xs"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Supplier Phone &amp; GSTIN
        </Label>
        <Input
          placeholder="Supplier Phone"
          value={vendorPhone}
          onChange={(e) => onVendorPhoneChange(e.target.value)}
          className="h-9 text-xs mb-1"
        />
        <Input
          placeholder="Supplier GSTIN"
          value={vendorGstin}
          onChange={(e) => onVendorGstinChange(e.target.value.toUpperCase())}
          className="h-9 text-xs font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Procurement Schedule
        </Label>
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
