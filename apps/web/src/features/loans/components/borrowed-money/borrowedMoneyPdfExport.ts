import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface BorrowedMoneyRecord {
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

export function exportBorrowedMoneyPdf(
  borrowedMoney: BorrowedMoneyRecord[],
  currencySymbol: string
): void {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Borrowed Money Report", 14, 22);
  doc.setFontSize(11);
  doc.text(`Generated on: ${format(new Date(), "MMM d, yyyy")}`, 14, 30);

  const tableBody = borrowedMoney.map((record) => [
    format(new Date(record.created_at), "MMM d, yyyy"),
    record.person_name,
    record.description,
    `${currencySymbol} ${record.amount}`,
    record.due_date ? format(new Date(record.due_date), "MMM d, yyyy") : "No Due Date",
    record.status.toUpperCase(),
  ]);

  autoTable(doc, {
    head: [["Date Created", "Person", "Description", "Amount", "Due Date", "Status"]],
    body: tableBody,
    startY: 35,
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [220, 38, 38] }, // Red for debt
  });

  doc.save(`borrowed_money_records_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
