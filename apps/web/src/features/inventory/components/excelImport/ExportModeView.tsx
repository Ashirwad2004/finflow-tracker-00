import React from "react";
import { FileSpreadsheet, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportModeViewProps {
    totalProductsCount: number;
    onExportProducts: () => void;
}

export const ExportModeView: React.FC<ExportModeViewProps> = ({
    totalProductsCount,
    onExportProducts,
}) => {
    return (
        <div className="space-y-6 py-2">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
                    <FileSpreadsheet className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                    <h4 className="text-xl font-bold text-slate-800 dark:text-white">
                        Export Inventory Products
                    </h4>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                        We compiled your entire product list. Click download below to get your Excel sheet.
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-950 border rounded-xl py-3 px-6 inline-flex items-center gap-6 font-semibold text-slate-700 dark:text-slate-300">
                    <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Products</span>
                        <span className="text-lg text-slate-800 dark:text-white font-extrabold">{totalProductsCount}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                    <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Format</span>
                        <span className="text-lg text-slate-800 dark:text-white font-extrabold">Excel (.xlsx)</span>
                    </div>
                </div>
                
                <div className="max-w-xs mx-auto pt-2">
                    <Button
                        type="button"
                        onClick={onExportProducts}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 py-6 text-base shadow-lg shadow-blue-600/20 rounded-xl"
                    >
                        <Download className="w-5 h-5" />
                        Download Excel File
                    </Button>
                </div>
            </div>
            
            <div className="bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 flex gap-3 text-left">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                    <p className="font-semibold">Re-importing instructions</p>
                    <p className="leading-relaxed">
                        The exported template contains precise data configurations. You can safely add rows, edit product details or stock quantity, and upload this file back to sync and update existing inventory records.
                    </p>
                </div>
            </div>
        </div>
    );
};
