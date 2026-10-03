/**
 * Enterprise Report Export & Print Utility
 * Provides standardized CSV export and CA-compliant Print/PDF generation
 */

export interface ExportColumn<T> {
  header: string;
  accessor: (item: T) => string | number | null | undefined;
}

export function downloadReportCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  businessInfo?: { name?: string; gstin?: string; period?: string }
) {
  if (!data || data.length === 0) {
    alert("No data available to export for the selected period.");
    return;
  }

  const rows: string[] = [];

  // Business Header (CA standard audit trace)
  if (businessInfo?.name) {
    rows.push(`"Business: ${businessInfo.name.replace(/"/g, '""')}"`);
  }
  if (businessInfo?.gstin) {
    rows.push(`"GSTIN: ${businessInfo.gstin.replace(/"/g, '""')}"`);
  }
  if (businessInfo?.period) {
    rows.push(`"Period: ${businessInfo.period.replace(/"/g, '""')}"`);
  }
  rows.push(`"Generated On: ${new Date().toLocaleString('en-IN')}"`);
  rows.push(""); // empty line

  // Column Headers
  const headerRow = columns.map(col => `"${col.header.replace(/"/g, '""')}"`).join(",");
  rows.push(headerRow);

  // Data Rows
  data.forEach(item => {
    const row = columns
      .map(col => {
        const val = col.accessor(item);
        if (val === null || val === undefined) return '""';
        if (typeof val === 'number') return `${val}`;
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(",");
    rows.push(row);
  });

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(rows.join("\r\n"));
  const link = document.createElement("a");
  link.setAttribute("href", csvContent);
  const cleanFilename = `${filename.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute("download", cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printAccountingReport(title: string) {
  // Sets title temporarily for print dialog and invokes native print
  const originalTitle = document.title;
  document.title = `${title} - FinFlow Accounting`;
  window.print();
  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}
