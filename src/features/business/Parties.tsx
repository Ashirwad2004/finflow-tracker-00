import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { Plus, Users, Search, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { PartyDialog } from "./components/PartyDialog";

export interface Party {
    id: string;
    user_id: string;
    type: "customer" | "vendor" | "both";
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    gst_number: string | null;
    created_at: string;
}

const PartiesPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");

    // Dialog States
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedParty, setSelectedParty] = useState<Party | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Delete Alert States
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);

    // Fetch Parties
    const { data: parties = [], isLoading } = useQuery({
        queryKey: ["parties", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("parties" as any)
                .select("*")
                .order("name");

            if (error) throw error;
            return data as Party[];
        },
        enabled: !!user
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (newParty: Partial<Party>) => {
            if (!newParty.name) throw new Error("Party name is required");

            const { data: existingParty } = await supabase
                .from("parties")
                .select("id")
                .eq("user_id", user?.id)
                .ilike("name", newParty.name)
                .limit(1);

            if (existingParty && existingParty.length > 0) {
                throw new Error(`A party with the name "${newParty.name}" already exists.`);
            }

            const { data, error } = await supabase
                .from("parties" as any)
                .insert([{ ...newParty, user_id: user?.id }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["parties"] });
            queryClient.invalidateQueries({ queryKey: ["invoice-parties"] });
            queryClient.invalidateQueries({ queryKey: ["purchase-parties"] });
            toast({ title: "Party created successfully" });
        },
        onError: (error) => {
            toast({ title: "Error creating party", description: error.message, variant: "destructive" });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (updatedParty: Partial<Party>) => {
            if (!selectedParty?.id) return;

            if (updatedParty.name && updatedParty.name !== selectedParty.name) {
                const { data: existingParty } = await supabase
                    .from("parties")
                    .select("id")
                    .eq("user_id", user?.id)
                    .ilike("name", updatedParty.name)
                    .limit(1);

                if (existingParty && existingParty.length > 0) {
                    throw new Error(`A party with the name "${updatedParty.name}" already exists.`);
                }
            }

            const { data, error } = await supabase
                .from("parties" as any)
                .update(updatedParty)
                .eq("id", selectedParty.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["parties"] });
            queryClient.invalidateQueries({ queryKey: ["invoice-parties"] });
            queryClient.invalidateQueries({ queryKey: ["purchase-parties"] });
            toast({ title: "Party updated successfully" });
        },
        onError: (error) => {
            toast({ title: "Error updating party", description: error.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const currentPartyToDelete = parties.find(p => p.id === id);
            if (currentPartyToDelete) {
                const deletedItem = {
                    ...currentPartyToDelete,
                    type: "party",
                    party_type: currentPartyToDelete.type,
                    deleted_at: new Date().toISOString()
                };
                // Removing original `type` property after renaming it to party_type
                delete (deletedItem as any).type;
                deletedItem.type = "party";

                const key = `recently_deleted_parties_${user?.id}`;
                const existingStr = localStorage.getItem(key);
                const existing = existingStr ? JSON.parse(existingStr) : [];
                localStorage.setItem(key, JSON.stringify([deletedItem, ...existing]));
            }

            const { error } = await supabase
                .from("parties" as any)
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["parties"] });
            queryClient.invalidateQueries({ queryKey: ["invoice-parties"] });
            queryClient.invalidateQueries({ queryKey: ["purchase-parties"] });
            toast({ title: "Party deleted successfully" });
            setIsDeleteDialogOpen(false);
        },
        onError: (error) => {
            toast({ title: "Error deleting party", description: error.message, variant: "destructive" });
        }
    });

    // Handlers
    const handleAddClick = () => {
        setSelectedParty(null);
        setIsEditing(false);
        setIsDialogOpen(true);
    };

    const handleEditClick = (party: Party) => {
        setSelectedParty(party);
        setIsEditing(true);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (party: Party) => {
        setPartyToDelete(party);
        setIsDeleteDialogOpen(true);
    };

    const handleSaveParty = (partyData: Partial<Party>) => {
        if (isEditing) {
            updateMutation.mutate(partyData);
        } else {
            createMutation.mutate(partyData);
        }
    };

    const confirmDelete = () => {
        if (partyToDelete) {
            deleteMutation.mutate(partyToDelete.id);
        }
    };

    // Derived Data
    const filteredParties = parties.filter(party =>
        party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (party.phone && party.phone.includes(searchTerm)) ||
        (party.type && party.type.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <AppLayout>
            <div className="container mx-auto px-4 py-8 animate-fade-in relative max-w-7xl">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
                            <Users className="w-8 h-8 text-primary" />
                            Parties Directory
                        </h1>
                        <p className="text-muted-foreground">Manage your Customers and Vendors as a unified address book</p>
                    </div>
                    <Button onClick={handleAddClick} size="lg" className="w-full sm:w-auto shadow-sm">
                        <Plus className="w-5 h-5 mr-2" />
                        Add New Party
                    </Button>
                </div>

                <div className="bg-card rounded-xl border shadow-sm">
                    <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, phone, or type..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-10 bg-background"
                            />
                        </div>
                    </div>

                    <div className="p-0">
                        {isLoading ? (
                            <div className="p-6 space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                        ) : filteredParties.length === 0 ? (
                            <div className="text-center py-24 text-muted-foreground">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="text-lg font-medium text-foreground/80">No parties found</p>
                                <p className="text-sm">
                                    {searchTerm ? "Try adjusting your search query." : "Click 'Add New Party' to create your first directory contact."}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 p-4">
                                {filteredParties.map(party => (
                                    <div key={party.id} className="p-4 border rounded-lg m-2 bg-background hover:bg-accent/40 transition-colors group relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-semibold text-lg text-foreground line-clamp-1" title={party.name}>{party.name}</h3>
                                                <Badge variant="outline" className={`mt-1 capitalize text-[10px] ${party.type === 'customer' ? "bg-green-50 text-green-700 border-green-200" :
                                                    party.type === 'vendor' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                        "bg-purple-50 text-purple-700 border-purple-200"
                                                    }`}>
                                                    {party.type}
                                                </Badge>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEditClick(party)}>
                                                        <Edit className="h-4 w-4 mr-2" /> Edit Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(party)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Party
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="space-y-1.5 mt-4 text-sm text-muted-foreground">
                                            {party.phone && <p>📞 {party.phone}</p>}
                                            {party.email && <p className="line-clamp-1" title={party.email}>✉️ {party.email}</p>}
                                            {party.gst_number && <p>📄 <span className="font-mono text-xs text-foreground bg-muted px-1.5 py-0.5 rounded">{party.gst_number}</span></p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <PartyDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onSave={handleSaveParty}
                    party={selectedParty}
                    isEditing={isEditing}
                    isSaving={createMutation.isPending || updateMutation.isPending}
                />

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Party</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to completely delete <strong>{partyToDelete?.name}</strong> from your directory?
                                This address book action will <strong className="text-foreground">not</strong> delete your underlying sales or purchase records.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
                                {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
};

export default PartiesPage;
