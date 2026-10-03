import React from "react";
import { UploadCloud, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadDropzoneViewProps {
    fileInputRef: React.RefObject<HTMLInputElement>;
    isDragActive: boolean;
    onDrag: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDownloadTemplate: () => void;
}

export const UploadDropzoneView: React.FC<UploadDropzoneViewProps> = ({
    fileInputRef,
    isDragActive,
    onDrag,
    onDrop,
    onFileChange,
    onDownloadTemplate,
}) => {
    return (
        <div className="space-y-6">
            {/* Template Download Card */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-emerald-600" />
                        Need the standard format template?
                    </h4>
                    <p className="text-xs text-slate-500">
                        Download our sample template containing the correct columns and mock items.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onDownloadTemplate}
                    className="gap-2 shrink-0"
                >
                    <Download className="w-4 h-4" />
                    Download Template
                </Button>
            </div>

            {/* Dropzone */}
            <div
                onDragEnter={onDrag}
                onDragOver={onDrag}
                onDragLeave={onDrag}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 ${
                    isDragActive
                        ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10 scale-[0.99]"
                        : "border-slate-300 hover:border-emerald-400 dark:border-slate-700 bg-white dark:bg-slate-950"
                }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={onFileChange}
                    className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600">
                    <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Drag & drop your Excel or CSV file here
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        or click to browse from folders
                    </p>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded">
                    XLSX, XLS, CSV Supported
                </span>
            </div>
        </div>
    );
};
