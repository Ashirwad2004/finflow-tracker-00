import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/core/hooks/use-toast";
import { offlineMutate } from "@/core/offline/apiService";
import {
    UploadCloud,
    Download,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    Info,
    Loader2,
    Check,
    X,
} from "lucide-react";

interface Product {
    id: string;
    user_id: string;
    name: string;
    price: number;
    cost_price: number;
    stock_quantity: number;
    unit: string;
    created_at: string;
    updated_at?: string;
    is_listed_online?: boolean;
    online_description?: string;
    image_url?: string;
}

interface ParsedProduct {
    name: string;
    price: number;
    cost_price: number;
    stock_quantity: number;
    unit: string;
    is_listed_online: boolean;
    online_description: string;
    status: "ready" | "duplicate" | "error";
    errorDetails?: string;
}

interface ExcelImportDialogProps {
    open: boolean;
    onClose: () => void;
    userId: string;
    existingProducts: Product[];
}

export function ExcelImportDialog({
    open,
    onClose,
    userId,
    existingProducts,
}: ExcelImportDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
    const [duplicateAction, setDuplicateAction] = useState<"skip" | "update">("skip");
    const [isImporting, setIsImporting] = useState(false);
    const [currentImportIndex, setCurrentImportIndex] = useState(0);

    const resetState = () => {
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

    // Download dynamic Excel Template
    const handleDownloadTemplate = () => {
        try {
            const headers = [
                [
                    "Product Name *",
                    "Selling Price *",
                    "Cost Price",
                    "Stock Quantity",
                    "Unit",
                    "List Online (yes/no)",
                    "Online Description",
                ],
            ];
            const samples = [
                [
                    "Aroma Organic Coffee Beans (500g)",
                    599,
                    450,
                    15,
                    "pack",
                    "yes",
                    "Rich organic roasted coffee beans.",
                ],
                [
                    "Premium Thermal Flask (750ml)",
                    1299,
                    900,
                    8,
                    "piece",
                    "yes",
                    "Stainless steel thermal insulated flask.",
                ],
                [
                    "Wireless Optical Mouse",
                    499,
                    250,
                    20,
                    "piece",
                    "no",
                    "Comfortable 2.4GHz wireless mouse.",
                ],
            ];
            const wsData = [...headers, ...samples];
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Add basic cell sizing styling for better look
            const wscols = [
                { wch: 35 }, // Product Name
                { wch: 15 }, // Selling Price
                { wch: 15 }, // Cost Price
                { wch: 15 }, // Stock Quantity
                { wch: 10 }, // Unit
                { wch: 22 }, // List Online
                { wch: 40 }, // Online Description
            ];
            ws["!cols"] = wscols;

            XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");
            XLSX.writeFile(wb, "products_import_template.xlsx");
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

    // Drag-and-drop handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragActive(true);
        } else if (e.type === "dragleave") {
            setIsDragActive(false);
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
                setFile(droppedFile);
                parseExcel(droppedFile);
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
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            parseExcel(selectedFile);
        }
    };

    // Excel Parsing & Validation Logic
    const parseExcel = (fileObj: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert sheet to JSON array (row by row)
                const rows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
                if (rows.length <= 1) {
                    toast({
                        title: "Empty File",
                        description: "No product data rows found in the uploaded file.",
                        variant: "destructive",
                    });
                    resetState();
                    return;
                }

                // Headers mapping
                const headers = rows[0].map((h: any) => String(h || "").trim().toLowerCase());
                
                // Helper to find header column indexes dynamically
                const findColIdx = (aliases: string[]) => {
                    return headers.findIndex((h: string) =>
                        aliases.includes(h) || aliases.some(alias => h.includes(alias))
                    );
                };

                const nameIdx = findColIdx(["product name", "item name", "name", "title"]);
                const priceIdx = findColIdx(["selling price", "price", "sale price", "mrp"]);
                const costIdx = findColIdx(["cost price", "cost", "purchase price"]);
                const stockIdx = findColIdx(["stock quantity", "stock", "quantity", "qty", "stock_quantity"]);
                const unitIdx = findColIdx(["unit", "uom"]);
                const onlineIdx = findColIdx(["list online", "listed online", "is listed online", "online"]);
                const descIdx = findColIdx(["online description", "description", "online_description", "details"]);

                if (nameIdx === -1 || priceIdx === -1) {
                    toast({
                        title: "Headers Missing",
                        description: "We couldn't locate required columns: Product Name and Selling Price. Please use our template.",
                        variant: "destructive",
                    });
                    resetState();
                    return;
                }

                const parsed: ParsedProduct[] = [];
                const sheetNamesSet = new Set<string>();

                // Parse records starting from row 1
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length === 0 || row.every((cell: any) => cell === null || cell === undefined || cell === "")) {
                        continue; // Skip completely empty rows
                    }

                    const rawName = String(row[nameIdx] || "").trim();
                    const rawPrice = row[priceIdx];
                    const rawCost = costIdx !== -1 ? row[costIdx] : undefined;
                    const rawStock = stockIdx !== -1 ? row[stockIdx] : undefined;
                    const rawUnit = unitIdx !== -1 ? String(row[unitIdx] || "").trim() : "pc";
                    const rawOnline = onlineIdx !== -1 ? String(row[onlineIdx] || "").trim().toLowerCase() : "no";
                    const rawDesc = descIdx !== -1 ? String(row[descIdx] || "").trim() : "";

                    let status: "ready" | "duplicate" | "error" = "ready";
                    let errorDetails = "";

                    // Required fields checks
                    if (!rawName) {
                        status = "error";
                        errorDetails = "Product Name is required.";
                    }

                    const price = parseFloat(String(rawPrice));
                    if (isNaN(price) || price < 0) {
                        if (status !== "error") {
                            status = "error";
                            errorDetails = "Price must be a valid positive number.";
                        }
                    }

                    // Optional numeric field validations
                    let cost_price = 0;
                    if (rawCost !== undefined && rawCost !== "") {
                        const parsedCost = parseFloat(String(rawCost));
                        if (isNaN(parsedCost) || parsedCost < 0) {
                            if (status !== "error") {
                                status = "error";
                                errorDetails = "Cost price must be a valid positive number.";
                            }
                        } else {
                            cost_price = parsedCost;
                        }
                    }

                    let stock_quantity = 0;
                    if (rawStock !== undefined && rawStock !== "") {
                        const parsedStock = parseInt(String(rawStock), 10);
                        if (isNaN(parsedStock) || parsedStock < 0) {
                            if (status !== "error") {
                                status = "error";
                                errorDetails = "Stock Quantity must be a valid positive integer.";
                            }
                        } else {
                            stock_quantity = parsedStock;
                        }
                    }

                    // Parse online listing boolean
                    const is_listed_online = ["yes", "y", "true", "1", "listed", "active"].includes(rawOnline);

                    // Check for duplicates within the uploaded sheet itself
                    const lowerName = rawName.toLowerCase();
                    if (status !== "error") {
                        if (sheetNamesSet.has(lowerName)) {
                            status = "error";
                            errorDetails = "Duplicate product name in Excel sheet.";
                        } else {
                            sheetNamesSet.add(lowerName);

                            // Check duplicate against existing inventory products in database
                            const isExisting = existingProducts.some(
                                (p) => p.name.toLowerCase() === lowerName
                            );
                            if (isExisting) {
                                status = "duplicate";
                            }
                        }
                    }

                    parsed.push({
                        name: rawName,
                        price: isNaN(price) ? 0 : price,
                        cost_price,
                        stock_quantity,
                        unit: rawUnit || "pc",
                        is_listed_online,
                        online_description: rawDesc,
                        status,
                        errorDetails,
                    });
                }

                setParsedProducts(parsed);
                if (parsed.length === 0) {
                    toast({
                        title: "No Products Found",
                        description: "Could not parse any valid product rows from the file.",
                        variant: "destructive",
                    });
                    resetState();
                } else {
                    toast({
                        title: "File Parsed Successfully",
                        description: `Found ${parsed.length} rows. Please review validation statuses below.`,
                    });
                }
            } catch (err) {
                console.error("Error reading file:", err);
                toast({
                    title: "Parsing Error",
                    description: "Failed to parse the file. Please check the file formatting.",
                    variant: "destructive",
                });
                resetState();
            }
        };
        reader.readAsArrayBuffer(fileObj);
    };

    // Bulk Import Execution
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
                            is_listed_online: item.is_listed_online,
                            online_description: item.online_description,
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

                // Standard insert for new product
                const recordId = uuidv4();
                const recordPayload: Product = {
                    id: recordId,
                    user_id: userId,
                    name: item.name,
                    price: item.price,
                    cost_price: item.cost_price,
                    stock_quantity: item.stock_quantity,
                    unit: item.unit,
                    is_listed_online: item.is_listed_online,
                    online_description: item.online_description,
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

    // Calculate preview statistics
    const totalCount = parsedProducts.length;
    const errorCount = parsedProducts.filter((p) => p.status === "error").length;
    const duplicateCount = parsedProducts.filter((p) => p.status === "duplicate").length;
    const readyCount = parsedProducts.filter((p) => p.status === "ready").length;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        Import Products from Excel
                    </DialogTitle>
                    <DialogDescription>
                        Upload Excel or CSV spreadsheet to add multiple products to your inventory at once.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Step 1: Upload and Template Download */}
                    {parsedProducts.length === 0 ? (
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
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadTemplate}
                                    className="gap-2 shrink-0"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Template
                                </Button>
                            </div>

                            {/* Dropzone */}
                            <div
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
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
                                    onChange={handleFileChange}
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
                    ) : (
                        /* Step 2: Excel Preview and Options */
                        <div className="space-y-6">
                            {/* Stats Banner */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Rows</p>
                                    <p className="text-xl font-bold text-slate-800 dark:text-white mt-0.5">{totalCount}</p>
                                </div>
                                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/30 text-center">
                                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Ready</p>
                                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{readyCount}</p>
                                </div>
                                <div className="bg-amber-50/50 dark:bg-amber-950/10 rounded-xl p-3 border border-amber-100 dark:border-amber-900/30 text-center">
                                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Duplicates</p>
                                    <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">{duplicateCount}</p>
                                </div>
                                <div className="bg-red-50/50 dark:bg-red-950/10 rounded-xl p-3 border border-red-100 dark:border-red-900/30 text-center">
                                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">Errors</p>
                                    <p className="text-xl font-bold text-red-700 dark:text-red-400 mt-0.5">{errorCount}</p>
                                </div>
                            </div>

                            {/* Duplicate Handling Option */}
                            {duplicateCount > 0 && (
                                <div className="p-4 rounded-xl border bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                            Duplicate Product Names Detected
                                        </h4>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        {duplicateCount} products share names with items already in your inventory. Choose how you want to handle them:
                                    </p>
                                    <RadioGroup
                                        value={duplicateAction}
                                        onValueChange={(val: "skip" | "update") => setDuplicateAction(val)}
                                        className="flex gap-6 mt-1"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="skip" id="dup_skip" />
                                            <Label htmlFor="dup_skip" className="text-xs font-medium cursor-pointer">
                                                Skip (Ignore and do not import duplicates)
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="update" id="dup_update" />
                                            <Label htmlFor="dup_update" className="text-xs font-medium cursor-pointer">
                                                Overwrite/Update (Replace existing item values with Excel data)
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            )}

                            {/* Parsing Error Note */}
                            {errorCount > 0 && (
                                <div className="p-3 bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-xl flex gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-700 dark:text-red-400">
                                        <strong>Attention Required:</strong> Correct the rows flagged with red errors before starting the import. The import cannot proceed while validation errors exist.
                                    </p>
                                </div>
                            )}

                            {/* Preview Grid */}
                            <div className="border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-sm">
                                        <TableRow>
                                            <TableHead className="w-[40%]">Product Name</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Stock</TableHead>
                                            <TableHead>Unit</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedProducts.map((p, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-semibold text-slate-800 dark:text-slate-100 max-w-[200px] truncate">
                                                    {p.name || <span className="text-red-400 italic">Missing Name</span>}
                                                </TableCell>
                                                <TableCell>₹{p.price}</TableCell>
                                                <TableCell>{p.stock_quantity}</TableCell>
                                                <TableCell>{p.unit}</TableCell>
                                                <TableCell className="text-right">
                                                    {p.status === "ready" && (
                                                        <Badge variant="secondary" className="bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-none">
                                                            Ready
                                                        </Badge>
                                                    )}
                                                    {p.status === "duplicate" && (
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                duplicateAction === "skip"
                                                                    ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400"
                                                                    : "border-blue-200 bg-blue-50/50 dark:bg-blue-950/10 text-blue-700 dark:text-blue-400"
                                                            }
                                                        >
                                                            {duplicateAction === "skip" ? "Will Skip" : "Will Update"}
                                                        </Badge>
                                                    )}
                                                    {p.status === "error" && (
                                                        <Badge variant="destructive" className="text-xs" title={p.errorDetails}>
                                                            Error
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 flex items-center justify-between gap-4 w-full">
                    {parsedProducts.length > 0 && !isImporting && (
                        <Button
                            variant="ghost"
                            onClick={resetState}
                            className="text-slate-500 hover:text-slate-700 mr-auto gap-2"
                        >
                            <X className="w-4 h-4" />
                            Clear File
                        </Button>
                    )}

                    {/* Progress Bar (during import execution) */}
                    {isImporting && (
                        <div className="flex-1 flex flex-col gap-1.5 mr-4">
                            <div className="flex justify-between text-xs font-semibold text-slate-500">
                                <span>Importing products...</span>
                                <span>{currentImportIndex} of {totalCount}</span>
                            </div>
                            <Progress value={(currentImportIndex / totalCount) * 100} className="h-2" />
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                            Cancel
                        </Button>
                        {parsedProducts.length > 0 && (
                            <Button
                                onClick={handleImport}
                                disabled={isImporting || errorCount > 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md shadow-emerald-600/10"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Start Import ({readyCount + (duplicateAction === "update" ? duplicateCount : 0)} items)
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
