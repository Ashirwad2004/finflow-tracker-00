import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { History, ArrowUpIcon, ArrowDownIcon, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PartyTransactionHistoryProps {
  userId: string;
  party?: string;
}

interface PartyTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  transaction_type: string;
  categories: {
    name: string;
    color: string;
    icon: string;
  };
}

export const PartyTransactionHistory = ({ userId, party }: PartyTransactionHistoryProps) => {
  const [selectedParty, setSelectedParty] = useState<string | null>(party || null);

  const { data: parties = [] } = useQuery({
    queryKey: ["parties", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("party")
        .eq("user_id", userId)
        .not("party", "is", null)
        .not("party", "eq", "");

      if (error) throw error;

      // Get unique parties
      const uniqueParties = [...new Set(data.map(item => item.party))].filter(Boolean);
      return uniqueParties as string[];
    },
    enabled: !!userId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["party-transactions", userId, selectedParty],
    queryFn: async () => {
      if (!selectedParty) return [];

      const { data, error } = await supabase
        .from("expenses")
        .select(`
          id,
          description,
          amount,
          date,
          transaction_type,
          categories (
            name,
            color,
            icon
          )
        `)
        .eq("user_id", userId)
        .eq("party", selectedParty)
        .not("transaction_type", "is", null)
        .order("date", { ascending: false });

      if (error) throw error;
      return data as PartyTransaction[];
    },
    enabled: !!userId && !!selectedParty,
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <History className="w-4 h-4" />
          <span className="sr-only">History</span>
        </Button>
      </DialogTrigger>
      
      {/* Responsive Dialog Content:
        - w-[95vw]: Almost full width on mobile
        - sm:max-w-2xl: Comfortable width on desktop
        - max-h-[90vh]: Prevents overflow on screen
        - flex flex-col: Allows header to be fixed and body to scroll
      */}
      <DialogContent className="w-[95vw] sm:max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
             {selectedParty && !party && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 -ml-2 mr-1 sm:hidden" 
                  onClick={() => setSelectedParty(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
             )}
             {selectedParty ? `History: ${selectedParty}` : "Transaction History"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6">
              {!selectedParty ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Select a party to view their transaction history.</p>
                  
                  {/* Responsive Grid for Parties */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {parties.map((partyName) => (
                      <Button
                        key={partyName}
                        variant="outline"
                        className="justify-start h-auto py-3 px-4 text-left truncate"
                        onClick={() => setSelectedParty(partyName)}
                      >
                        <span className="truncate">{partyName}</span>
                      </Button>
                    ))}
                  </div>

                  {parties.length === 0 && (
                    <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                      <p className="text-muted-foreground">No parties found.</p>
                      <p className="text-xs text-muted-foreground mt-1">Add expenses with party details to see them here.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found
                    </p>
                    
                    {!party && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="hidden sm:flex"
                        onClick={() => setSelectedParty(null)}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Parties
                      </Button>
                    )}
                  </div>

                  {transactions.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                      <p className="text-muted-foreground">No transactions found for this party.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((transaction) => (
                        <Card key={transaction.id} className="p-3 sm:p-4 hover:bg-muted/40 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            {/* Left Content */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              {/* Description & Badge Row */}
                              <div className="flex items-start sm:items-center gap-2 flex-col sm:flex-row sm:flex-wrap">
                                <span className="font-medium truncate max-w-full text-sm sm:text-base leading-tight">
                                  {transaction.description}
                                </span>
                                <Badge
                                  variant={transaction.transaction_type === 'received' ? 'default' : 'secondary'}
                                  className={`w-fit text-[10px] sm:text-xs px-1.5 py-0.5 h-5 sm:h-6 ${
                                    transaction.transaction_type === 'received'
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                                      : 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300'
                                  }`}
                                >
                                  {transaction.transaction_type === 'received' ? (
                                    <span className="flex items-center gap-1">
                                      <ArrowUpIcon className="w-3 h-3" /> Received
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <ArrowDownIcon className="w-3 h-3" /> Payable
                                    </span>
                                  )}
                                </Badge>
                              </div>

                              {/* Meta Info Row */}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted">
                                  {transaction.categories.name}
                                </span>
                                <span>•</span>
                                <span>{new Date(transaction.date).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Right Content (Amount) */}
                            <div className="text-right shrink-0 pt-0.5">
                              <span className={`font-bold text-base sm:text-lg ${
                                transaction.transaction_type === 'received' 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-orange-600 dark:text-orange-400'
                              }`}>
                                ₹{parseFloat(transaction.amount.toString()).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};