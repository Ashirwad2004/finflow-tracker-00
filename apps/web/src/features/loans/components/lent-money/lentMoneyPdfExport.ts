import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface LentMoneyRecord {
  id: string;
  amount: number;
  person_name: string;
  description: string;
  due_date: string | null;
  status: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export function exportLentMoneyPdf(
  lentMoney: LentMoneyRecord[],
  isBusinessMode: boolean,
  totalPending: number,
  currencySymbol: string
): void {
  const doc = new jsPDF();
  const title = isBusinessMode ? "Accounts Receivable Report" : "Lent Money Report";

  doc.setFontSize(18);
  doc.text(title, 14, 22);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  doc.text(`Total Pending: ${currencySymbol}${totalPending.toFixed(2)}`, 14, 38);

  const tableColumn = ["Person", "Description", "Due Date", "Status", "Amount"];
  const tableRows = lentMoney.map((loan) => [
    loan.person_name,
    loan.description || "-",
    loan.due_date ? new Date(loan.due_date).toLocaleDateString() : "-",
    loan.status,
    `${currencySymbol}${loan.amount}`,
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 45,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [41, 41, 41], textColor: 255, fontStyle: "bold" },
    columnStyles: { 4: { halign: "right" } },
  });

  doc.save(`lent_money_report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
