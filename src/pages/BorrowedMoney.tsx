import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { BorrowedMoneySection } from "@/components/BorrowedMoneySection";
import { BorrowedMoneyParties } from "@/components/BorrowedMoneyParties";
import { BorrowedMoneyDialog } from "@/components/BorrowedMoneyDialog";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, List, Users } from "lucide-react";
import { useState, useRef, useCallback } from "react";

const BorrowedMoney = () => {
    const { user } = useAuth();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [defaultPersonName, setDefaultPersonName] = useState("");
    const refetchFnRef = useRef<(() => Promise<void>) | null>(null);

    const handleAddTransaction = (name?: string) => {
        setDefaultPersonName(name || "");
        setIsDialogOpen(true);
    };

    const handleRefresh = useCallback(async () => {
        if (refetchFnRef.current) {
            await refetchFnRef.current();
        }
    }, []);

    const handleRefetchReady = useCallback((refetch: () => Promise<void>) => {
        refetchFnRef.current = refetch;
    }, []);

    return (
        <AppLayout>
            <PullToRefresh onRefresh={handleRefresh}>
                <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 h-full flex flex-col">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Borrowed Money</h1>
                            <p className="text-muted-foreground text-sm sm:text-base">Track money you've borrowed (Debts)</p>
                        </div>
                        <Button onClick={() => handleAddTransaction()} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground w-full sm:w-auto shadow-lg shadow-destructive/20">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Debt
                        </Button>
                    </div>

                    <Tabs defaultValue="transactions" className="flex-1 flex flex-col">
                        <TabsList className="grid w-full grid-cols-2 mb-6 sm:w-[400px]">
                            <TabsTrigger value="transactions" className="flex items-center gap-2">
                                <List className="w-4 h-4" /> Transactions
                            </TabsTrigger>
                            <TabsTrigger value="parties" className="flex items-center gap-2">
                                <Users className="w-4 h-4" /> Parties (Aggregated)
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="transactions" className="flex-1">
                            <BorrowedMoneySection userId={user?.id || ""} onRefetchReady={handleRefetchReady} />
                        </TabsContent>

                        <TabsContent value="parties" className="flex-1">
                            <BorrowedMoneyParties userId={user?.id || ""} onAddTransaction={handleAddTransaction} />
                        </TabsContent>
                    </Tabs>

                    <BorrowedMoneyDialog
                        open={isDialogOpen}
                        onOpenChange={setIsDialogOpen}
                        userId={user?.id || ""}
                        defaultPersonName={defaultPersonName}
                    />
                </div>
            </PullToRefresh>
        </AppLayout>
    );
};

export default BorrowedMoney;
