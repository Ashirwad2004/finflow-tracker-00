import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    UploadCloud, 
    Sparkles, 
    FileImage, 
    FileText,
    Loader2, 
    CheckCircle2, 
    ArrowRight, 
    Zap, 
    AlertCircle, 
    Camera,
    RefreshCw,
    X,
    FileCheck,
    FileSpreadsheet,
    Eye
} from "lucide-react";
import { callGemini } from "@/core/integrations/ai/gemini";
import imageCompression from "browser-image-compression";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { PurchaseItemRowData } from "./PurchaseItemsTable";

export interface ExtractedPurchaseBill {
    vendor_name: string;
    vendor_gstin?: string;
    vendor_phone?: string;
    place_of_supply?: string;
    bill_number?: string;
    date?: string;
    due_date?: string;
    subtotal?: number;
    tax_amount?: number;
    tax_rate?: number;
    discount_amount?: number;
    total_amount?: number;
    amount_paid?: number;
    payment_status?: "paid" | "partial" | "pending";
    notes?: string;
    items: PurchaseItemRowData[];
    file_name?: string;
    is_pdf?: boolean;
    attachment_data?: string;
}

interface PurchaseBillScannerProps {
    onExtract: (data: ExtractedPurchaseBill, autoSaveImmediately?: boolean) => void;
    onClose?: () => void;
}

const PURCHASE_SCAN_SYSTEM_PROMPT = `
You are a world-class AI accounting clerk and OCR engine specializing in supplier bills, purchase invoices, and B2B receipts (including Indian GST tax invoices, PDF invoices, retail bills, and international commercial invoices).

Extract all structured purchase bill information from the provided bill image or PDF document.
If this is a multi-page PDF or image, read all pages and extract all rows from the itemized table.

Key Extraction Instructions:
1. vendor_name: The supplier / vendor / company issuing this purchase bill. (NOT the customer / billed-to name).
2. vendor_gstin: 15-character GSTIN if visible (e.g. 27AAAAA0000A1Z5).
3. place_of_supply: 2-digit state code if visible or derivable from the first 2 characters of GSTIN (e.g., "27", "07").
4. vendor_phone: Phone number or mobile number of the supplier.
5. bill_number: Invoice number, bill reference, or cash memo number (e.g. "INV-1092", "BILL/2026/04").
6. date: Date of bill formatted as YYYY-MM-DD. (Default to today's date if illegible).
7. due_date: Payment due date if shown, or leave null.
8. subtotal: Total amount BEFORE taxes and line discounts.
9. tax_amount: Total tax (GST/CGST+SGST/IGST/VAT) amount.
10. tax_rate: Primary or average GST percentage (e.g. 0, 5, 12, 18, 28).
11. discount_amount: Any total trade discount or cash discount deducted.
12. total_amount: Final payable grand total amount.
13. payment_status: "paid" if marked as Paid/Cash Received, otherwise "pending" or "partial".
14. notes: Any remarks, terms, order reference numbers, or transport details.
15. items: Array of purchased items. For each item extract:
    - description: Product / material name or service description.
    - quantity: Number of units purchased (default 1 if not specified).
    - price: Unit purchase cost/rate before line discount. If unit rate is omitted, compute total / quantity.
    - unit: Unit of measurement (e.g. "pc", "box", "kg", "g", "ltr", "bag", "bundle", "meter").
    - discount: Line item discount percentage if shown (default 0).
    - tax_rate: GST rate for this item (default same as bill tax_rate or 0).
    - total: Total line amount.

Return ONLY a valid JSON object matching this structure.
`;

const BILL_JSON_SCHEMA = {
    type: "object",
    properties: {
        vendor_name: { type: "string" },
        vendor_gstin: { type: "string", nullable: true },
        vendor_phone: { type: "string", nullable: true },
        place_of_supply: { type: "string", nullable: true },
        bill_number: { type: "string", nullable: true },
        date: { type: "string", nullable: true },
        due_date: { type: "string", nullable: true },
        subtotal: { type: "number", nullable: true },
        tax_amount: { type: "number", nullable: true },
        tax_rate: { type: "number", nullable: true },
        discount_amount: { type: "number", nullable: true },
        total_amount: { type: "number", nullable: true },
        amount_paid: { type: "number", nullable: true },
        payment_status: { type: "string", enum: ["paid", "partial", "pending"], nullable: true },
        notes: { type: "string", nullable: true },
        items: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    description: { type: "string" },
                    quantity: { type: "number", nullable: true },
                    price: { type: "number", nullable: true },
                    unit: { type: "string", nullable: true },
                    discount: { type: "number", nullable: true },
                    tax_rate: { type: "number", nullable: true },
                    total: { type: "number", nullable: true },
                },
                required: ["description"],
            },
        },
    },
    required: ["vendor_name", "items"],
};

interface ScannedFileMeta {
    name: string;
    isPdf: boolean;
    sizeFormatted: string;
    previewUrl?: string;
}

export const PurchaseBillScanner = ({ onExtract, onClose }: PurchaseBillScannerProps) => {
    const { toast } = useToast();
    const { formatCurrency } = useCurrency();

    const [isScanning, setIsScanning] = useState(false);
    const [scanProgressStage, setScanProgressStage] = useState<string>("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [fileMeta, setFileMeta] = useState<ScannedFileMeta | null>(null);
    const [extractedResult, setExtractedResult] = useState<ExtractedPurchaseBill | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const compressAndConvertToBase64 = async (file: File): Promise<{ base64: string; mimeType: string }> => {
        const options = {
            maxSizeMB: 1.5,
            maxWidthOrHeight: 1800,
            useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(compressedFile);
            reader.onload = () => {
                const resultStr = reader.result as string;
                resolve({
                    base64: resultStr,
                    mimeType: compressedFile.type || "image/jpeg",
                });
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const processFile = async (file: File) => {
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        const isImage = file.type.startsWith("image/");

        if (!isPdf && !isImage) {
            toast({
                title: "Unsupported File",
                description: "Please upload a PDF bill (.pdf) or invoice image (PNG, JPG, WEBP).",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsScanning(true);
            setExtractedResult(null);

            let base64 = "";
            let mimeType = "";

            if (isPdf) {
                // PDF Document handling (supports up to 20MB)
                if (file.size > 20 * 1024 * 1024) {
                    toast({
                        title: "PDF File Too Large",
                        description: "Please upload a PDF invoice under 20MB.",
                        variant: "destructive",
                    });
                    setIsScanning(false);
                    return;
                }

                setScanProgressStage("Reading PDF invoice pages...");
                setFileMeta({
                    name: file.name,
                    isPdf: true,
                    sizeFormatted: `${(file.size / 1024).toFixed(0)} KB`,
                });

                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        let res = reader.result as string;
                        if (!res.startsWith("data:application/pdf")) {
                            res = res.replace(/^data:[^;]+;base64,/, "data:application/pdf;base64,");
                        }
                        resolve(res);
                    };
                    reader.onerror = (err) => reject(err);
                    reader.readAsDataURL(file);
                });

                base64 = dataUrl;
                mimeType = "application/pdf";
                setImagePreview(null);
            } else {
                // Image handling with compression
                setScanProgressStage("Compressing bill photo...");
                setFileMeta({
                    name: file.name,
                    isPdf: false,
                    sizeFormatted: `${(file.size / 1024).toFixed(0)} KB`,
                });

                const compressed = await compressAndConvertToBase64(file);
                base64 = compressed.base64;
                mimeType = compressed.mimeType;
                setImagePreview(base64);
            }

            setScanProgressStage(
                isPdf 
                    ? "AI Optical Scanning: Reading PDF document, tables & GST details..." 
                    : "AI Optical Scanning & Text Recognition..."
            );

            const messages: any[] = [
                {
                    role: "system",
                    content: PURCHASE_SCAN_SYSTEM_PROMPT,
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Extract all purchase bill details from this ${isPdf ? "PDF invoice document" : "invoice photo"} into structured accounting JSON. Today's date is ${new Date().toISOString().split("T")[0]}. Be thorough and extract every single product item row with description, quantity, price, unit, discount %, and tax rate.`,
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: base64,
                            },
                        },
                    ],
                },
            ];

            setScanProgressStage("Extracting line items, vendor GSTIN & taxes...");

            const rawAiResponse = await callGemini(messages, {
                model: "gemini-2.5-flash",
                temperature: 0.1,
                responseFormat: { json_schema: { schema: BILL_JSON_SCHEMA } },
            });

            setScanProgressStage("Populating items into product columns...");

            // Parse response safely
            let cleanedJson = rawAiResponse.trim();
            if (cleanedJson.startsWith("```json")) {
                cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/```$/, "");
            } else if (cleanedJson.startsWith("```")) {
                cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/```$/, "");
            }

            const parsed = JSON.parse(cleanedJson);

            const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

            // Normalize parsed items
            const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
            const mappedItems: PurchaseItemRowData[] = rawItems.map((it: any) => {
                const qty = Math.max(1, Number(it.quantity) || 1);
                const rawRate = Number(it.price) || (it.total ? Number(it.total) / qty : 0);
                const rate = round2(rawRate);
                const disc = round2(Number(it.discount) || 0);
                const tax = round2(Number(it.tax_rate ?? parsed.tax_rate ?? 0));
                const total = round2(Number(it.total) || qty * rate * (1 - disc / 100) * (1 + tax / 100));

                return {
                    description: it.description || it.name || "Item",
                    quantity: qty,
                    price: rate,
                    unit: it.unit || "pc",
                    discount: disc,
                    tax_rate: tax,
                    total,
                };
            });

            if (mappedItems.length === 0) {
                mappedItems.push({
                    description: "Supplies / Goods",
                    quantity: 1,
                    price: round2(Number(parsed.total_amount) || 0),
                    unit: "pc",
                    discount: 0,
                    tax_rate: round2(Number(parsed.tax_rate) || 0),
                    total: round2(Number(parsed.total_amount) || 0),
                });
            }

            const extracted: ExtractedPurchaseBill = {
                vendor_name: parsed.vendor_name || "Supplier",
                vendor_gstin: parsed.vendor_gstin || undefined,
                vendor_phone: parsed.vendor_phone || undefined,
                place_of_supply:
                    parsed.place_of_supply ||
                    (parsed.vendor_gstin ? parsed.vendor_gstin.substring(0, 2) : undefined),
                bill_number: parsed.bill_number || `BILL-${Date.now().toString().slice(-6)}`,
                date: parsed.date || new Date().toISOString().split("T")[0],
                due_date: parsed.due_date || undefined,
                subtotal: parsed.subtotal ? round2(Number(parsed.subtotal)) : undefined,
                tax_amount: parsed.tax_amount ? round2(Number(parsed.tax_amount)) : undefined,
                tax_rate: round2(Number(parsed.tax_rate) || 0),
                discount_amount: round2(Number(parsed.discount_amount) || 0),
                total_amount: parsed.total_amount ? round2(Number(parsed.total_amount)) : undefined,
                amount_paid: parsed.amount_paid ? round2(Number(parsed.amount_paid)) : undefined,
                payment_status: parsed.payment_status || "paid",
                notes: parsed.notes || undefined,
                items: mappedItems,
                file_name: file.name,
                is_pdf: isPdf,
                attachment_data: base64,
            };

            setExtractedResult(extracted);

            // CRITICAL: Immediately populate all fields and item product columns in the form!
            onExtract(extracted, false);

            toast({
                title: "Bill Extracted & Items Added! ⚡",
                description: `${extracted.items.length} items loaded into product columns below. You can edit any details or click 1-Click Save.`,
            });
        } catch (err: any) {
            console.error("Purchase OCR error:", err);
            toast({
                title: "Scan failed",
                description: err.message || "Could not read bill. Please ensure clear text or enter manually.",
                variant: "destructive",
            });
        } finally {
            setIsScanning(false);
            setScanProgressStage("");
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleOneClickSave = () => {
        if (!extractedResult) return;
        onExtract(extractedResult, true); // true = auto-submit immediately
    };

    const handleReviewInForm = () => {
        if (!extractedResult) return;
        onExtract(extractedResult, false); // false = populate into form for review
    };

    // Quick demo bill filler for instant testing
    const handleLoadSampleBill = () => {
        const sample: ExtractedPurchaseBill = {
            vendor_name: "Apex Hardware & Building Materials Ltd",
            vendor_gstin: "27AABCA1234F1Z8",
            place_of_supply: "27",
            vendor_phone: "+91 98201 55432",
            bill_number: `INV-${Date.now().toString().slice(-5)}`,
            date: new Date().toISOString().split("T")[0],
            payment_status: "paid",
            subtotal: 9400,
            tax_rate: 18,
            tax_amount: 1692,
            discount_amount: 200,
            total_amount: 10892,
            amount_paid: 10892,
            items: [
                { description: "Ambuja Cement 50kg Bag", quantity: 20, price: 380, unit: "bag", discount: 0, tax_rate: 18, total: 8968 },
                { description: "TMT Steel Rods 10mm (Bundle)", quantity: 3, price: 600, unit: "bundle", discount: 200, tax_rate: 18, total: 1888 },
            ],
            notes: "Delivered to site warehouse via Truck MH-04-1290. Full payment cleared.",
            file_name: "Sample_GST_Invoice.pdf",
            is_pdf: true,
        };
        setExtractedResult(sample);
        setFileMeta({
            name: "Sample_GST_Invoice.pdf",
            isPdf: true,
            sizeFormatted: "142 KB",
        });

        // Automatically populate into form table rows right away:
        onExtract(sample, false);

        toast({
            title: "Sample GST Invoice Loaded! ⚡",
            description: "2 items populated into the product columns below. You can edit them freely.",
        });
    };

    return (
        <div className="bg-card border-2 border-dashed border-violet-500/40 rounded-2xl p-5 shadow-md space-y-4 animate-in fade-in-0 zoom-in-98 duration-200">
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

            {/* Top Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
                        <Zap className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-extrabold tracking-tight text-foreground">
                                AI Purchase Bill & PDF Scanner
                            </h3>
                            <Badge className="bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black tracking-wide uppercase px-2 py-0.5">
                                Auto-Fill Table
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Upload a PDF invoice or bill photo. AI extracts all items, rates, quantities & taxes directly into your table columns.
                        </p>
                    </div>
                </div>

                {onClose && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Upload Box (When not scanning and no result yet) */}
            {!isScanning && !extractedResult && (
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
            )}

            {/* Scanning In Progress State */}
            {isScanning && (
                <div className="border border-violet-500/30 bg-violet-500/5 rounded-xl p-8 text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                        <Sparkles className="w-7 h-7 text-violet-500 animate-pulse" />
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">
                            {scanProgressStage || "Scanning purchase bill with Gemini Vision..."}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Reading supplier name, items, rates, quantities, and GST rates automatically
                        </p>
                    </div>

                    {/* PDF Document Preview Card during scan */}
                    {fileMeta?.isPdf && (
                        <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl max-w-sm mx-auto text-left">
                            <div className="p-2.5 bg-red-600 text-white rounded-lg shrink-0 shadow-sm">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-foreground truncate">{fileMeta.name}</span>
                                    <Badge className="bg-red-600 text-white text-[9px] px-1.5 py-0 h-4">PDF</Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground">{fileMeta.sizeFormatted} • Reading all pages & line items</p>
                            </div>
                        </div>
                    )}

                    {/* Image Thumbnail Preview during scan */}
                    {!fileMeta?.isPdf && imagePreview && (
                        <div className="max-w-[200px] mx-auto max-h-32 overflow-hidden rounded-lg border shadow-sm opacity-80">
                            <img src={imagePreview} alt="Bill Preview" className="w-full object-cover" />
                        </div>
                    )}
                </div>
            )}

            {/* Extracted Bill Preview & Quick Actions */}
            {extractedResult && (
                <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-4 space-y-4">
                    {/* Header of Results */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-emerald-500/20">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                {extractedResult.is_pdf ? <FileText className="w-5 h-5 text-red-600" /> : <CheckCircle2 className="w-5 h-5" />}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <span>{extractedResult.vendor_name}</span>
                                    {extractedResult.is_pdf ? (
                                        <Badge className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0 h-4">
                                            PDF
                                        </Badge>
                                    ) : null}
                                    {extractedResult.vendor_gstin && (
                                        <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80">
                                            GST: {extractedResult.vendor_gstin}
                                        </Badge>
                                    )}
                                </h4>
                                <p className="text-[11px] text-muted-foreground">
                                    Ref: {extractedResult.bill_number} • Date: {extractedResult.date}
                                    {extractedResult.file_name && ` • File: ${extractedResult.file_name}`}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Total Bill Value
                            </span>
                            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">
                                {formatCurrency(Number(extractedResult.total_amount || 0))}
                            </span>
                        </div>
                    </div>

                    {/* Prominent Success / Auto-Fill Notification */}
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-xs text-emerald-900 dark:text-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                            <strong>All {extractedResult.items.length} items have been added to the product columns below.</strong> You can review, edit quantities, adjust prices, or change units directly in the table.
                        </span>
                    </div>

                    {/* Extracted Items Mini List */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Scanned Items ({extractedResult.items.length})
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                Pre-filled into table below for editing
                            </span>
                        </div>
                        <div className="max-h-36 overflow-y-auto divide-y divide-border/60 bg-background/80 rounded-lg border p-2 text-xs">
                            {extractedResult.items.map((item, idx) => (
                                <div key={idx} className="py-1.5 flex justify-between items-center text-xs">
                                    <div className="truncate pr-2">
                                        <span className="font-semibold text-foreground">
                                            {item.description}
                                        </span>
                                        <span className="text-muted-foreground text-[10px] ml-1.5">
                                            {item.quantity} {item.unit || "pc"} @ {formatCurrency(item.price)}
                                            {item.discount ? ` (${item.discount}% off)` : ""}
                                            {item.tax_rate ? ` [${item.tax_rate}% GST]` : ""}
                                        </span>
                                    </div>
                                    <span className="font-mono font-bold text-foreground shrink-0">
                                        {formatCurrency(item.total)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setExtractedResult(null);
                                setImagePreview(null);
                                setFileMeta(null);
                            }}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Scan Another Bill
                        </Button>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleReviewInForm}
                                className="h-9 px-3 text-xs font-semibold gap-1"
                            >
                                <span>✏️ Edit in Table Below</span>
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                onClick={handleOneClickSave}
                                className="h-9 px-4 text-xs font-extrabold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all animate-pulse"
                            >
                                <Zap className="w-3.5 h-3.5" />
                                <span>⚡ 1-Click Save to Inventory</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
