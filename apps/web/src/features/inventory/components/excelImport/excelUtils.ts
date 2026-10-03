import * as XLSX from "xlsx";
import { Product, ParsedProduct } from "./types";

export function downloadExcelTemplate(): void {
    const headers = [
        [
            "Product Name *",
            "Selling Price *",
            "Cost Price",
            "Stock Quantity",
            "Unit",
            "List Online (yes/no)",
            "Online Description",
            "Rack Location",
            "HSN Code",
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
            "Shelf A-3",
            "0901",
        ],
        [
            "Premium Thermal Flask (750ml)",
            1299,
            900,
            8,
            "piece",
            "yes",
            "Stainless steel thermal insulated flask.",
            "Rack B",
            "9617",
        ],
        [
            "Wireless Optical Mouse",
            499,
            250,
            20,
            "piece",
            "no",
            "Comfortable 2.4GHz wireless mouse.",
            "Drawer 1",
            "8471",
        ],
    ];
    const wsData = [...headers, ...samples];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const wscols = [
        { wch: 35 }, // Product Name
        { wch: 15 }, // Selling Price
        { wch: 15 }, // Cost Price
        { wch: 15 }, // Stock Quantity
        { wch: 10 }, // Unit
        { wch: 22 }, // List Online
        { wch: 40 }, // Online Description
        { wch: 18 }, // Rack Location
        { wch: 15 }, // HSN Code
    ];
    ws["!cols"] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");
    XLSX.writeFile(wb, "products_import_template.xlsx");
}

export function exportProductsToExcel(existingProducts: Product[]): void {
    const headers = [
        "Product Name *",
        "Selling Price *",
        "Cost Price",
        "Stock Quantity",
        "Unit",
        "List Online (yes/no)",
        "Online Description",
        "Rack Location",
        "HSN Code",
    ];

    const rows = existingProducts.map((p) => [
        p.name,
        p.price,
        p.cost_price || 0,
        p.stock_quantity || 0,
        p.unit || "pc",
        p.is_listed_online ? "yes" : "no",
        p.online_description || "",
        p.rack_location || "",
        p.hsn_code || "",
    ]);

    const wsData = [headers, ...rows];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const wscols = [
        { wch: 35 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 22 },
        { wch: 40 },
        { wch: 18 },
        { wch: 15 },
    ];
    ws["!cols"] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Inventory Export");
    XLSX.writeFile(wb, "inventory_export.xlsx");
}

export interface ParseExcelResult {
    success: boolean;
    errorType?: "empty" | "missing_headers" | "parse_exception";
    errorMessage?: string;
    parsed: ParsedProduct[];
}

export function parseExcelFile(
    fileObj: File,
    existingProducts: Product[]
): Promise<ParseExcelResult> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                const rows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
                if (rows.length <= 1) {
                    return resolve({
                        success: false,
                        errorType: "empty",
                        errorMessage: "No product data rows found in the uploaded file.",
                        parsed: [],
                    });
                }

                const headers = rows[0].map((h: any) => String(h || "").trim().toLowerCase());

                const findColIdx = (aliases: string[]) => {
                    return headers.findIndex((h: string) =>
                        aliases.includes(h) || aliases.some((alias) => h.includes(alias))
                    );
                };

                const nameIdx = findColIdx(["product name", "item name", "name", "title"]);
                const priceIdx = findColIdx(["selling price", "price", "sale price", "mrp"]);
                const costIdx = findColIdx(["cost price", "cost", "purchase price"]);
                const stockIdx = findColIdx(["stock quantity", "stock", "quantity", "qty", "stock_quantity"]);
                const unitIdx = findColIdx(["unit", "uom"]);
                const onlineIdx = findColIdx(["list online", "listed online", "is listed online", "online"]);
                const descIdx = findColIdx(["online description", "description", "online_description", "details"]);
                const rackIdx = findColIdx(["rack location", "rack", "shelf", "location"]);
                const hsnIdx = findColIdx(["hsn code", "hsn_code", "hsn"]);

                if (nameIdx === -1 || priceIdx === -1) {
                    return resolve({
                        success: false,
                        errorType: "missing_headers",
                        errorMessage: "We couldn't locate required columns: Product Name and Selling Price. Please use our template.",
                        parsed: [],
                    });
                }

                const parsed: ParsedProduct[] = [];
                const sheetNamesSet = new Set<string>();

                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (
                        !row ||
                        row.length === 0 ||
                        row.every((cell: any) => cell === null || cell === undefined || cell === "")
                    ) {
                        continue;
                    }

                    const rawName = String(row[nameIdx] || "").trim();
                    const rawPrice = row[priceIdx];
                    const rawCost = costIdx !== -1 ? row[costIdx] : undefined;
                    const rawStock = stockIdx !== -1 ? row[stockIdx] : undefined;
                    const rawUnit = unitIdx !== -1 ? String(row[unitIdx] || "").trim() : "pc";
                    const rawOnline = onlineIdx !== -1 ? String(row[onlineIdx] || "").trim().toLowerCase() : "no";
                    const rawDesc = descIdx !== -1 ? String(row[descIdx] || "").trim() : "";
                    const rawRack = rackIdx !== -1 ? String(row[rackIdx] || "").trim() : "";
                    const rawHsn = hsnIdx !== -1 ? String(row[hsnIdx] || "").trim() : "";

                    let status: "ready" | "duplicate" | "error" = "ready";
                    let errorDetails = "";

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

                    const is_listed_online = ["yes", "y", "true", "1", "listed", "active"].includes(rawOnline);

                    const lowerName = rawName.toLowerCase();
                    if (status !== "error") {
                        if (sheetNamesSet.has(lowerName)) {
                            status = "error";
                            errorDetails = "Duplicate product name in Excel sheet.";
                        } else {
                            sheetNamesSet.add(lowerName);

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
                        hsn_code: rawHsn,
                        is_listed_online,
                        online_description: rawDesc,
                        rack_location: rawRack,
                        status,
                        errorDetails,
                    });
                }

                resolve({
                    success: true,
                    parsed,
                });
            } catch (err: any) {
                resolve({
                    success: false,
                    errorType: "parse_exception",
                    errorMessage: err?.message || "Failed to parse the file. Please check formatting.",
                    parsed: [],
                });
            }
        };
        reader.readAsArrayBuffer(fileObj);
    });
}
