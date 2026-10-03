import React from "react";
import { UploadCloud, Sparkles, FileImage, FileText, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PurchaseScannerDropzoneProps {
    fileInputRef: React.RefObject<HTMLInputElement>;
    pdfInputRef: React.RefObject<HTMLInputElement>;
    cameraInputRef: React.RefObject<HTMLInputElement>;
    processFile: (file: File) => void;
    handleDrop: (e: React.DragEvent) => void;
    handleLoadSampleBill: () => void;
}

export const PurchaseScannerDropzone = ({
    fileInputRef,
    pdfInputRef,
    cameraInputRef,
    processFile,
    handleDrop,
    handleLoadSampleBill,
}: PurchaseScannerDropzoneProps) => {
    return (
        <>
            {/* Hidden File Inputs */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        processFile(e.target.files[0]);
                    }
                }}
            />
            <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        processFile(e.target.files[0]);
                    }
                }}
            />
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        processFile(e.target.files[0]);
                    }
                }}
            />

            {/* Dropzone container */}
            <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-border/80 hover:border-violet-500/60 bg-muted/20 hover:bg-violet-500/5 rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-inner">
                    <UploadCloud className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">
                        Drag & drop your purchase bill (PDF or Image), or{" "}
                        <span className="text-violet-600 dark:text-violet-400 underline">browse</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                        Supports digital PDF invoices (up to 20MB), scanned receipts, JPG, PNG & WEBP photos
                    </p>
                </div>

                {/* Dedicated Action Buttons */}
                <div className="flex items-center justify-center flex-wrap gap-2.5 pt-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => pdfInputRef.current?.click()}
                        className="h-8 text-xs font-bold gap-1.5 border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 hover:bg-red-500/20 shadow-xs transition-all"
                    >
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        <span>Upload PDF Invoice</span>
                    </Button>

                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 text-xs font-semibold gap-1.5 bg-background border shadow-xs"
                    >
                        <FileImage className="w-3.5 h-3.5 text-violet-500" />
                        <span>Upload Photo / Image</span>
                    </Button>

                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => cameraInputRef.current?.click()}
                        className="h-8 text-xs font-semibold gap-1.5 bg-background border shadow-xs hidden sm:inline-flex"
                    >
                        <Camera className="w-3.5 h-3.5 text-violet-500" />
                        <span>Take Photo</span>
                    </Button>

                    <span className="text-xs text-muted-foreground hidden sm:inline">or</span>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleLoadSampleBill}
                        className="h-8 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
                    >
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        <span>Try Sample GST Bill</span>
                    </Button>
                </div>
            </div>
        </>
    );
};
