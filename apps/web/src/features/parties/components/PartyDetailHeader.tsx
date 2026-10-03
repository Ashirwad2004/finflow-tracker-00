import React from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ArrowLeft,
    ArrowDownLeft,
    ArrowUpRight,
    Plus,
    Download,
    Eye,
    MoreVertical,
    FileSpreadsheet,
    FileText,
    Edit,
    Trash2,
    Phone,
    Mail,
    MapPin,
} from "lucide-react";
import { Party } from "../types";
import { PartyLedgerMetrics } from "../lib/partyLedgerCalculations";

interface PartyDetailHeaderProps {
    activeParty: Party;
    activePartyMetrics: PartyLedgerMetrics;
    onBackToList: () => void;
    onOpenPayment: (type: "in" | "out") => void;
    onCreateInvoice: (party: Party) => void;
    onCreatePurchase: (party: Party) => void;
    onExportExcelStatement: (party: Party) => void;
    onExportPDFStatement: (party: Party) => void;
    onNavigateLedger: (partyName: string) => void;
    onEditParty: (party: Party) => void;
    onDeleteParty: (party: Party) => void;
    formatCurrency: (amount: number) => string;
}

export const PartyDetailHeader: React.FC<PartyDetailHeaderProps> = ({
    activeParty,
    activePartyMetrics,
    onBackToList,
    onOpenPayment,
    onCreateInvoice,
    onCreatePurchase,
    onExportExcelStatement,
    onExportPDFStatement,
    onNavigateLedger,
    onEditParty,
    onDeleteParty,
    formatCurrency,
}) => {
    const getInitials = (name: string) => {
        return name.substring(0, 2).toUpperCase() || 'NA';
    };

    return (
        <div className="p-3 sm:p-3.5 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-2">
            {/* Top Row: Identity & Clean Button Group */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    {/* Mobile Back Arrow */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBackToList}
                        className="md:hidden h-8 w-8 p-0 shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>

                    <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                            activeParty.type === 'customer'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                                : activeParty.type === 'vendor'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                        }`}
                    >
                        {getInitials(activeParty.name)}
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                                {activeParty.name}
                            </h3>
                            <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0 ${
                                    activeParty.type === 'customer'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                        : activeParty.type === 'vendor'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                                        : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                                }`}
                            >
                                {activeParty.type}
                            </span>

                            {activePartyMetrics.receivable > activePartyMetrics.payable ? (
                                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 shrink-0">
                                    To Collect: {formatCurrency(activePartyMetrics.receivable - activePartyMetrics.payable)}
                                </span>
                            ) : activePartyMetrics.payable > activePartyMetrics.receivable ? (
                                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 shrink-0">
                                    To Pay: {formatCurrency(activePartyMetrics.payable - activePartyMetrics.receivable)}
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0">
                                    Settled
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons (Clean & Proportional - Never Overflowing) */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {/* Payment In (Customer Collection / Advance Receipt) */}
                    {activeParty.type !== 'vendor' && (
                        <Button
                            size="sm"
                            onClick={() => onOpenPayment("in")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs h-8 px-2.5 flex items-center gap-1"
                            title={`Record Payment In / Collection from ${activeParty.name}`}
                        >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>+ Payment In</span>
                        </Button>
                    )}

                    {/* Payment Out (Supplier Disbursement / Advance Payment) */}
                    {activeParty.type !== 'customer' && (
                        <Button
                            size="sm"
                            onClick={() => onOpenPayment("out")}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs h-8 px-2.5 flex items-center gap-1"
                            title={`Record Payment Out / Disbursement to ${activeParty.name}`}
                        >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>+ Payment Out</span>
                        </Button>
                    )}

                    {/* Primary New Document */}
                    {activeParty.type !== 'vendor' ? (
                        <Button
                            size="sm"
                            onClick={() => onCreateInvoice(activeParty)}
                            className="bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-xs h-8 px-2.5 flex items-center gap-1"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>New Invoice</span>
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={() => onCreatePurchase(activeParty)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs h-8 px-2.5 flex items-center gap-1"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>New Purchase</span>
                        </Button>
                    )}

                    {/* Statement Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 px-2 text-xs font-semibold flex items-center gap-1">
                                <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                                <span>Statement</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 shadow-lg">
                            <DropdownMenuItem onClick={() => onExportExcelStatement(activeParty)} className="cursor-pointer flex items-center gap-2 py-2 text-xs">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                <span>Excel Statement (.xlsx)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onExportPDFStatement(activeParty)} className="cursor-pointer flex items-center gap-2 py-2 text-xs">
                                <FileText className="w-4 h-4 text-rose-600" />
                                <span>PDF Statement (.pdf)</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Detailed Ledger Direct Link */}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigateLedger(activeParty.name)}
                        className="h-8 px-2.5 text-xs font-semibold flex items-center gap-1 text-primary border-primary/30 hover:bg-primary/5"
                        title="View verified CA detailed ledger"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ledger</span>
                    </Button>

                    {/* More Menu for Edit, Secondary Actions, Delete */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" title="More options">
                                <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 shadow-lg text-xs">
                            {activeParty.type === 'both' && (
                                <DropdownMenuItem onClick={() => onCreatePurchase(activeParty)} className="cursor-pointer py-2">
                                    <Plus className="w-3.5 h-3.5 mr-2 text-indigo-600" />
                                    <span>New Purchase Bill</span>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => onEditParty(activeParty)} className="cursor-pointer py-2">
                                <Edit className="w-3.5 h-3.5 mr-2 text-slate-600" />
                                <span>Edit Party</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDeleteParty(activeParty)} className="cursor-pointer py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                                <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-600" />
                                <span>Delete Party</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Sub-Bar: Clean Contact Chips & Opening Balance */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                {activeParty.phone && (
                    <a
                        href={`tel:${activeParty.phone}`}
                        className="flex items-center gap-1 hover:text-primary transition-colors text-[11px]"
                        title="Call party"
                    >
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{activeParty.phone}</span>
                    </a>
                )}
                {activeParty.email && (
                    <a
                        href={`mailto:${activeParty.email}`}
                        className="flex items-center gap-1 hover:text-primary transition-colors text-[11px]"
                        title="Email party"
                    >
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[150px]">{activeParty.email}</span>
                    </a>
                )}
                {activeParty.gst_number && (
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-700 dark:text-slate-300">
                        GSTIN: {activeParty.gst_number}
                    </span>
                )}
                {activeParty.opening_balance !== undefined && Number(activeParty.opening_balance) > 0 && (
                    <span
                        className={`inline-flex items-center gap-1 font-mono px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            (activeParty.opening_balance_type ? activeParty.opening_balance_type === 'to_receive' : activeParty.type !== 'vendor')
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}
                    >
                        Opening: {formatCurrency(Number(activeParty.opening_balance))} (
                        {(activeParty.opening_balance_type ? activeParty.opening_balance_type === 'to_receive' : activeParty.type !== 'vendor')
                            ? 'To Receive / Dr'
                            : 'To Pay / Cr'}
                        )
                    </span>
                )}
                {activeParty.address && (
                    <span className="flex items-center gap-1 text-slate-500 text-[11px]" title={activeParty.address}>
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px] sm:max-w-[240px]">{activeParty.address}</span>
                    </span>
                )}
            </div>
        </div>
    );
};
