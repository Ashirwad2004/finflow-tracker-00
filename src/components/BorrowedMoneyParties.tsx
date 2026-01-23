import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, Loader2, Plus, UserPlus } from "lucide-react";

interface BorrowedMoneyPartiesProps {
    userId: string;
    onAddTransaction: (personName?: string) => void;
}

interface PartyStats {
    personName: string;
    totalPending: number;
    count: number;
    lastTransactionDate: string;
}

export const BorrowedMoneyParties = ({ userId, onAddTransaction }: BorrowedMoneyPartiesProps) => {
    const { data: parties = [], isLoading } = useQuery({
        queryKey: ["borrowed-money-parties", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("borrowed_money" as any)
                .select("*")
                .eq("user_id", userId)
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            if (error) throw error;

            const typedData = data as any[];

            // Group by person_name
            const partyMap = new Map<string, PartyStats>();

            typedData.forEach((record) => {
                const name = record.person_name.trim(); // Normalize name
                const current = partyMap.get(name) || {
                    personName: name,
                    totalPending: 0,
                    count: 0,
                    lastTransactionDate: record.created_at,
                };

                current.totalPending += Number(record.amount);
                current.count += 1;
                partyMap.set(name, current);
            });

            return Array.from(partyMap.values());
        },
        enabled: !!userId,
    });

    const avatarColors = [
        "bg-red-500", "bg-orange-500", "bg-rose-500", "bg-pink-500", "bg-amber-500",
    ];
    const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 pb-20">

            {/* Add New Debt Card */}
            <Card
                className="border-dashed border-2 px-4 hover:border-destructive/50 hover:bg-destructive/5 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[180px] gap-3 group"
                onClick={() => onAddTransaction()}
            >
                <div className="h-12 w-12 rounded-full bg-muted group-hover:bg-destructive/10 flex items-center justify-center transition-colors">
                    <UserPlus className="w-6 h-6 text-muted-foreground group-hover:text-destructive" />
                </div>
                <div className="text-center">
                    <h3 className="font-semibold text-muted-foreground group-hover:text-destructive">Add New Creditor</h3>
                    <p className="text-xs text-muted-foreground/60">Record a debt from a new person</p>
                </div>
            </Card>

            {parties.map((party) => (
                <Card key={party.personName} className="hover:shadow-md transition-all group relative overflow-hidden border-l-4 border-l-destructive/0 hover:border-l-destructive">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {party.lastTransactionDate && new Date(party.lastTransactionDate).toLocaleDateString()}
                        </CardTitle>
                        <Badge variant="outline" className="bg-destructive/5 border-destructive/20 text-destructive">
                            {party.count} debt{party.count !== 1 ? 's' : ''}
                        </Badge>

                        {/* Quick Add Button */}
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-muted/50 opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-destructive-foreground"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddTransaction(party.personName);
                            }}
                            title={`Add debt for ${party.personName}`}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 mb-4">
                            <Avatar className={`h-12 w-12 ${getAvatarColor(party.personName)} border-2 border-background shadow-sm`}>
                                <AvatarFallback className="text-white text-lg font-bold">
                                    {party.personName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <h3 className="text-lg font-bold truncate group-hover:text-destructive transition-colors">
                                    {party.personName}
                                </h3>
                                <p className="text-xs text-muted-foreground">Owes You</p>
                            </div>
                        </div>

                        <div className="flex items-end justify-between border-t pt-3">
                            <div className="text-2xl font-bold text-destructive">
                                ₹{party.totalPending.toFixed(2)}
                            </div>
                            <Button
                                className="h-8 text-xs sm:hidden"
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddTransaction(party.personName);
                                }}
                            >
                                Add +
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
