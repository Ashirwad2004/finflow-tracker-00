import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpIcon, ArrowDownIcon, Users } from "lucide-react";
import { PartyTransactionHistory } from "./PartyTransactionHistory";

interface PartyWiseSectionProps {
  userId: string;
}

interface PartyBalance {
  party: string;
  totalReceived: number;
  totalPayable: number;
  netBalance: number;
  transactionCount: number;
}

export const PartyWiseSection = ({ userId }: PartyWiseSectionProps) => {
  const { data: partyBalances = [], isLoading } = useQuery({
    queryKey: ["party-balances", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("party, transaction_type, amount")
        .eq("user_id", userId)
        .not("party", "is", null)
        .not("transaction_type", "is", null);

      if (error) throw error;

      // Group by party and calculate balances
      const balances: { [key: string]: PartyBalance } = {};

      data.forEach((expense) => {
        const party = expense.party!;
        const amount = parseFloat(expense.amount.toString());

        if (!balances[party]) {
          balances[party] = {
            party,
            totalReceived: 0,
            totalPayable: 0,
            netBalance: 0,
            transactionCount: 0,
          };
        }

        balances[party].transactionCount += 1;

        if (expense.transaction_type === "received") {
          balances[party].totalReceived += amount;
          balances[party].netBalance += amount; // Positive for money received
        } else if (expense.transaction_type === "payable") {
          balances[party].totalPayable += amount;
          balances[party].netBalance -= amount; // Negative for money to pay
        }
      });

      return Object.values(balances).sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Party-wise Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between animate-pulse gap-2">
                <div className="space-y-2 w-full">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
                <div className="h-4 w-20 bg-muted rounded self-end sm:self-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (partyBalances.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Party-wise Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No party transactions yet. Add expenses with party details to see balances here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Party-wise Balances
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 sm:space-y-4">
          {partyBalances.map((balance) => (
            <div
              key={balance.party}
              // Changed Layout: flex-col on mobile, flex-row on desktop
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3 sm:gap-4"
            >
              {/* Left Section: Info */}
              <div className="flex-1 w-full min-w-0">
                {/* Name Row */}
                <div className="flex items-center gap-2 flex-wrap mb-1.5 sm:mb-1">
                  <h4 className="font-medium text-foreground truncate max-w-[200px] sm:max-w-xs" title={balance.party}>
                    {balance.party}
                  </h4>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs h-5 px-1.5 whitespace-nowrap">
                    {balance.transactionCount} {balance.transactionCount === 1 ? 'txn' : 'txns'}
                  </Badge>
                  <div className="ml-auto sm:ml-0">
                    <PartyTransactionHistory userId={userId} party={balance.party} />
                  </div>
                </div>
                
                {/* Stats Row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                  <span className="whitespace-nowrap">
                    Received: <span className="font-medium text-foreground">₹{balance.totalReceived.toFixed(2)}</span>
                  </span>
                  <span className="hidden sm:inline text-muted-foreground/50">•</span>
                  <span className="whitespace-nowrap">
                    Payable: <span className="font-medium text-foreground">₹{balance.totalPayable.toFixed(2)}</span>
                  </span>
                </div>
              </div>

              {/* Right Section: Net Balance */}
              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-dashed sm:border-none">
                <span className="text-xs font-medium text-muted-foreground sm:hidden">
                  Net Balance:
                </span>
                <div className="flex items-center gap-1.5">
                  {balance.netBalance > 0 ? (
                    <ArrowUpIcon className="w-4 h-4 text-green-600 shrink-0" />
                  ) : balance.netBalance < 0 ? (
                    <ArrowDownIcon className="w-4 h-4 text-red-600 shrink-0" />
                  ) : null}
                  <span
                    className={`font-semibold text-base sm:text-lg whitespace-nowrap ${
                      balance.netBalance > 0
                        ? "text-green-600"
                        : balance.netBalance < 0
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    ₹{Math.abs(balance.netBalance).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend Footer */}
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs sm:text-sm text-muted-foreground text-center flex flex-col sm:flex-row justify-center gap-1 sm:gap-4">
            <span className="flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-600 inline-block"></span>
              <strong>Green:</strong> You will receive money
            </span>
            <span className="hidden sm:inline text-muted-foreground/30">•</span>
            <span className="flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
              <strong>Red:</strong> You need to pay money
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};