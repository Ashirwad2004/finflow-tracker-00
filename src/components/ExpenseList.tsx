import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, Eye, FileDown } from "lucide-react";
import * as LucideIcons from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// 1. Add Alert Dialog Imports for safety
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useCurrency } from "@/contexts/CurrencyContext";

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  bill_url?: string | null;
  categories: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

interface ExpenseListProps {
  expenses: Expense[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onDeleteAll: () => void; // 2. Add new prop here
}

export const ExpenseList = ({ expenses, isLoading, onDelete, onDeleteAll }: ExpenseListProps) => {
  const { formatCurrency, currency } = useCurrency();
  const [billPreviewUrl, setBillPreviewUrl] = useState<string | null>(null);

  const formatDateForCSV = (d?: string | Date | null) => {
    // ... (keep logic, but we can't use "... (keep logic)" syntax with replace_file_content unless we are careful about ranges. 
    // Wait, reusing existing logic is better done by NOT replacing it if possible.
    // I can't easily skip blocks in replace_file_content.
    // Best to replace smaller chunks.)
    if (!d) return '';
    if (d instanceof Date && !isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
    if (typeof d === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;

      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
    return String(d);
  };

  const downloadCSV = (data: Expense[]) => {
    if (!data || data.length === 0) return;
    const header = ['id', 'description', 'amount', 'date', 'category'];
    const rows = data.map((e) => {
      const amount = typeof e.amount === 'number' ? e.amount : parseFloat(String(e.amount) || '0');
      const dateStr = formatDateForCSV(e.date);
      return [
        e.id,
        (e.description ?? '').replace(/"/g, '""'),
        amount.toFixed(2),
        dateStr,
        (e.categories?.name ?? '').replace(/"/g, '""'),
      ];
    });

    const csv = [header, ...rows].map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${formatDateForCSV(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Expense Report", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableColumn = ["Description", "Category", "Date", "Amount"];

    const tableRows = expenses.map(expense => {
      const amount = typeof expense.amount === 'number'
        ? expense.amount
        : parseFloat(String(expense.amount) || '0');

      return [
        expense.description,
        expense.categories.name,
        new Date(expense.date).toLocaleDateString(),
        `${currency.code} ${amount.toFixed(2)}`
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 41, 41],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        3: { halign: 'right' }
      }
    });

    doc.save(`expenses_${formatDateForCSV(new Date())}.pdf`);
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No expenses yet. Add your first expense to get started!</p>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (iconName: string) => {
    const iconKey = iconName.split('-').map((word: string) =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Icon = (LucideIcons as any)[iconKey];
    return Icon || LucideIcons.Circle;
  };

  return (
    <>
      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border gap-4">
            <h3 className="text-lg font-medium">Expenses</h3>

            {/* BUTTONS GROUP */}
            <div className="flex flex-wrap gap-2">
              {/* 3. New Delete All Button with Confirmation */}
              {expenses.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20">
                      <Trash2 className="h-4 w-4" />
                      Delete All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all {expenses.length} expenses from your list.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={onDeleteAll}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <Button onClick={downloadPDF} variant="outline" size="sm" className="gap-2">
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
              <Button onClick={() => downloadCSV(expenses)} variant="outline" size="sm">
                CSV
              </Button>
            </div>
          </div>

          <div className="divide-y divide-border">
            {expenses.map((expense) => {
              const Icon = getIcon(expense.categories.icon);
              return (
                <div
                  key={expense.id}
                  className="p-4 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${expense.categories.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: expense.categories.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{expense.description}</p>
                        {expense.bill_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setBillPreviewUrl(expense.bill_url!)}
                            title="View bill"
                          >
                            <FileText className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                        <span>{expense.categories.name}</span>
                        <span>•</span>
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="font-semibold text-lg text-foreground">
                      {formatCurrency(parseFloat(expense.amount.toString()))}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(expense.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bill Preview Dialog */}
      <Dialog open={!!billPreviewUrl} onOpenChange={() => setBillPreviewUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Bill Preview
            </DialogTitle>
          </DialogHeader>
          {billPreviewUrl && (
            billPreviewUrl.endsWith('.pdf') ? (
              <iframe
                src={billPreviewUrl}
                className="w-full h-[70vh] rounded-lg border"
                title="Bill PDF"
              />
            ) : (
              <img
                src={billPreviewUrl}
                alt="Bill"
                className="w-full rounded-lg"
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};