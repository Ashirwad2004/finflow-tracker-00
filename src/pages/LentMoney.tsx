import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { LentMoneySection } from "@/components/LentMoneySection";
import { LentMoneyDialog } from "@/components/LentMoneyDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

const LentMoney = () => {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lent Money</h1>
            <p className="text-muted-foreground">Track money you've lent to others</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        </div>

        <LentMoneySection userId={user?.id || ""} />

        <LentMoneyDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          userId={user?.id || ""}
        />
      </div>
    </AppLayout>
  );
};

export default LentMoney;
