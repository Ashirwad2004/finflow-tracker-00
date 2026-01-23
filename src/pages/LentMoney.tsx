import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { LentMoneySection } from "@/components/LentMoneySection";
import { LentMoneyParties } from "@/components/LentMoneyParties";
import { LentMoneyDialog } from "@/components/LentMoneyDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, List, Users } from "lucide-react";
import { useState } from "react";

const LentMoney = () => {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [defaultPersonName, setDefaultPersonName] = useState("");

  const handleAddTransaction = (name?: string) => {
    setDefaultPersonName(name || "");
    setIsDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Lent Money</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Track money you've lent to others</p>
          </div>
          <Button onClick={() => handleAddTransaction()} className="bg-gradient-primary w-full sm:w-auto shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
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
            <LentMoneySection userId={user?.id || ""} />
          </TabsContent>

          <TabsContent value="parties" className="flex-1">
            <LentMoneyParties userId={user?.id || ""} onAddTransaction={handleAddTransaction} />
          </TabsContent>
        </Tabs>

        <LentMoneyDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          userId={user?.id || ""}
          defaultPersonName={defaultPersonName}
        />
      </div>
    </AppLayout>
  );
};

export default LentMoney;
