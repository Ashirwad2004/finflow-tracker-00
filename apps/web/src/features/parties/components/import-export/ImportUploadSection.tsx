import React from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, Info, Download } from "lucide-react";

interface ImportUploadSectionProps {
    isDragActive: boolean;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleDrag: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDownloadTemplate: () => void;
}

export const ImportUploadSection: React.FC<ImportUploadSectionProps> = ({
    isDragActive,
    fileInputRef,
    handleDrag,
    handleDrop,
    handleFileChange,
    handleDownloadTemplate,
}) => {
    return (
        <div className="space-y-4 py-2">
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                    isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-primary/50"
                }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                    <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                    <p className="font-bold text-base text-foreground">
                        Click to upload or drag & drop customer / vendor spreadsheet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) up to 50,000 records
                    </p>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-8 font-semibold gap-1.5 rounded-xl">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Browse Computer
                </Button>
            </div>

            {/* Template Download Prompt */}
            <div className="bg-slate-100/80 dark:bg-slate-800/60 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">
                        Need the standard format? Download our pre-styled template with sample Indian business parties.
                    </span>
                </div>
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleDownloadTemplate}
                    className="h-7 text-xs font-bold shrink-0 gap-1 rounded-lg"
                >
                    <Download className="w-3 h-3" />
                    Download Template
                </Button>
            </div>
        </div>
    );
};
