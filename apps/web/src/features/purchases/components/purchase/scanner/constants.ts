import { ExtractedPurchaseBill } from "./types";

export const PURCHASE_SCAN_SYSTEM_PROMPT = `
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

export const BILL_JSON_SCHEMA = {
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

export const createSampleBill = (): ExtractedPurchaseBill => ({
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
});
