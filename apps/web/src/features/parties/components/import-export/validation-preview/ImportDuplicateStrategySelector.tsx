import React from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { RowResolutionAction } from "../../types/partyImportExportTypes";
import { ImportStats } from "./types";

interface ImportDuplicateStrategySelectorProps {
    stats: ImportStats;
    globalDuplicateAction: RowResolutionAction;
    onApplyGlobalDuplicateAction: (action: "merge" | "skip" | "create_new") => void;
}

export const ImportDuplicateStrategySelector: React.FC<ImportDuplicateStrategySelectorProps> = ({
    stats,
    globalDuplicateAction,
    onApplyGlobalDuplicateAction,
}) => {
    if (stats.duplicates <= 0) {
        return null;
    }

    return (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 p-3.5 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <p className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        How to Handle Existing Parties ({stats.duplicates} matched)
                    </p>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                        Choose how to handle parties that already exist in your directory. You can also change individual rows in the table below.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {(["merge", "skip", "create_new"] as const).map((strat) => (
                        <Button
                            key={strat}
                            size="sm"
                            variant={globalDuplicateAction === strat ? "default" : "outline"}
                            onClick={() => onApplyGlobalDuplicateAction(strat)}
                            className={`h-7 text-xs font-bold rounded-lg capitalize ${
                                globalDuplicateAction === strat
                                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                                    : "border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                            }`}
                        >
                            {strat === "merge" ? "Merge / Update" : strat === "skip" ? "Skip Duplicates" : "Create New"}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
};
