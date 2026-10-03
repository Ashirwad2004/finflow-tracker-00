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
import { TrendingDown, FileDown, Loader2, Settings2 } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { toast } from "@/core/hooks/use-toast";
import { LoanSettingsDialog } from "@/features/loans/components/LoanSettingsDialog";
import { exportBorrowedMoneyPdf } from "./borrowedMoneyPdfExport";
import { useBorrowedMoneyState } from "./useBorrowedMoneyState";
import { BorrowedMoneyList } from "./BorrowedMoneyList";
import { RecentlyRepaidBorrowedList } from "./RecentlyRepaidBorrowedList";

export * from "./borrowedMoneyPdfExport";
export * from "./useBorrowedMoneyState";
export * from "./BorrowedMoneyList";
export * from "./RecentlyRepaidBorrowedList";

export interface BorrowedMoneySectionProps {
  userId: string;
  onRefetchReady?: (refetch: () => Promise<void>) => void;
}

export const BorrowedMoneySection: React.FC<BorrowedMoneySectionProps> = ({
  userId,
  onRefetchReady,
}) => {
  const { formatCurrency, currency } = useCurrency();

  const {
    borrowedMoney,
    isLoading,
    pendingDebts,
    repaidDebts,
    totalPending,
    deleteDialogOpen,
    setDeleteDialogOpen,
    selectedDebt,
    isExporting,
    setIsExporting,
    isSettingsOpen,
    setIsSettingsOpen,
    markAsRepaid,
    handleDelete,
    confirmDelete,
  } = useBorrowedMoneyState(userId, onRefetchReady);

  const handleExportPDF = () => {
    if (!borrowedMoney || borrowedMoney.length === 0) {
      toast({
        title: "No data",
        description: "There are no records to export.",
        variant: "default",
      });
      return;
    }

    setIsExporting(true);
    try {
      exportBorrowedMoneyPdf(borrowedMoney, currency.symbol);
      toast({
        title: "Success",
        description: "Report downloaded successfully.",
      });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast({
        title: "Export Failed",
        description: "Could not generate the PDF.",
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
            <TrendingDown className="w-5 h-5 text-destructive" />
            Borrowed Money
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
                <TrendingDown className="w-5 h-5 text-destructive" />
                Borrowed Money
              </CardTitle>
              {pendingDebts.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {formatCurrency(totalPending)} to repay
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
                disabled={isExporting || borrowedMoney.length === 0}
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
          <BorrowedMoneyList
            pendingDebts={pendingDebts}
            formatCurrency={formatCurrency}
            onMarkRepaid={(id) => markAsRepaid.mutate(id)}
            onDelete={handleDelete}
          />
          <RecentlyRepaidBorrowedList
            repaidDebts={repaidDebts}
            formatCurrency={formatCurrency}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Borrowed Money Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record for{" "}
              <span className="font-medium">{selectedDebt?.person_name}</span>? This action
              cannot be undone.
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

      <LoanSettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
};

export default BorrowedMoneySection;
