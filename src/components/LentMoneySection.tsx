import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { 
  User, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  MoreVertical, 
  Pencil, 
  Trash2,
  FileDown, // Import FileDown icon
  Loader2   // Import Loader icon
} from "lucide-react";
import { format } from "date-fns";
import { EditLentMoneyDialog } from "./EditLentMoneyDialog";
import jsPDF from "jspdf"; // Import jsPDF
import autoTable from "jspdf-autotable"; // Import autoTable

interface LentMoneySectionProps {
  userId: string;
}

interface LentMoneyRecord {
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

export const LentMoneySection = ({ userId }: LentMoneySectionProps) => {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LentMoneyRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false); // State for export loading

  const { data: lentMoney = [], isLoading } = useQuery({
    queryKey: ["lent-money", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lent_money")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LentMoneyRecord[];
    },
    enabled: !!userId,
  });

  // --- NEW: Handle PDF Export ---
  const handleExportPDF = () => {
    if (!lentMoney || lentMoney.length === 0) {
      toast({
        title: "No data",
        description: "There are no records to export.",
        variant: "default",
      });
      return;
    }

    setIsExporting(true);

    try {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.text("Lent Money Report", 14, 22);
      doc.setFontSize(11);
      doc.text(`Generated on: ${format(new Date(), "MMM d, yyyy")}`, 14, 30);

      // Prepare data for table
      const tableBody = lentMoney.map((record) => [
        format(new Date(record.created_at), "MMM d, yyyy"), // Date
        record.person_name, // Person
        record.description, // Description
        `Rs. ${record.amount}`, // Amount
        record.due_date ? format(new Date(record.due_date), "MMM d, yyyy") : "No Due Date", // Due Date
        record.status.toUpperCase(), // Status
      ]);

      // Generate Table
      autoTable(doc, {
        head: [["Date Created", "Person", "Description", "Amount", "Due Date", "Status"]],
        body: tableBody,
        startY: 35,
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 66, 66] },
      });

      // Save File
      doc.save(`lent_money_records_${format(new Date(), "yyyy-MM-dd")}.pdf`);

      toast({
        title: "Success",
        description: "Lent money report downloaded successfully.",
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

  const markAsRepaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lent_money")
        .update({ status: "repaid" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lent-money"] });
      toast({
        title: "Marked as repaid",
        description: "The loan has been marked as repaid.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteLoan = useMutation({
    mutationFn: async (loan: LentMoneyRecord) => {
      const { error } = await supabase
        .from("lent_money")
        .delete()
        .eq("id", loan.id);

      if (error) throw error;

      // Store in recently deleted
      const key = `recently_deleted_lent_money_${userId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({ ...loan, deleted_at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(existing));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lent-money"] });
      toast({
        title: "Record deleted",
        description: "The lent money record has been moved to recently deleted.",
      });
      setDeleteDialogOpen(false);
      setSelectedLoan(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete record. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (loan: LentMoneyRecord) => {
    setSelectedLoan(loan);
    setEditDialogOpen(true);
  };

  const handleDelete = (loan: LentMoneyRecord) => {
    setSelectedLoan(loan);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedLoan) {
      deleteLoan.mutate(selectedLoan);
    }
  };

  const pendingLoans = lentMoney.filter((loan) => loan.status === "pending");
  const repaidLoans = lentMoney.filter((loan) => loan.status === "repaid");
  const totalPending = pendingLoans.reduce(
    (sum, loan) => sum + parseFloat(loan.amount.toString()),
    0
  );

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Lent Money
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
                Lent Money
              </CardTitle>
              {pendingLoans.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  ₹{totalPending.toFixed(2)} pending
                </Badge>
              )}
            </div>
            
            {/* --- NEW: PDF Export Button --- */}
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
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingLoans.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No pending loans</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {pendingLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-border transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">{loan.person_name}</span>
                      {isOverdue(loan.due_date) && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-1">
                      {loan.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        ₹{parseFloat(loan.amount.toString()).toFixed(2)}
                      </span>
                      {loan.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {format(new Date(loan.due_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsRepaid.mutate(loan.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Repaid
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(loan)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(loan)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {repaidLoans.length > 0 && (
            <div className="pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">
                Recently repaid ({repaidLoans.length})
              </p>
              <div className="space-y-2">
                {repaidLoans.slice(0, 3).map((loan) => (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between p-2 rounded bg-muted/20 text-sm"
                  >
                    <span className="text-muted-foreground truncate">
                      {loan.person_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        ₹{parseFloat(loan.amount.toString()).toFixed(2)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(loan)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(loan)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lent Money Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record for{" "}
              <span className="font-medium">{selectedLoan?.person_name}</span>? This
              action cannot be undone.
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
    </>
  );
};