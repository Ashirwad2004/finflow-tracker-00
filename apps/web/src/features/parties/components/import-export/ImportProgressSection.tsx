import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ImportProgressSectionProps {
    currentImportIndex: number;
    totalCount: number;
}

export function ImportProgressSection({
    currentImportIndex,
    totalCount,
}: ImportProgressSectionProps) {
    const denominator = Math.max(1, totalCount);
    const percentage = Math.round((currentImportIndex / denominator) * 100);

    return (
        <div className="space-y-4 py-8 max-w-md mx-auto text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
                <h3 className="font-bold text-base text-foreground">
                    Importing Parties to Directory...
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                    Writing records safely to offline storage and queuing cloud synchronization.
                </p>
            </div>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Progress</span>
                    <span>
                        {currentImportIndex} / {totalCount} ({percentage}%)
                    </span>
                </div>
                <Progress
                    value={percentage}
                    className="h-2.5"
                />
            </div>
        </div>
    );
}
