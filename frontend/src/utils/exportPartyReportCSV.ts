import { format } from "date-fns";
import { PartyReportItem } from "./exportPartyReportPDF";

export const exportPartyReportCSV = (data: PartyReportItem[]) => {
    if (!data || data.length === 0) {
        alert("No party data to export.");
        return;
    }

    // Define Headers
    const headers = [
        "Party Name",
        "Party Type",
        "Phone",
        "Total Sales Volume",
        "Pending Receivable (Dr)",
        "Total Purchases Volume",
        "Pending Payable (Cr)",
        "Net Outstanding Balance",
        "Sales Count",
        "Purchases Count"
    ];

    // Process Data
    const csvContent = [
        headers.join(","), // Header Row
        ...data.map(party => {
            const row = [
                `"${(party.name || "").replace(/"/g, '""')}"`,
                party.type || "Both",
                party.phone ? `"${party.phone}"` : '""',
                (party.totalSales || 0).toFixed(2),
                (party.receivable || 0).toFixed(2),
                (party.totalPurchases || 0).toFixed(2),
                (party.payable || 0).toFixed(2),
                (party.netBalance || 0).toFixed(2),
                party.salesCount || 0,
                party.purchasesCount || 0
            ];
            return row.join(",");
        })
    ].join("\n");

    // Create Blob and Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `party_report_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
