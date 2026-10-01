import * as XLSX from "xlsx";
import { format } from "date-fns";
import { PartyReportItem } from "./exportPartyReportPDF";

export const exportPartyReportCSV = (
    data: PartyReportItem[],
    businessDetails?: { name?: string; address?: string; phone?: string; gst?: string }
) => {
    if (!data || data.length === 0) {
        alert("No party data to export.");
        return;
    }

    const titleRow = [
        businessDetails?.name
            ? `${businessDetails.name.toUpperCase()} - PARTY LEDGER & BALANCE SUMMARY`
            : "PARTY LEDGER & BALANCE SUMMARY",
    ];
    const subTitleRow = [`Generated On: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`];
    const emptyRow: any[] = [];

    // Define Headers
    const headers = [
        "Party Name",
        "Party Type",
        "Phone",
        "Total Sales Volume (₹)",
        "Pending Receivable (Dr ₹)",
        "Total Purchases Volume (₹)",
        "Pending Payable (Cr ₹)",
        "Net Outstanding Balance (₹)",
        "Status",
        "Sales Invoices Count",
        "Purchase Bills Count",
    ];

    let grandSales = 0;
    let grandReceivable = 0;
    let grandPurchases = 0;
    let grandPayable = 0;

    // Process Data
    const dataRows = data.map((party) => {
        const sales = Number(party.totalSales || 0);
        const recv = Number(party.receivable || 0);
        const purch = Number(party.totalPurchases || 0);
        const pay = Number(party.payable || 0);
        const net = Number(party.netBalance || (recv - pay));

        grandSales += sales;
        grandReceivable += recv;
        grandPurchases += purch;
        grandPayable += pay;

        let status = "Settled";
        if (net > 0) status = "Receivable (Dr)";
        else if (net < 0) status = "Payable (Cr)";

        return [
            party.name || "",
            (party.type || "Both").toUpperCase(),
            party.phone || "",
            sales,
            recv,
            purch,
            pay,
            net,
            status,
            party.salesCount || 0,
            party.purchasesCount || 0,
        ];
    });

    const netGrand = grandReceivable - grandPayable;
    const totalsRow = [
        "TOTAL",
        "",
        "",
        grandSales,
        grandReceivable,
        grandPurchases,
        grandPayable,
        netGrand,
        netGrand > 0 ? "Net To Collect" : netGrand < 0 ? "Net To Pay" : "Settled",
        "",
        "",
    ];

    const wsData = [
        titleRow,
        subTitleRow,
        emptyRow,
        headers,
        ...dataRows,
        emptyRow,
        totalsRow,
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws["!cols"] = [
        { wch: 28 }, // Party Name
        { wch: 14 }, // Party Type
        { wch: 16 }, // Phone
        { wch: 22 }, // Total Sales
        { wch: 24 }, // Pending Receivable
        { wch: 24 }, // Total Purchases
        { wch: 22 }, // Pending Payable
        { wch: 24 }, // Net Outstanding
        { wch: 20 }, // Status
        { wch: 20 }, // Sales Count
        { wch: 20 }, // Purchases Count
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Party Balance Summary");
    const fileName = `party_report_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`;
    XLSX.writeFile(wb, fileName);
};