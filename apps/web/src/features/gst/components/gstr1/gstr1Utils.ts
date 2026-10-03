import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { PeriodOption, B2BRecord, B2CLRecord, B2CSRecord, HSNRecord } from "./types";

const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();
const fyStart = currentMonth >= 3 ? currentYear : currentYear - 1;
const fyEnd = fyStart + 1;

export const PERIODS: PeriodOption[] = [
    { label: `${format(now, "MMMM yyyy")} (Current)`, from: startOfMonth(now), to: endOfMonth(now) },
    { label: format(subMonths(now, 1), "MMMM yyyy"), from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) },
    { label: format(subMonths(now, 2), "MMMM yyyy"), from: startOfMonth(subMonths(now, 2)), to: endOfMonth(subMonths(now, 2)) },
    { label: format(subMonths(now, 3), "MMMM yyyy"), from: startOfMonth(subMonths(now, 3)), to: endOfMonth(subMonths(now, 3)) },
    { label: `Q2 FY ${fyStart}-${String(fyEnd).slice(-2)} (Jul–Sep)`, from: new Date(fyStart, 6, 1), to: new Date(fyStart, 8, 30) },
    { label: `Q1 FY ${fyStart}-${String(fyEnd).slice(-2)} (Apr–Jun)`, from: new Date(fyStart, 3, 1), to: new Date(fyStart, 5, 30) },
    { label: `Full FY ${fyStart}-${String(fyEnd).slice(-2)}`, from: new Date(fyStart, 3, 1), to: new Date(fyEnd, 2, 31) },
    { label: `Full FY ${fyStart - 1}-${String(fyStart).slice(-2)} (Previous)`, from: new Date(fyStart - 1, 3, 1), to: new Date(fyStart, 2, 31) },
];

export function formatINR(n: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
    const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function downloadGSTNJson(
    bizGSTIN: string,
    bizStateCode: string,
    period: PeriodOption,
    b2bRecords: B2BRecord[],
    b2clRecords: B2CLRecord[],
    b2csData: B2CSRecord[],
    hsnSummary: HSNRecord[]
) {
    const payload = {
        gstin: bizGSTIN,
        fp: format(period.from, "MMyyyy"), // e.g. 032026
        gt: 0,
        cur_gt: 0,
        b2b: b2bRecords.map((r) => ({
            ctin: r.gstin,
            inv: [
                {
                    inum: r.invoice_number,
                    idt: r.invoice_date,
                    val: r.invoice_value,
                    pos: r.place_of_supply?.substring(0, 2) || bizStateCode,
                    rchrg: r.reverse_charge ? "Y" : "N",
                    inv_typ: "R",
                    itms: [
                        {
                            num: 1,
                            itm_det: {
                                txval: r.taxable_value,
                                rt: 18,
                                igst: r.igst,
                                cgst: r.cgst,
                                sgst: r.sgst,
                            },
                        },
                    ],
                },
            ],
        })),
        b2cl: b2clRecords.map((r) => ({
            pos: r.place_of_supply?.substring(0, 2) || "",
            inv: [
                {
                    inum: r.invoice_number,
                    idt: r.invoice_date,
                    val: r.invoice_value,
                    itms: [
                        {
                            num: 1,
                            itm_det: {
                                txval: r.taxable_value,
                                rt: 18,
                                igst: r.igst,
                            },
                        },
                    ],
                },
            ],
        })),
        b2cs: b2csData.map((r) => ({
            pos: r.place_of_supply?.substring(0, 2) || bizStateCode,
            txval: r.taxable_value,
            rt: r.tax_rate,
            igst: r.igst,
            cgst: r.cgst,
            sgst: r.sgst,
            typ: "OE",
        })),
        hsn: {
            data: hsnSummary.map((r, i) => ({
                num: i + 1,
                hsn_sc: r.hsn_code,
                desc: r.description,
                uqc: r.uqc,
                qty: r.quantity,
                txval: r.taxable_value,
                rt: r.tax_rate,
                igst: r.igst,
                cgst: r.cgst,
                sgst: r.sgst,
            })),
        },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GSTR1_${bizGSTIN}_${format(period.from, "MMyyyy")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function exportFullGSTR1CSV(
    period: PeriodOption,
    businessName: string,
    bizGSTIN: string,
    b2bRecords: B2BRecord[],
    b2clRecords: B2CLRecord[],
    b2csData: B2CSRecord[],
    hsnSummary: HSNRecord[]
) {
    const rows: (string | number)[][] = [];
    rows.push(["=== GSTR-1 RETURN ==="]);
    rows.push([`Period: ${period.label}`]);
    rows.push([`Filed for: ${businessName || "Your Business"}`]);
    rows.push([`GSTIN: ${bizGSTIN || "Not set"}`]);
    rows.push([""]);
    rows.push(["TABLE 4 — B2B SUPPLIES"]);
    rows.push([
        "GSTIN",
        "Customer",
        "Invoice No.",
        "Date",
        "Invoice Value",
        "Taxable Value",
        "IGST",
        "CGST",
        "SGST",
        "POS",
        "RC",
    ]);
    b2bRecords.forEach((r) =>
        rows.push([
            r.gstin,
            r.customer_name,
            r.invoice_number,
            r.invoice_date,
            r.invoice_value.toFixed(2),
            r.taxable_value.toFixed(2),
            r.igst.toFixed(2),
            r.cgst.toFixed(2),
            r.sgst.toFixed(2),
            r.place_of_supply,
            r.reverse_charge ? "Y" : "N",
        ])
    );
    rows.push([""]);
    rows.push(["TABLE 5 — B2C LARGE"]);
    rows.push(["Invoice No.", "Date", "Invoice Value", "Place of Supply", "Taxable Value", "IGST"]);
    b2clRecords.forEach((r) =>
        rows.push([
            r.invoice_number,
            r.invoice_date,
            r.invoice_value.toFixed(2),
            r.place_of_supply,
            r.taxable_value.toFixed(2),
            r.igst.toFixed(2),
        ])
    );
    rows.push([""]);
    rows.push(["TABLE 7 — B2C SMALL"]);
    rows.push(["Place of Supply", "Tax Rate", "Taxable Value", "IGST", "CGST", "SGST"]);
    b2csData.forEach((r) =>
        rows.push([
            r.place_of_supply,
            `${r.tax_rate}%`,
            r.taxable_value.toFixed(2),
            r.igst.toFixed(2),
            r.cgst.toFixed(2),
            r.sgst.toFixed(2),
        ])
    );
    rows.push([""]);
    rows.push(["TABLE 12 — HSN SUMMARY"]);
    rows.push(["HSN", "Description", "UQC", "Qty", "Taxable Value", "Tax Rate", "IGST", "CGST", "SGST"]);
    hsnSummary.forEach((r) =>
        rows.push([
            r.hsn_code,
            r.description,
            r.uqc,
            r.quantity,
            r.taxable_value.toFixed(2),
            `${r.tax_rate}%`,
            r.igst.toFixed(2),
            r.cgst.toFixed(2),
            r.sgst.toFixed(2),
        ])
    );
    downloadCSV(`GSTR1_FULL_${period.label.replace(/\s/g, "_")}.csv`, ["GSTR-1 Export"], rows);
}
