import { Wallet } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface PartyPendingBalanceCardProps {
  showPartyPreviousBalance: boolean;
  onTogglePartyPendingBalance: (checked: boolean) => void;
}

export function PartyPendingBalanceCard({
  showPartyPreviousBalance,
  onTogglePartyPendingBalance,
}: PartyPendingBalanceCardProps) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Wallet className="w-3.5 h-3.5 text-primary" />
          7. Show Party Pending Balance
        </h2>
        <Switch
          checked={showPartyPreviousBalance}
          onCheckedChange={onTogglePartyPendingBalance}
        />
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">
        {showPartyPreviousBalance
          ? "Displaying party's overall pending balance and closing net balance at the bottom of bills."
          : "Party pending balance is hidden. Only current bill amount is shown."}
      </p>
    </div>
  );
}
