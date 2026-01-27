import { format } from "date-fns";

export const exportSalesToCSV = (sales: any[]) => {
    if (!sales || sales.length === 0) {
        alert("No sales data to export.");
        return;
    }

    // Define Headers
    const headers = [
        "Date",
        "Invoice Number",
        "Customer Name",
        "Subtotal",
        "Tax Amount",
        "Total Amount",
        "Status",
        "Payment Method"
    ];

    // Process Data
    const csvContent = [
        headers.join(","), // Header Row
        ...sales.map(sale => {
            const row = [
                format(new Date(sale.date), "yyyy-MM-dd"), // Date
                `"${sale.invoice_number}"`, // Invoice Number (quoted to prevent scientific notation)
                `"${(sale.customer_name || "").replace(/"/g, '""')}"`, // Customer Name (escape quotes)
                sale.subtotal || 0,
                sale.tax_amount || 0,
                sale.total_amount || 0,
                sale.status,
                sale.payment_method || "cash"
            ];
            return row.join(",");
        })
    ].join("\n");

    // Create Blob and Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
