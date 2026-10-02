import React from "react";
import { UploadCloud, Download } from "lucide-react";

interface SelectModeViewProps {
    onSelectMode: (mode: "import" | "export") => void;
}

export const SelectModeView: React.FC<SelectModeViewProps> = ({ onSelectMode }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Import Card */}
            <button
                type="button"
                onClick={() => onSelectMode("import")}
                className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.08)] hover:scale-[1.02] transition-all duration-300 group"
            >
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5 group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Import from Excel</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[220px] leading-relaxed">
                    Upload a spreadsheet file to add new products or update stock quantities in bulk.
                </p>
            </button>

            {/* Export Card */}
            <button
                type="button"
                onClick={() => onSelectMode("export")}
                className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-[0_0_25px_rgba(59,130,246,0.08)] hover:scale-[1.02] transition-all duration-300 group"
            >
                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-5 group-hover:scale-110 transition-transform duration-300">
                    <Download className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Export to Excel</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[220px] leading-relaxed">
                    Download all existing inventory products and prices as an Excel sheet.
                </p>
            </button>
        </div>
    );
};
