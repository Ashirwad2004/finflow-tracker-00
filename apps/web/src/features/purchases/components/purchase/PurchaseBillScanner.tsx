import {
    ExtractedPurchaseBill,
    PurchaseBillScannerProps,
    usePurchaseBillScanner,
    PurchaseScannerHeader,
    PurchaseScannerDropzone,
    PurchaseScannerProgress,
    PurchaseScannerResultPreview,
} from "./scanner";

export type { ExtractedPurchaseBill, PurchaseBillScannerProps };

export const PurchaseBillScanner = ({ onExtract, onClose }: PurchaseBillScannerProps) => {
    const {
        isScanning,
        scanProgressStage,
        imagePreview,
        fileMeta,
        extractedResult,
        fileInputRef,
        pdfInputRef,
        cameraInputRef,
        processFile,
        handleDrop,
        handleOneClickSave,
        handleReviewInForm,
        handleLoadSampleBill,
        resetScanner,
    } = usePurchaseBillScanner(onExtract);

    return (
        <div className="bg-card border-2 border-dashed border-violet-500/40 rounded-2xl p-5 shadow-md space-y-4 animate-in fade-in-0 zoom-in-98 duration-200">
            <PurchaseScannerHeader onClose={onClose} />

            {!isScanning && !extractedResult && (
                <PurchaseScannerDropzone
                    fileInputRef={fileInputRef}
                    pdfInputRef={pdfInputRef}
                    cameraInputRef={cameraInputRef}
                    processFile={processFile}
                    handleDrop={handleDrop}
                    handleLoadSampleBill={handleLoadSampleBill}
                />
            )}

            {isScanning && (
                <PurchaseScannerProgress
                    scanProgressStage={scanProgressStage}
                    fileMeta={fileMeta}
                    imagePreview={imagePreview}
                />
            )}

            {extractedResult && (
                <PurchaseScannerResultPreview
                    extractedResult={extractedResult}
                    onScanAnother={resetScanner}
                    onReviewInForm={handleReviewInForm}
                    onOneClickSave={handleOneClickSave}
                />
            )}
        </div>
    );
};

export default PurchaseBillScanner;
