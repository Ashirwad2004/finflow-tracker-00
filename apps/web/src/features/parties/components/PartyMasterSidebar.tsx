import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Plus, FileSpreadsheet } from "lucide-react";
import { Party } from "../types";
import { PartyLedgerMetrics } from "../lib/partyLedgerCalculations";

interface PartyMasterSidebarProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    filterType: string;
    setFilterType: (type: string) => void;
    isLoading: boolean;
    filteredParties: Party[];
    selectedPartyId: string | null;
    partyLedgerMap: Map<string, PartyLedgerMetrics>;
    onPartySelect: (partyId: string) => void;
    onAddClick: () => void;
    onOpenImportExport: () => void;
    formatCurrency: (amount: number) => string;
    showMobileDetail?: boolean;
    className?: string;
}

export const PartyMasterSidebar: React.FC<PartyMasterSidebarProps> = ({
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    isLoading,
    filteredParties,
    selectedPartyId,
    partyLedgerMap,
    onPartySelect,
    onAddClick,
    onOpenImportExport,
    formatCurrency,
    showMobileDetail,
    className,
}) => {
    const getInitials = (name: string) => {
        return name.substring(0, 2).toUpperCase() || 'NA';
    };

    return (
        <div className={`w-full md:w-80 lg:w-96 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden shrink-0 ${
            showMobileDetail ? "hidden md:flex" : "flex"
        } ${className || ""}`}>
            {/* Search & Filter Header */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
                <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Search by name, phone, GST..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                    {["All Types", "Customer", "Vendor", "Both"].map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setFilterType(type)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-all ${
                                filterType === type
                                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable Party Cards List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                {isLoading ? (
                    <div className="p-4 space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                                    <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredParties.length === 0 ? (
                    <div className="p-6 text-center flex flex-col items-center justify-center">
                        <Users className="w-8 h-8 mb-2 text-slate-300 dark:text-slate-700" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No parties found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try a different search, add a party or import from Excel.</p>
                        <div className="flex items-center gap-2 mt-2.5">
                            <Button
                                size="sm"
                                onClick={onAddClick}
                                className="text-xs h-7 bg-primary text-white"
                            >
                                <Plus className="w-3 h-3 mr-1" /> Add Party
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onOpenImportExport}
                                className="text-xs h-7 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            >
                                <FileSpreadsheet className="w-3 h-3 mr-1 text-emerald-600" /> Import
                            </Button>
                        </div>
                    </div>
                ) : (
                    filteredParties.map((party) => {
                        const metrics = partyLedgerMap.get(party.id);
                        const isSelected = party.id === selectedPartyId;
                        const receivable = metrics?.receivable || 0;
                        const payable = metrics?.payable || 0;

                        return (
                            <div
                                key={party.id}
                                onClick={() => onPartySelect(party.id)}
                                className={`p-2.5 transition-all cursor-pointer flex items-center justify-between gap-2.5 border-l-3 ${
                                    isSelected
                                        ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-primary shadow-xs"
                                        : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                }`}
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                        party.type === 'customer' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' :
                                        party.type === 'vendor' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                                        'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                    }`}>
                                        {getInitials(party.name)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                                                {party.name}
                                            </span>
                                            <span className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase tracking-wider shrink-0 ${
                                                party.type === 'customer' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' :
                                                party.type === 'vendor' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' :
                                                'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400'
                                            }`}>
                                                {party.type}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                            {party.phone || party.gst_number || `${metrics?.totalRecords || 0} records`}
                                        </div>
                                    </div>
                                </div>

                                {/* Balance Tag */}
                                <div className="text-right shrink-0">
                                    {receivable > 0 ? (
                                        <div>
                                            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 block">
                                                {formatCurrency(receivable)}
                                            </span>
                                            <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider">
                                                To Collect
                                            </span>
                                        </div>
                                    ) : payable > 0 ? (
                                        <div>
                                            <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 block">
                                                {formatCurrency(payable)}
                                            </span>
                                            <span className="text-[8px] font-bold text-rose-500 uppercase tracking-wider">
                                                To Pay
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded">
                                            Settled
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
