import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Truck } from "lucide-react";

export interface SaleOrderTimelineSectionProps {
    orderDate: string;
    setOrderDate: (date: string) => void;
    expectedDeliveryDate: string;
    setExpectedDeliveryDate: (date: string) => void;
    deliveryGapDays: number | null;
    setPresetDeliveryDays: (days: number) => void;
}

export const SaleOrderTimelineSection: React.FC<SaleOrderTimelineSectionProps> = ({
    orderDate,
    setOrderDate,
    expectedDeliveryDate,
    setExpectedDeliveryDate,
    deliveryGapDays,
    setPresetDeliveryDays,
}) => {
    return (
        <div className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Order & Expected Delivery Timeline
                    </h4>
                </div>
                {deliveryGapDays !== null && (
                    <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                            deliveryGapDays < 0
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                                : deliveryGapDays === 0
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                                : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/80 dark:text-indigo-300"
                        }`}
                    >
                        {deliveryGapDays < 0
                            ? "⚠️ Delivery before Order Date"
                            : deliveryGapDays === 0
                            ? "⚡ Same Day Delivery"
                            : `⏱️ ${deliveryGapDays} Day${deliveryGapDays > 1 ? "s" : ""} Delivery Lead Time`}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Order Booking Date</span>
                    </Label>
                    <Input
                        type="date"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        className="h-9 text-xs font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        required
                    />
                </div>

                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Expected Delivery Date</span>
                    </Label>
                    <Input
                        type="date"
                        value={expectedDeliveryDate}
                        onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                        className="h-9 text-xs font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mr-1 shrink-0">
                    Quick Presets:
                </span>
                {[
                    { label: "Today", days: 0 },
                    { label: "+3 Days", days: 3 },
                    { label: "+7 Days", days: 7 },
                    { label: "+14 Days", days: 14 },
                    { label: "+30 Days", days: 30 },
                ].map((preset) => (
                    <button
                        key={preset.days}
                        type="button"
                        onClick={() => setPresetDeliveryDays(preset.days)}
                        className="px-2.5 py-1 text-[10px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 dark:hover:bg-indigo-600 dark:hover:border-indigo-600 transition-all text-slate-600 dark:text-slate-300 shadow-xs shrink-0"
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
