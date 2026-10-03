import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCheck, Check } from "lucide-react";

export interface SaleOrderCustomerSectionProps {
    customerName: string;
    setCustomerName: (val: string) => void;
    customerPhone: string;
    setCustomerPhone: (val: string) => void;
    customerGstin: string;
    setCustomerGstin: (val: string) => void;
    partiesCount: number;
    filteredParties: any[];
    isPartyDropdownOpen: boolean;
    setIsPartyDropdownOpen: (open: boolean) => void;
    partyDropdownRef: React.RefObject<HTMLDivElement | null>;
    handleSelectParty: (party: any) => void;
}

export const SaleOrderCustomerSection: React.FC<SaleOrderCustomerSectionProps> = ({
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    customerGstin,
    setCustomerGstin,
    partiesCount,
    filteredParties,
    isPartyDropdownOpen,
    setIsPartyDropdownOpen,
    partyDropdownRef,
    handleSelectParty,
}) => {
    return (
        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Searchable Customer Name Input */}
                <div className="relative space-y-1.5 md:col-span-1" ref={partyDropdownRef as any}>
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Customer Name <span className="text-rose-500">*</span>
                        </Label>
                        {partiesCount > 0 && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                {partiesCount} parties
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <Input
                            placeholder="Type or click to select party..."
                            value={customerName}
                            onChange={(e) => {
                                setCustomerName(e.target.value);
                                setIsPartyDropdownOpen(true);
                            }}
                            onFocus={() => setIsPartyDropdownOpen(true)}
                            className="h-9 text-xs pr-8 font-medium bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            required
                        />
                        <UserCheck className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>

                    {/* Party Suggestions Dropdown */}
                    {isPartyDropdownOpen && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1 divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredParties.length > 0 ? (
                                filteredParties.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => handleSelectParty(p)}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors flex items-center justify-between group"
                                    >
                                        <div>
                                            <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                                {p.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                {p.phone && <span>Ph: {p.phone}</span>}
                                                {p.gstin && <span>GST: {p.gstin}</span>}
                                                {p.type && (
                                                    <span className="capitalize px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-medium text-slate-600 dark:text-slate-300">
                                                        {p.type}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {customerName.trim().toLowerCase() === (p.name || "").trim().toLowerCase() && (
                                            <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="p-3 text-center text-xs text-slate-400">
                                    No matching parties. New party "{customerName}" will be used.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number</Label>
                    <Input
                        placeholder="Customer phone number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="h-9 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Customer GSTIN</Label>
                    <Input
                        placeholder="GSTIN (Optional)"
                        value={customerGstin}
                        onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                        className="h-9 text-xs font-mono bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                </div>
            </div>
        </div>
    );
};
