import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, UserPlus } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface LentMoneyPartiesProps {
    userId: string;
    onAddTransaction: (personName?: string) => void;
}

interface PartyStats {
    personName: string;
    totalPending: number;
    count: number;
    lastTransactionDate: string;
}

export const LentMoneyParties = ({ userId, onAddTransaction }: LentMoneyPartiesProps) => {
    const { formatCurrency } = useCurrency();
    const { data: parties = [], isLoading } = useQuery({
        queryKey: ["lent-money-parties", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lent_money")
                .select("*")
                .eq("user_id", userId)
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Group by person_name
            const partyMap = new Map<string, PartyStats>();

            data.forEach((record) => {
                const name = record.person_name.trim(); // Normalize name
                const current = partyMap.get(name) || {
                    personName: name,
                    totalPending: 0,
                    count: 0,
                    lastTransactionDate: record.created_at,
                };

                current.totalPending += Number(record.amount);
                current.count += 1;
                // Since we ordered by created_at desc, the first one encountered is the latest
                partyMap.set(name, current);
            });

            return Array.from(partyMap.values());
        },
        enabled: !!userId,
    });

    const avatarColors = [
        "bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500", "bg-orange-500",
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

            {/* Add New Party Card */}
            <Card
                className="border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[180px] gap-3 group"
                onClick={() => onAddTransaction()}
            >
                <div className="h-12 w-12 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <UserPlus className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="text-center">
                    <h3 className="font-semibold text-muted-foreground group-hover:text-primary">Add New Party</h3>
                    <p className="text-xs text-muted-foreground/60">Record a loan for a new person</p>
                </div>
            </Card>

            {parties.map((party) => (
                <Card key={party.personName} className="hover:shadow-md transition-all group relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {party.lastTransactionDate && new Date(party.lastTransactionDate).toLocaleDateString()}
                        </CardTitle>
                        <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                            {party.count} loan{party.count !== 1 ? 's' : ''}
                        </Badge>

                        {/* Quick Add Button */}
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-muted/50 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-primary-foreground"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddTransaction(party.personName);
                            }}
                            title={`Add transaction for ${party.personName}`}
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
                                <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                                    {party.personName}
                                </h3>
                                <p className="text-xs text-muted-foreground">Pending Repayment</p>
                            </div>
                        </div>

                        <div className="flex items-end justify-between border-t pt-3">
                            <div className="text-2xl font-bold">
                                {formatCurrency(party.totalPending)}
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
