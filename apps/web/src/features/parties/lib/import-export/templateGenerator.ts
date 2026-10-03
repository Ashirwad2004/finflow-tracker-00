import * as XLSX from "xlsx";

export function downloadSampleExcelTemplate(
    toast: (options: { title: string; description: string; variant?: "default" | "destructive" }) => void
) {
    try {
        const headers = [
            [
                "Party Name *",
                "Type (customer/vendor/both) *",
                "Phone Number",
                "Email Address",
                "GSTIN",
                "Billing Address",
                "Opening Balance",
                "Balance Type (to_receive/to_pay)",
            ],
        ];

        const samples = [
            [
                "Sharma Enterprises & Traders",
                "customer",
                "9876543210",
                "sharma.traders@example.com",
                "07AAAAA0000A1Z5",
                "Shop 12, Main Market, Connaught Place, New Delhi",
                5000,
                "to_receive",
            ],
            [
                "Apex Logistics & Supplies",
                "vendor",
                "9123456780",
                "billing@apexlogistics.in",
                "27BBBBB1111B2Z8",
                "Plot 44, Industrial Area Phase 2, Mumbai, MH",
                12500,
                "to_pay",
            ],
            [
                "Kisan Agro Seeds & Fertilizers",
                "both",
                "9988776655",
                "info@kisanagro.com",
                "24CCCCC2222C3Z1",
                "Station Road, Mandi Samiti, Jaipur, RJ",
                0,
                "to_receive",
            ],
        ];

        const wsData = [...headers, ...samples];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        ws["!cols"] = [
            { wch: 32 },
            { wch: 28 },
            { wch: 16 },
            { wch: 28 },
            { wch: 20 },
            { wch: 45 },
            { wch: 18 },
            { wch: 32 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Parties Template");

        const instructions = [
            ["FinFlow — Party Directory Bulk Import Guide"],
            [""],
            ["Field Name", "Required?", "Accepted Values / Format", "Example / Notes"],
            ["Party Name", "YES", "Business or individual name", "Sharma Enterprises"],
            ["Type", "YES", "customer, vendor, or both", "customer"],
            ["Phone Number", "Optional", "10-digit mobile number", "9876543210"],
            ["Email Address", "Optional", "Valid email address", "contact@company.com"],
            ["GSTIN", "Optional", "15-character Indian GSTIN", "07AAAAA0000A1Z5"],
            ["Billing Address", "Optional", "Street, City, State, PIN", "123 Market Rd, Delhi"],
            ["Opening Balance", "Optional", "Numeric amount (default: 0)", "5000"],
            ["Balance Type", "Optional", "to_receive (Dr / Receivable) or to_pay (Cr / Payable)", "to_receive"],
        ];
        const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
        wsInstr["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 45 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");

        XLSX.writeFile(wb, "parties_import_template.xlsx");
        toast({
            title: "Template Downloaded",
            description: "Open the template in Excel, enter your records, and upload it back here.",
        });
    } catch (error) {
        console.error("Failed to generate party template:", error);
        toast({
            title: "Template Generation Failed",
            description: "An error occurred while creating the Excel template.",
            variant: "destructive",
        });
    }
}
