export const convertToCSV = (data: Record<string, unknown[]>): string => {
  const csvSections: string[] = [];

  for (const [tableName, rows] of Object.entries(data)) {
    if (!Array.isArray(rows) || rows.length === 0) continue;

    // Add section header
    csvSections.push(`\n=== ${tableName.toUpperCase()} ===\n`);

    // Get headers from first row
    const headers = Object.keys(rows[0] as object);
    csvSections.push(headers.join(","));

    // Add data rows
    for (const row of rows) {
      const values = headers.map((header) => {
        const value = (row as Record<string, unknown>)[header];
        if (value === null || value === undefined) return "";
        if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvSections.push(values.join(","));
    }
  }

  return csvSections.join("\n");
};
