import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, FileDown, Loader2, Settings2 } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { toast } from "@/core/hooks/use-toast";
import { EditLentMoneyDialog } from "@/features/loans/components/EditLentMoneyDialog";
import { LoanSettingsDialog } from "@/features/loans/components/LoanSettingsDialog";
import { exportLentMoneyPdf } from "./lentMoneyPdfExport";
import { useLentMoneyState } from "./useLentMoneyState";
import { LentMoneyList } from "./LentMoneyList";
import { RecentlyRepaidList } from "./RecentlyRepaidList";

export * from "./lentMoneyPdfExport";
export * from "./useLentMoneyState";
export * from "./LentMoneyList";
export * from "./RecentlyRepaidList";

export interface LentMoneySectionProps {
  userId: string;
}

export const LentMoneySection: React.FC<LentMoneySectionProps> = ({ userId }) => {
  const { formatCurrency, currency } = useCurrency();
  const { isBusinessMode } = useBusiness();

  const {
    lentMoney,
    isLoading,
    pendingLoans,
    repaidLoans,
    totalPending,
    deleteDialogOpen,
    setDeleteDialogOpen,
    selectedLoan,
    editDialogOpen,
    setEditDialogOpen,
    isExporting,
    setIsExporting,
    isSettingsOpen,
    setIsSettingsOpen,
    markAsRepaid,
    handleDelete,
    confirmDelete,
    handleEdit,
  } = useLentMoneyState(userId);

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      exportLentMoneyPdf(lentMoney, isBusinessMode, totalPending, currency.symbol);
      toast({
        title: "Export Success",
        description: "PDF report has been downloaded.",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Could not generate PDF report.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {isBusinessMode ? "Accounts Receivable / Debts" : "Lent Money"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {isBusinessMode ? "Accounts Receivable / Debts" : "Lent Money"}
              </CardTitle>
              {pendingLoans.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {formatCurrency(totalPending)} pending
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSettingsOpen(true)}
                className="h-8"
              >
                <Settings2 className="w-3.5 h-3.5 mr-2" />
                Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting || lentMoney.length === 0}
                className="h-8"
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 mr-2" />
                )}
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <LentMoneyList
            pendingLoans={pendingLoans}
            formatCurrency={formatCurrency}
            onMarkRepaid={(id) => markAsRepaid.mutate(id)}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          <RecentlyRepaidList
            repaidLoans={repaidLoans}
            formatCurrency={formatCurrency}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lent Money Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record for{" "}
              <span className="font-medium">{selectedLoan?.person_name}</span>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditLentMoneyDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        lentMoney={selectedLoan}
      />
      <LoanSettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
};

export default LentMoneySection;
