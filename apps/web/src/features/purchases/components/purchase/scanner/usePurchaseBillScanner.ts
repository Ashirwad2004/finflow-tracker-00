import { useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import { callGemini } from "@/core/integrations/ai/gemini";
import { useToast } from "@/core/hooks/use-toast";
import { PurchaseItemRowData } from "../PurchaseItemsTable";
import { ExtractedPurchaseBill, ScannedFileMeta } from "./types";
import { PURCHASE_SCAN_SYSTEM_PROMPT, BILL_JSON_SCHEMA, createSampleBill } from "./constants";

export function usePurchaseBillScanner(
    onExtract: (data: ExtractedPurchaseBill, autoSaveImmediately?: boolean) => void
) {
    const { toast } = useToast();

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

            // Immediately populate all fields and item product columns in the form
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

    const handleLoadSampleBill = () => {
        const sample = createSampleBill();
        setExtractedResult(sample);
        setFileMeta({
            name: "Sample_GST_Invoice.pdf",
            isPdf: true,
            sizeFormatted: "142 KB",
        });

        onExtract(sample, false);

        toast({
            title: "Sample GST Invoice Loaded! ⚡",
            description: "2 items populated into the product columns below. You can edit them freely.",
        });
    };

    const resetScanner = () => {
        setExtractedResult(null);
        setImagePreview(null);
        setFileMeta(null);
    };

    return {
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
    };
}
