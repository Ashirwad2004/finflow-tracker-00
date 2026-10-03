import { useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/core/hooks/use-toast";
import { offlineMutate } from "@/core/offline/apiService";
import { Product, ParsedProduct } from "./types";
import {
    downloadExcelTemplate,
    exportProductsToExcel,
    parseExcelFile,
} from "./excelUtils";

interface UseExcelImportProps {
    userId: string;
    existingProducts: Product[];
    onClose: () => void;
}

export function useExcelImport({ userId, existingProducts, onClose }: UseExcelImportProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [mode, setMode] = useState<"select" | "import" | "export">("select");
    const [file, setFile] = useState<File | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
    const [duplicateAction, setDuplicateAction] = useState<"skip" | "update">("skip");
    const [isImporting, setIsImporting] = useState(false);
    const [currentImportIndex, setCurrentImportIndex] = useState(0);

    const resetState = () => {
        setMode("select");
        setFile(null);
        setParsedProducts([]);
        setDuplicateAction("skip");
        setIsImporting(false);
        setCurrentImportIndex(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleClose = () => {
        if (isImporting) return;
        resetState();
        onClose();
    };

    const handleDownloadTemplate = () => {
        try {
            downloadExcelTemplate();
            toast({
                title: "Template Downloaded",
                description: "Open the downloaded Excel file to fill in your products.",
            });
        } catch (error) {
            console.error("Failed to generate template:", error);
            toast({
                title: "Template Generation Failed",
                description: "An error occurred while creating the template file.",
                variant: "destructive",
            });
        }
    };

    const handleExportProducts = () => {
        try {
            if (existingProducts.length === 0) {
                toast({
                    title: "No products to export",
                    description: "Your inventory is currently empty.",
                    variant: "destructive",
                });
                return;
            }

            exportProductsToExcel(existingProducts);
            toast({
                title: "Export Successful",
                description: `Successfully exported ${existingProducts.length} product(s) to Excel.`,
            });
        } catch (error) {
            console.error("Failed to export products:", error);
            toast({
                title: "Export Failed",
                description: "An error occurred while exporting inventory products.",
                variant: "destructive",
            });
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragActive(true);
        } else if (e.type === "dragleave") {
            setIsDragActive(false);
        }
    };

    const processFile = async (selectedFile: File) => {
        setFile(selectedFile);
        const result = await parseExcelFile(selectedFile, existingProducts);
        if (!result.success) {
            toast({
                title: result.errorType === "missing_headers" ? "Headers Missing" : "Parsing Error",
                description: result.errorMessage || "Failed to parse the file.",
                variant: "destructive",
            });
            resetState();
            return;
        }

        setParsedProducts(result.parsed);
        if (result.parsed.length === 0) {
            toast({
                title: "No Products Found",
                description: "Could not parse any valid product rows from the file.",
                variant: "destructive",
            });
            resetState();
        } else {
            toast({
                title: "File Parsed Successfully",
                description: `Found ${result.parsed.length} rows. Please review validation statuses below.`,
            });
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            const ext = droppedFile.name.split(".").pop()?.toLowerCase();
            if (ext === "xlsx" || ext === "xls" || ext === "csv") {
                processFile(droppedFile);
            } else {
                toast({
                    title: "Invalid File Type",
                    description: "Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.",
                    variant: "destructive",
                });
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (parsedProducts.length === 0) return;

        const hasErrors = parsedProducts.some((p) => p.status === "error");
        if (hasErrors) {
            toast({
                title: "Errors Detected",
                description: "Please fix the red-flagged rows in your Excel file or clear them before importing.",
                variant: "destructive",
            });
            return;
        }

        setIsImporting(true);
        setCurrentImportIndex(0);

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (let i = 0; i < parsedProducts.length; i++) {
            const item = parsedProducts[i];
            setCurrentImportIndex(i + 1);

            try {
                if (item.status === "duplicate" && duplicateAction === "skip") {
                    skipCount++;
                    continue;
                }

                if (item.status === "duplicate" && duplicateAction === "update") {
                    const existing = existingProducts.find(
                        (p) => p.name.toLowerCase() === item.name.toLowerCase()
                    );
                    if (existing) {
                        const recordPayload: Product = {
                            ...existing,
                            price: item.price,
                            cost_price: item.cost_price,
                            stock_quantity: item.stock_quantity,
                            unit: item.unit,
                            hsn_code: item.hsn_code || existing.hsn_code || "",
                            is_listed_online: item.is_listed_online,
                            online_description: item.online_description,
                            rack_location: item.rack_location || "",
                            updated_at: new Date().toISOString(),
                        };

                        await offlineMutate({
                            table: "products",
                            action: "update",
                            recordId: existing.id,
                            payload: recordPayload,
                            userId,
                        });
                        successCount++;
                        continue;
                    }
                }

                const recordId = uuidv4();
                const recordPayload: Product = {
                    id: recordId,
                    user_id: userId,
                    name: item.name,
                    price: item.price,
                    cost_price: item.cost_price,
                    stock_quantity: item.stock_quantity,
                    unit: item.unit,
                    hsn_code: item.hsn_code || "",
                    is_listed_online: item.is_listed_online,
                    online_description: item.online_description,
                    rack_location: item.rack_location || "",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                await offlineMutate({
                    table: "products",
                    action: "insert",
                    recordId,
                    payload: recordPayload,
                    userId,
                });
                successCount++;
            } catch (err) {
                console.error("Bulk Import Row Error:", item.name, err);
                errorCount++;
            }
        }

        setIsImporting(false);
        queryClient.invalidateQueries({ queryKey: ["products", userId] });

        toast({
            title: "Import Finished",
            description: `Import details: ${successCount} imported/updated, ${skipCount} skipped, ${errorCount} errors.`,
        });

        handleClose();
    };

    const totalCount = parsedProducts.length;
    const errorCount = parsedProducts.filter((p) => p.status === "error").length;
    const duplicateCount = parsedProducts.filter((p) => p.status === "duplicate").length;
    const readyCount = parsedProducts.filter((p) => p.status === "ready").length;

    return {
        mode,
        setMode,
        file,
        isDragActive,
        parsedProducts,
        duplicateAction,
        setDuplicateAction,
        isImporting,
        currentImportIndex,
        fileInputRef,
        totalCount,
        errorCount,
        duplicateCount,
        readyCount,
        resetState,
        handleClose,
        handleDownloadTemplate,
        handleExportProducts,
        handleDrag,
        handleDrop,
        handleFileChange,
        handleImport,
    };
}
