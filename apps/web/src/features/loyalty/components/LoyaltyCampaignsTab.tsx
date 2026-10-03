import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Info, Loader2 } from "lucide-react";
import { CampaignTemplate, CustomerLoyaltyData, LoyaltyConfig, Segment } from "../types";

interface LoyaltyCampaignsTabProps {
  campaignTemplates: CampaignTemplate[];
  selectedTemplate: number;
  setSelectedTemplate: (idx: number) => void;
  customPromoCode: string;
  setCustomPromoCode: (code: string) => void;
  config: LoyaltyConfig;
  selectedSegment: Segment;
  setSelectedSegment: (segment: Segment) => void;
  filteredCustomers: CustomerLoyaltyData[];
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAllVisible: () => void;
  bulkSending: boolean;
  bulkProgress: { sent: number; total: number };
  handleBulkSend: () => void;
  handleSendWhatsApp: (customerName: string, phone: string, points: number) => void;
}

export function LoyaltyCampaignsTab({
  campaignTemplates,
  selectedTemplate,
  setSelectedTemplate,
  customPromoCode,
  setCustomPromoCode,
  config,
  selectedSegment,
  setSelectedSegment,
  filteredCustomers,
  selectedIds,
  toggleSelect,
  toggleSelectAllVisible,
  bulkSending,
  bulkProgress,
  handleBulkSend,
  handleSendWhatsApp,
}: LoyaltyCampaignsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-4 lg:col-span-1">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm space-y-5">
          <h3 className="text-xs font-semibold">1. Select Campaign</h3>

          <div className="space-y-2.5">
            {campaignTemplates.map((tpl, i) => (
              <button
                key={i}
                onClick={() => setSelectedTemplate(i)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  selectedTemplate === i
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-slate-200 hover:border-slate-400 bg-card"
                }`}
              >
                <div className="font-semibold text-[11px] text-foreground mb-1 flex items-center gap-1.5">
                  <tpl.icon className="w-3.5 h-3.5 text-primary" />
                  {tpl.title}
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                  {tpl.getBody("Customer Name", 150, 150)}
                </p>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t space-y-3">
            <h3 className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Campaign Variables</h3>
            <div>
              <label className="text-[10px] text-slate-500 font-medium mb-1 block">Custom Promo Code (Optional)</label>
              <Input
                value={customPromoCode}
                onChange={(e) => setCustomPromoCode(e.target.value)}
                className="h-8 text-[11px] rounded-lg"
              />
            </div>
          </div>

          <div className="bg-violet-500/5 p-3 rounded-lg border border-violet-500/10 flex items-start gap-2.5">
            <Info className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Messages open directly in WhatsApp web/app using each customer's saved contact number.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-semibold">2. Target Audience</h3>
            <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border gap-1">
              {[
                { id: "all", label: "All Customers" },
                { id: "vip", label: "VIP Gold" },
                { id: "slipping", label: "Inactive (30d+)" },
                { id: "new", label: "New (7d)" },
              ].map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => setSelectedSegment(seg.id as Segment)}
                  className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-md transition-all ${
                    selectedSegment === seg.id
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {seg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 rounded-xl">
            <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide">
              Live Template Message Preview
            </span>
            <p className="mt-2 text-[11px] text-slate-700 dark:text-slate-300 font-sans italic whitespace-pre-line leading-relaxed">
              "{campaignTemplates[selectedTemplate].getBody("Amit Kumar", 350, 350 * config.pointValue)}"
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-500">
              {filteredCustomers.length} customer{filteredCustomers.length === 1 ? "" : "s"} in this segment
              {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
            </p>
            <Button
              size="sm"
              disabled={selectedIds.size === 0 || bulkSending}
              onClick={handleBulkSend}
              className="h-7 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
            >
              {bulkSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Sending {bulkProgress.sent}/{bulkProgress.total}
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Send to Selected
                </>
              )}
            </Button>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[300px] overscroll-contain">
              <table className="w-full text-left text-[11px]">
                <thead className="text-[10px] font-semibold uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 tracking-wide sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 w-8">
                      <Checkbox
                        checked={filteredCustomers.length > 0 && filteredCustomers.every((c) => selectedIds.has(c.id))}
                        onCheckedChange={toggleSelectAllVisible}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-4 py-2.5">Recipient</th>
                    <th className="px-4 py-2.5">Phone</th>
                    <th className="px-4 py-2.5">Wallet</th>
                    <th className="px-4 py-2.5 text-right">Dispatch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No customers match this target segment.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2.5">
                          <Checkbox
                            checked={selectedIds.has(c.id)}
                            onCheckedChange={() => toggleSelect(c.id)}
                            aria-label={`Select ${c.name}`}
                          />
                        </td>
                        <td className="px-4 py-2.5 font-medium">{c.name}</td>
                        <td className="px-4 py-2.5 text-slate-500">{c.phone || "No Phone"}</td>
                        <td className="px-4 py-2.5 font-semibold text-violet-600 dark:text-violet-400">{c.points} pts</td>
                        <td className="px-4 py-2.5 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleSendWhatsApp(c.name, c.phone || "", c.points)}
                            className="h-7 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px]"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Send
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
