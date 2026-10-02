import React from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle, Check } from "lucide-react";
import { PlannedActions } from "./ImportValidationPreviewSection";

interface ImportConfirmSectionProps {
    plannedActions: PlannedActions;
    onBackToPreview: () => void;
    onExecuteImport: () => void;
}

export const ImportConfirmSection: React.FC<ImportConfirmSectionProps> = ({
    plannedActions,
    onBackToPreview,
    onExecuteImport,
}) => {
    return (
        <div className="space-y-4 py-2">
            <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-foreground">
                            Ready to Save to Directory
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Here is a summary of what will be added or updated in your directory:
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase">New Parties</p>
                        <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                            +{plannedActions.toCreate}
                        </p>
                        <p className="text-[10px] text-emerald-600/80 mt-0.5">Will be created</p>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl">
                        <p className="text-[10px] font-bold text-blue-600 uppercase">Existing Parties</p>
                        <p className="text-xl font-black text-blue-700 dark:text-blue-400 mt-0.5">
                            ~{plannedActions.toMerge}
                        </p>
                        <p className="text-[10px] text-blue-600/80 mt-0.5">Will be merged</p>
                    </div>

                    <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Skipped Rows</p>
                        <p className="text-xl font-black text-slate-700 dark:text-slate-300 mt-0.5">
                            {plannedActions.toSkip}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Ignored duplicates</p>
                    </div>

                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl">
                        <p className="text-[10px] font-bold text-rose-600 uppercase">Excluded Errors</p>
                        <p className="text-xl font-black text-rose-700 dark:text-rose-400 mt-0.5">
                            {plannedActions.excludedErrors}
                        </p>
                        <p className="text-[10px] text-rose-600/80 mt-0.5">Will not be imported</p>
                    </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                        <strong>Safe & Protected:</strong> Only clean, verified records will be added to your directory. Existing party data is kept safe, and invalid error rows will not be saved.
                    </span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBackToPreview}
                    className="text-xs rounded-xl"
                >
                    &larr; Back to Adjustments
                </Button>
                <Button
                    size="sm"
                    onClick={onExecuteImport}
                    className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl gap-1.5 px-5"
                >
                    <Check className="w-4 h-4" />
                    Confirm & Execute Import
                </Button>
            </div>
        </div>
    );
};
