import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UploadCloud, Download, FileSpreadsheet } from "lucide-react";

interface PartySelectModeSectionProps {
    onSelectImport: () => void;
    onSelectExport: () => void;
    onDownloadTemplate: () => void;
    existingPartiesCount: number;
}

export function PartySelectModeSection({
    onSelectImport,
    onSelectExport,
    onDownloadTemplate,
    existingPartiesCount,
}: PartySelectModeSectionProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Import Option Card */}
            <div
                onClick={onSelectImport}
                className="group relative bg-card border-2 border-slate-200 dark:border-slate-800 hover:border-primary/60 dark:hover:border-primary/60 rounded-2xl p-6 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between space-y-4"
            >
                <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                                Bulk Import Parties
                            </h3>
                            <Badge
                                variant="outline"
                                className="text-[10px] font-bold border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                            >
                                Duplicate Protected
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            Import your customers and suppliers from Excel or CSV. Review columns, check for duplicate accounts, and preview everything before saving.
                        </p>
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                        Start Import &rarr;
                    </span>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDownloadTemplate();
                        }}
                        className="h-7 text-[11px] font-semibold gap-1 rounded-lg"
                    >
                        <Download className="w-3 h-3" />
                        Sample Template
                    </Button>
                </div>
            </div>

            {/* Export Option Card */}
            <div
                onClick={onSelectExport}
                className="group relative bg-card border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 rounded-2xl p-6 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between space-y-4"
            >
                <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-foreground group-hover:text-emerald-600 transition-colors">
                            Export Party Directory
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            Download your entire party register with balances, contact details, GST numbers, and ledger stats in Excel (.xlsx) or formatted PDF.
                        </p>
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        Configure & Export &rarr;
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                        {existingPartiesCount} Parties Active
                    </Badge>
                </div>
            </div>
        </div>
    );
}
