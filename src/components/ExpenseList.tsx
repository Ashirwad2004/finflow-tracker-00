import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, Eye, FileDown, Building2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";

import { useCurrency } from "@/contexts/CurrencyContext";
import { useBusiness } from "@/contexts/BusinessContext";

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  bill_url?: string | null;
  // Business fields
  tax_amount?: number | null;
  invoice_number?: string | null;
  vendor_name?: string | null;
  is_reimbursable?: boolean | null;
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
  onDeleteAll: () => void;
}

export const ExpenseList = ({ expenses, isLoading, onDelete, onDeleteAll }: ExpenseListProps) => {
  const { formatCurrency, currency } = useCurrency();
  const { isBusinessMode } = useBusiness();
  const [billPreviewUrl, setBillPreviewUrl] = useState<string | null>(null);

  const formatDateForCSV = (d?: string | Date | null) => {
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

    let header = ['id', 'description', 'amount', 'date', 'category'];
    if (isBusinessMode) {
      header = [...header, 'vendor', 'invoice_no', 'tax_amount', 'reimbursable'];
    }

    const rows = data.map((e) => {
      const amount = typeof e.amount === 'number' ? e.amount : parseFloat(String(e.amount) || '0');
      const dateStr = formatDateForCSV(e.date);

      const basicRow = [
        e.id,
        (e.description ?? '').replace(/"/g, '""'),
        amount.toFixed(2),
        dateStr,
        (e.categories?.name ?? '').replace(/"/g, '""'),
      ];

      if (isBusinessMode) {
        return [
          ...basicRow,
          (e.vendor_name ?? '').replace(/"/g, '""'),
          (e.invoice_number ?? '').replace(/"/g, '""'),
          (e.tax_amount || 0).toFixed(2),
          e.is_reimbursable ? 'Yes' : 'No'
        ];
      }
      return basicRow;
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
    const title = isBusinessMode ? "Business Expense Report" : "Expense Report";

    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    let tableColumn = ["Description", "Category", "Date", "Amount"];
    // Adjust column headers for business mode
    if (isBusinessMode) {
      tableColumn = ["Description", "Vendor", "Invoice", "Date", "Tax", "Amount"];
    }

    const tableRows = expenses.map(expense => {
      const amount = typeof expense.amount === 'number'
        ? expense.amount
        : parseFloat(String(expense.amount) || '0');

      if (isBusinessMode) {
        return [
          expense.description,
          expense.vendor_name || '-',
          expense.invoice_number || '-',
          new Date(expense.date).toLocaleDateString(),
          expense.tax_amount ? `${currency.symbol}${expense.tax_amount}` : '-',
          `${currency.code} ${amount.toFixed(2)}`
        ];
      }

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
        fontSize: isBusinessMode ? 8 : 10, // Smaller font if more columns
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 41, 41],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: isBusinessMode ? { 5: { halign: 'right' }, 4: { halign: 'right' } } : { 3: { halign: 'right' } }
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
            {expenses.map((expense, index) => {
              // Safety check for category
              const categoryName = expense.categories?.name || 'Uncategorized';
              const categoryColor = expense.categories?.color || '#94a3b8'; // slate-400
              const iconName = expense.categories?.icon || 'circle';
              const Icon = getIcon(iconName);

              return (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group relative overflow-hidden"
                >
                  <div className="flex items-center gap-4 flex-1 z-10">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-black/5 dark:border-white/5"
                      style={{ backgroundColor: `${categoryColor}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: categoryColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate text-sm sm:text-base">{expense.description}</p>
                        {isBusinessMode && expense.is_reimbursable && (
                          <Badge variant="secondary" className="text-[10px] px-1 h-5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-transparent">Reimbursable</Badge>
                        )}
                        {expense.bill_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-60 hover:opacity-100"
                            onClick={() => setBillPreviewUrl(expense.bill_url!)}
                            title="View bill"
                          >
                            <FileText className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        )}
                      </div>

                      {/* Subtitles: Category, Date, Vendor/Invoice for Business */}
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
                        <span className="flex items-center gap-1">{categoryName}</span>
                        <span>•</span>
                        <span>{new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>

                        {isBusinessMode && (expense.vendor_name || expense.invoice_number) && (
                          <>
                            <span className="hidden sm:inline opacity-30">|</span>
                            <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                              {expense.vendor_name && (
                                <span className="flex items-center gap-1 text-xs bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground/80">
                                  <Building2 className="w-3 h-3" /> {expense.vendor_name}
                                </span>
                              )}
                              {expense.invoice_number && (
                                <span className="text-xs font-mono opacity-70">#{expense.invoice_number}</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 ml-16 sm:ml-0 z-10">
                    <div className="text-right">
                      <span className="font-bold text-base sm:text-lg text-foreground block tracking-tight">
                        {formatCurrency(parseFloat(expense.amount.toString()))}
                      </span>
                      {isBusinessMode && expense.tax_amount ? (
                        <span className="text-xs text-muted-foreground block font-medium">
                          + {formatCurrency(expense.tax_amount)} Tax
                        </span>
                      ) : null}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        // Placeholder for edit action if needed later
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      >
                        {/* Edit Icon could go here */}
                        <Building2 className="w-4 h-4 opacity-0" /> {/* Hidden filler or use Edit icon */}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(expense.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
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