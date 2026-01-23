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
    FileDown,
    Loader2,
    TrendingDown
} from "lucide-react";
import { format } from "date-fns";
import { BorrowedMoneyDialog } from "./BorrowedMoneyDialog"; // We can reuse Dialog for edit if we adapt it or create EditBorrowedMoneyDialog. For now, let's assume simple edit or skip edit for MVP. 
// Actually, LentMoney had EditLentMoneyDialog. I should probably skip Edit for now or reuse BorrowedMoneyDialog if possible. 
// For simplicity in this "Add feature" request, I will skip complex Edit dialog for now or implement Delete/Mark Repaid first.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface BorrowedMoneySectionProps {
    userId: string;
}

interface BorrowedMoneyRecord {
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

export const BorrowedMoneySection = ({ userId }: BorrowedMoneySectionProps) => {
    const queryClient = useQueryClient();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<BorrowedMoneyRecord | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const { data: borrowedMoney = [], isLoading } = useQuery({
        queryKey: ["borrowed-money", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("borrowed_money")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as BorrowedMoneyRecord[];
        },
        enabled: !!userId,
    });

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
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text("Borrowed Money Report", 14, 22);
            doc.setFontSize(11);
            doc.text(`Generated on: ${format(new Date(), "MMM d, yyyy")}`, 14, 30);

            const tableBody = borrowedMoney.map((record) => [
                format(new Date(record.created_at), "MMM d, yyyy"),
                record.person_name,
                record.description,
                `Rs. ${record.amount}`,
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

    const markAsRepaid = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("borrowed_money")
                .update({ status: "repaid" })
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["borrowed-money"] });
            // Also invalidate parties
            queryClient.invalidateQueries({ queryKey: ["borrowed-money-parties"] });
            toast({
                title: "Marked as repaid",
                description: "The debt has been marked as repaid.",
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

    const deleteDebt = useMutation({
        mutationFn: async (debt: BorrowedMoneyRecord) => {
            const { error } = await supabase
                .from("borrowed_money")
                .delete()
                .eq("id", debt.id);

            if (error) throw error;

            // Store in recently deleted (optional)
            const key = `recently_deleted_borrowed_money_${userId}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            existing.push({ ...debt, deleted_at: new Date().toISOString() });
            localStorage.setItem(key, JSON.stringify(existing));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["borrowed-money"] });
            queryClient.invalidateQueries({ queryKey: ["borrowed-money-parties"] });
            toast({
                title: "Record deleted",
                description: "The borrowed money record has been moved to recently deleted.",
            });
            setDeleteDialogOpen(false);
            setSelectedDebt(null);
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to delete record. Please try again.",
                variant: "destructive",
            });
        },
    });

    const handleDelete = (debt: BorrowedMoneyRecord) => {
        setSelectedDebt(debt);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (selectedDebt) {
            deleteDebt.mutate(selectedDebt);
        }
    };

    const pendingDebts = borrowedMoney.filter((debt) => debt.status === "pending");
    const repaidDebts = borrowedMoney.filter((debt) => debt.status === "repaid");
    const totalPending = pendingDebts.reduce(
        (sum, debt) => sum + parseFloat(debt.amount.toString()),
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
            <Card className="shadow-card border-l-4 border-l-destructive/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <TrendingDown className="w-5 h-5 text-destructive" />
                                Borrowed Money
                            </CardTitle>
                            {pendingDebts.length > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                    ₹{totalPending.toFixed(2)} pending
                                </Badge>
                            )}
                        </div>

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
                </CardHeader>
                <CardContent className="space-y-3">
                    {pendingDebts.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                            <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No pending debts. You are debt-free!</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                            {pendingDebts.map((debt) => (
                                <div
                                    key={debt.id}
                                    className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-border transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            <span className="font-medium truncate">{debt.person_name}</span>
                                            {isOverdue(debt.due_date) && (
                                                <Badge variant="destructive" className="text-xs">
                                                    <AlertCircle className="w-3 h-3 mr-1" />
                                                    Overdue
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate mb-1">
                                            {debt.description}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="font-semibold text-destructive">
                                                ₹{parseFloat(debt.amount.toString()).toFixed(2)}
                                            </span>
                                            {debt.due_date && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    Due: {format(new Date(debt.due_date), "MMM d, yyyy")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => markAsRepaid.mutate(debt.id)}
                                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
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
                                                {/* Edit skipped for now */}
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(debt)}
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

                    {repaidDebts.length > 0 && (
                        <div className="pt-3 border-t border-border/50">
                            <p className="text-xs text-muted-foreground mb-2">
                                Recently repaid ({repaidDebts.length})
                            </p>
                            <div className="space-y-2">
                                {repaidDebts.slice(0, 3).map((debt) => (
                                    <div
                                        key={debt.id}
                                        className="flex items-center justify-between p-2 rounded bg-muted/20 text-sm"
                                    >
                                        <span className="text-muted-foreground truncate">
                                            {debt.person_name}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs text-green-600">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                ₹{parseFloat(debt.amount.toString()).toFixed(2)}
                                            </Badge>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                                        <MoreVertical className="w-3 h-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(debt)}
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
                        <AlertDialogTitle>Delete Borrowed Money Record</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this debt record for{" "}
                            <span className="font-medium">{selectedDebt?.person_name}</span>? This
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
        </>
    );
};
