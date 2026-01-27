import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Phone, Mail, MapPin, Search, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PartiesPage = () => {
    const { user } = useAuth();
    const { formatCurrency } = useCurrency();
    const [searchTerm, setSearchTerm] = useState("");

    const { data: parties = [], isLoading } = useQuery({
        queryKey: ["parties-report", user?.id],
        queryFn: async () => {
            // Fetch parties with their sales and purchases
            // Note: Supabase might need exact foreign key naming or manual correlation if relations aren't auto-detected nicely in query builder
            // We can fetch parallel if needed, but let's try deep select

            // First fetch parties
            const { data: partiesData, error: partiesError } = await supabase
                .from("parties")
                .select("*")
                .eq("user_id", user?.id);

            if (partiesError) throw partiesError;

            // Fetch Sales
            const { data: salesData } = await supabase
                .from("sales" as any)
                .select("party_id, total_amount")
                .eq("user_id", user?.id)
                .not("party_id", "is", null);

            // Fetch Purchases
            const { data: purchasesData } = await supabase
                .from("purchases" as any)
                .select("party_id, total_amount")
                .eq("user_id", user?.id)
                .not("party_id", "is", null);

            // Merge
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return partiesData.map((party: any) => {
                const partySales = (salesData as any[])?.filter(s => s.party_id === party.id) || [];
                const partyPurchases = (purchasesData as any[])?.filter(s => s.party_id === party.id) || [];

                const totalSales = partySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
                const totalPurchases = partyPurchases.reduce((sum, s) => sum + (s.total_amount || 0), 0);

                return {
                    ...party,
                    totalSales,
                    totalPurchases,
                    balance: totalSales - totalPurchases // Negative means we owe them (Vendor mostly), Positive means they owe us (Customer mostly) - concept varies.
                    // For pure volume:
                };
            });
        },
        enabled: !!user
    });

    const filteredParties = parties.filter((p: any) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone?.includes(searchTerm)
    );

    const customers = filteredParties.filter((p: any) => p.type === 'customer' || p.type === 'both');
    const vendors = filteredParties.filter((p: any) => p.type === 'vendor' || p.type === 'both');

    const PartyCard = ({ party }: { party: any }) => (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-bold">{party.name}</CardTitle>
                {party.type === 'both' && <Badge variant="outline">Both</Badge>}
            </CardHeader>
            <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    {party.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {party.phone}</div>}
                    {party.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> {party.email}</div>}
                    {party.address && <div className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {party.address}</div>}
                </div>

                <div className="flex justify-between items-center border-t pt-3">
                    <div>
                        <p className="text-xs text-muted-foreground">Total Sales</p>
                        <p className="font-semibold text-green-600 flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" /> {formatCurrency(party.totalSales)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total Purchases</p>
                        <p className="font-semibold text-red-600 flex items-center gap-1 justify-end">
                            <ArrowDownLeft className="w-3 h-3" /> {formatCurrency(party.totalPurchases)}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout>
            <div className="container mx-auto p-4 animate-fade-in space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Parties Report</h1>
                    <p className="text-muted-foreground">Track sales and purchases by Customer/Vendor</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search parties..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Tabs defaultValue="customers" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="customers">Customers ({customers.length})</TabsTrigger>
                        <TabsTrigger value="vendors">Vendors ({vendors.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="customers" className="space-y-4">
                        {customers.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">No customers found.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {customers.map((party: any) => <PartyCard key={party.id} party={party} />)}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="vendors" className="space-y-4">
                        {vendors.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">No vendors found.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {vendors.map((party: any) => <PartyCard key={party.id} party={party} />)}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}

export default PartiesPage;
