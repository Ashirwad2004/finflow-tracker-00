import * as XLSX from "xlsx";
import { format } from "date-fns";
import { BusinessDetailsInfo, PartyExportItem, PartyMetrics } from "./types";

export const exportPartiesToExcel = (
    parties: PartyExportItem[],
    partyLedgerMap?: Map<string, PartyMetrics>,
    businessDetails?: BusinessDetailsInfo,
    filterName?: string
) => {
    if (!parties || parties.length === 0) {
        throw new Error("No parties available to export.");
    }

    const titleRow = [
        businessDetails?.name
            ? `${businessDetails.name.toUpperCase()} - PARTIES & ACCOUNTS DIRECTORY`
            : "PARTIES & ACCOUNTS DIRECTORY",
    ];
    const subTitleRow = [
        `Generated on: ${format(new Date(), "dd MMM yyyy, hh:mm a")} ${
            filterName ? `| Filter: ${filterName}` : ""
        }`,
    ];
    const emptyRow: any[] = [];

    const headers = [
        "Party Name",
        "Type",
        "Phone",
        "Email",
        "GSTIN",
        "Opening Balance (₹)",
        "Total Sales (₹)",
        "Sales Collected (₹)",
        "Receivable / Due (₹)",
        "Total Purchases (₹)",
        "Purchases Paid (₹)",
        "Payable / Due (₹)",
        "Net Balance (₹)",
        "Status",
    ];

    let grandSales = 0;
    let grandSalesPaid = 0;
    let grandReceivable = 0;
    let grandPurchases = 0;
    let grandPurchasesPaid = 0;
    let grandPayable = 0;

    const dataRows = parties.map((party) => {
        const m = partyLedgerMap?.get(party.id) || {
            partySales: [],
            partyPurchases: [],
            totalSalesAmount: 0,
            totalSalesPaid: 0,
            salesBalanceDue: 0,
            totalPurchasesAmount: 0,
            totalPurchasesPaid: 0,
            purchasesBalanceDue: 0,
            receivable: 0,
            payable: 0,
            totalRecords: 0,
        };

        grandSales += m.totalSalesAmount;
        grandSalesPaid += m.totalSalesPaid;
        grandReceivable += m.receivable;
        grandPurchases += m.totalPurchasesAmount;
        grandPurchasesPaid += m.totalPurchasesPaid;
        grandPayable += m.payable;

        const isOpeningReceivable = party.opening_balance_type
            ? party.opening_balance_type === "to_receive"
            : party.type !== "vendor";
        const netBalance = m.receivable - m.payable;
        let statusLabel = "Settled";
        if (netBalance > 0) statusLabel = "To Collect (Receivable)";
        else if (netBalance < 0) statusLabel = "To Pay (Payable)";

        const openBalNumber = Number(party.opening_balance || 0);
        const openBalDisplay =
            openBalNumber > 0
                ? `${openBalNumber} (${isOpeningReceivable ? "Dr" : "Cr"})`
                : 0;

        return [
            party.name || "",
            party.type ? party.type.toUpperCase() : "CUSTOMER",
            party.phone || "",
            party.email || "",
            party.gst_number || "",
            openBalDisplay,
            m.totalSalesAmount,
            m.totalSalesPaid,
            m.receivable,
            m.totalPurchasesAmount,
            m.totalPurchasesPaid,
            m.payable,
            netBalance,
            statusLabel,
        ];
    });

    const netTotal = grandReceivable - grandPayable;
    const totalsRow = [
        "TOTAL",
        "",
        "",
        "",
        "",
        "",
        grandSales,
        grandSalesPaid,
        grandReceivable,
        grandPurchases,
        grandPurchasesPaid,
        grandPayable,
        netTotal,
        netTotal > 0
            ? "Net To Collect"
            : netTotal < 0
            ? "Net To Pay"
            : "Fully Settled",
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

    // Column widths
    ws["!cols"] = [
        { wch: 28 }, // Party Name
        { wch: 12 }, // Type
        { wch: 15 }, // Phone
        { wch: 24 }, // Email
        { wch: 18 }, // GSTIN
        { wch: 18 }, // Opening Balance
        { wch: 16 }, // Total Sales
        { wch: 16 }, // Sales Collected
        { wch: 20 }, // Receivable
        { wch: 18 }, // Total Purchases
        { wch: 16 }, // Purchases Paid
        { wch: 18 }, // Payable
        { wch: 16 }, // Net Balance
        { wch: 24 }, // Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Parties Directory");
    const fileName = `Parties_Directory_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
};
