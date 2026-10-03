import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface ImportCompleteSectionProps {
    importResults: {
        created: number;
        updated: number;
        skipped: number;
        failed: number;
    };
    onDone: () => void;
}

export function ImportCompleteSection({
    importResults,
    onDone,
}: ImportCompleteSectionProps) {
    return (
        <div className="space-y-5 py-6 max-w-lg mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
                <h3 className="font-bold text-lg text-foreground">
                    Import Completed Successfully!
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                    Your party master directory and accounting ledgers have been updated.
                </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Created</p>
                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {importResults.created}
                    </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Merged</p>
                    <p className="text-xl font-black text-blue-700 dark:text-blue-400 mt-0.5">
                        {importResults.updated}
                    </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Skipped</p>
                    <p className="text-xl font-black text-slate-700 dark:text-slate-300 mt-0.5">
                        {importResults.skipped}
                    </p>
                </div>
            </div>

            <Button
                onClick={onDone}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 rounded-xl"
            >
                Done &bull; View Party Directory
            </Button>
        </div>
    );
}
