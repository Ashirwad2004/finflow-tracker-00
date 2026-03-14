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

const getPartiesTable = () => (supabase as any).from("parties");

const PartiesPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<"All Types" | "Customer" | "Vendor" | "Both">("All Types");

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
            const { data, error } = await getPartiesTable()
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

            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) throw new Error("User not authenticated");

            const { data: existingParty } = await getPartiesTable()
                .select("id")
                .eq("user_id", currentUser.id)
                .ilike("name", newParty.name)
                .limit(1);

            if (existingParty && existingParty.length > 0) {
                throw new Error(`A party with the name "${newParty.name}" already exists.`);
            }

            const { data, error } = await getPartiesTable()
                .insert([{ ...newParty, user_id: currentUser.id }]) // Use user.id
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
            setIsDialogOpen(false);
        },
        onError: (error) => {
            toast({ title: "Error creating party", description: error.message, variant: "destructive" });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (updatedParty: Partial<Party>) => {
            if (!selectedParty?.id) return;

            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) throw new Error("User not authenticated");

            if (updatedParty.name && updatedParty.name !== selectedParty.name) {
                const { data: existingParty } = await getPartiesTable()
                    .select("id")
                    .eq("user_id", currentUser.id)
                    .ilike("name", updatedParty.name)
                    .limit(1);

                if (existingParty && existingParty.length > 0) {
                    throw new Error(`A party with the name "${updatedParty.name}" already exists.`);
                }
            }

            const { data, error } = await getPartiesTable()
                .update(updatedParty as any) // Casting to any for update payload flexibility
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
            setIsDialogOpen(false);
        },
        onError: (error) => {
            toast({ title: "Error updating party", description: error.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) throw new Error("User not authenticated");

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

                const key = `recently_deleted_parties_${currentUser.id}`;
                const existingStr = localStorage.getItem(key);
                const existing = existingStr ? JSON.parse(existingStr) : [];
                localStorage.setItem(key, JSON.stringify([deletedItem, ...existing]));
            }

            const { error } = await getPartiesTable() // Use getPartiesTable
                .delete()
                .eq("id", id)
                .eq("user_id", currentUser.id); // Add user_id check for security
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
    const filteredParties = parties.filter(party => {
        const matchesSearch = party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (party.phone && party.phone.includes(searchTerm)) ||
            (party.type && party.type.toLowerCase().includes(searchTerm.toLowerCase()));

        let matchesType = true;
        if (filterType === "Customer") matchesType = party.type === "customer";
        else if (filterType === "Vendor") matchesType = party.type === "vendor";
        else if (filterType === "Both") matchesType = party.type === "both";

        return matchesSearch && matchesType;
    });

    const getInitials = (name: string) => {
        return name.substring(0, 2).toUpperCase() || 'NA';
    };

    return (
        <AppLayout>
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-fade-in text-slate-900 dark:text-slate-100 font-display">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <Users className="text-primary w-8 h-8" />
                            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Parties Directory</h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your Customers and Vendors as a unified address book</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="hidden sm:flex items-center space-x-2 border-slate-200 dark:border-slate-800 shadow-sm font-bold">
                            Export
                        </Button>
                        <Button onClick={handleAddClick} className="flex items-center space-x-2 shadow-sm font-bold bg-primary hover:bg-primary/90 text-white">
                            <Plus className="w-4 h-4 mr-1" />
                            Add New Party
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input
                            placeholder="Search by name, phone, or type..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50 text-sm"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-semibold px-4 h-11 focus:ring-1 focus:ring-primary/50 text-slate-700 dark:text-slate-300 outline-none"
                        >
                            <option>All Types</option>
                            <option>Customer</option>
                            <option>Vendor</option>
                            <option>Both</option>
                        </select>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Party Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tax ID / GSTIN</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading parties...</td>
                                    </tr>
                                ) : filteredParties.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center text-slate-500 flex flex-col items-center justify-center">
                                            <Users className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />
                                            <p className="text-sm font-medium">No parties found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredParties.map((party) => (
                                        <tr key={party.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer" onClick={() => handleEditClick(party)}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                                                        ${party.type === 'customer' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' :
                                                            party.type === 'vendor' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                                                'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}
                                                    `}>
                                                        {getInitials(party.name)}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900 dark:text-white line-clamp-1" title={party.name}>{party.name}</div>
                                                        <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">ID: {party.id.split('-')[0]}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border
                                                    ${party.type === 'customer' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' :
                                                        party.type === 'vendor' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50' :
                                                            'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50'}
                                                `}>
                                                    {party.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{party.email || <span className="text-slate-400">No email</span>}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{party.phone || <span className="text-slate-400">No phone</span>}</div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-[11px] font-medium text-slate-500">
                                                {party.gst_number || <span className="text-slate-400 italic">N/A</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEditClick(party); }}
                                                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-all rounded"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                            <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all rounded">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                            <DropdownMenuItem onClick={() => handleDeleteClick(party)} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/50">
                                                                <Trash2 className="h-4 w-4 mr-2" /> Delete Party
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
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
