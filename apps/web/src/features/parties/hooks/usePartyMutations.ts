import { useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { offlineMutate } from "@/core/offline/apiService";
import { useToast } from "@/core/hooks/use-toast";
import { Party } from "../types";

export const buildPartyUpdatePayload = (updatedParty: Partial<Party>): Record<string, any> => {
  const updatePayload: Record<string, any> = {};
  if (updatedParty.name !== undefined) updatePayload.name = updatedParty.name;
  if (updatedParty.type !== undefined) updatePayload.type = updatedParty.type;
  if (updatedParty.phone !== undefined) updatePayload.phone = updatedParty.phone;
  if (updatedParty.email !== undefined) updatePayload.email = updatedParty.email;
  if (updatedParty.address !== undefined) updatePayload.address = updatedParty.address;
  if (updatedParty.gst_number !== undefined) updatePayload.gst_number = updatedParty.gst_number;
  if (updatedParty.opening_balance !== undefined) updatePayload.opening_balance = Number(updatedParty.opening_balance) || 0;
  if (updatedParty.opening_balance_type !== undefined) updatePayload.opening_balance_type = updatedParty.opening_balance_type;
  return updatePayload;
};

interface UsePartyMutationsProps {
  user: any;
  parties: Party[];
  selectedParty: Party | null;
  selectedPartyId: string | null;
  setSelectedPartyId: (id: string | null) => void;
  partyToDelete: Party | null;
  setIsDialogOpen: (open: boolean) => void;
  setIsDeleteDialogOpen: (open: boolean) => void;
}

export function usePartyMutations({
  user,
  parties,
  selectedParty,
  selectedPartyId,
  setSelectedPartyId,
  partyToDelete,
  setIsDialogOpen,
  setIsDeleteDialogOpen,
}: UsePartyMutationsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (newParty: Partial<Party>) => {
      if (!newParty.name) throw new Error("Party name is required");

      const currentUser = user;
      if (!currentUser) throw new Error("User not authenticated");

      const cachedParties: Party[] = queryClient.getQueryData(["parties", currentUser.id]) || [];
      const exists = cachedParties.some(
        (p) => p.name.toLowerCase() === newParty.name!.toLowerCase()
      );

      if (exists) {
        throw new Error(`A party with the name "${newParty.name}" already exists.`);
      }

      const partyId = uuidv4();
      const partyPayload = {
        id: partyId,
        user_id: currentUser.id,
        name: newParty.name,
        type: newParty.type || "customer",
        phone: newParty.phone || null,
        email: newParty.email || null,
        address: newParty.address || null,
        gst_number: newParty.gst_number || null,
        opening_balance: Number(newParty.opening_balance) || 0,
        opening_balance_type:
          newParty.opening_balance_type ||
          (newParty.type === "vendor" ? "to_pay" : "to_receive"),
        created_at: new Date().toISOString(),
      } as Party;

      const { error } = await offlineMutate({
        table: "parties",
        action: "insert",
        recordId: partyId,
        payload: partyPayload,
        userId: currentUser.id,
      });
      if (error) throw error;
      return partyPayload;
    },
    onSuccess: (data) => {
      if (user?.id) {
        queryClient.setQueryData(["parties", user.id], (old: any) => {
          const sorted = old ? [...old, data] : [data];
          return sorted.sort((a: any, b: any) => a.name.localeCompare(b.name));
        });
      }

      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["parties"] });
        queryClient.invalidateQueries({ queryKey: ["invoice-parties"] });
        queryClient.invalidateQueries({ queryKey: ["purchase-parties"] });
      }
      setSelectedPartyId(data.id);
      toast({ title: "Party created successfully" });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating party",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedParty: Partial<Party>) => {
      if (!selectedParty?.id) {
        throw new Error("No party selected for update");
      }

      const currentUser = user;
      if (!currentUser) throw new Error("User not authenticated");

      if (updatedParty.name && updatedParty.name !== selectedParty.name) {
        const cachedParties: Party[] = queryClient.getQueryData(["parties", currentUser.id]) || [];
        const exists = cachedParties.some(
          (p) => p.name.toLowerCase() === updatedParty.name!.toLowerCase()
        );

        if (exists) {
          throw new Error(`A party with the name "${updatedParty.name}" already exists.`);
        }
      }

      const updatePayload = buildPartyUpdatePayload(updatedParty);

      const { error } = await offlineMutate({
        table: "parties",
        action: "update",
        recordId: selectedParty.id,
        payload: updatePayload,
        userId: currentUser.id,
      });
      if (error) throw error;
      return { id: selectedParty.id, ...updatedParty };
    },
    onSuccess: (data) => {
      if (user?.id) {
        queryClient.setQueryData(["parties", user.id], (old: any) => {
          return old
            ? old
                .map((p: any) => (p.id === data.id ? { ...p, ...data } : p))
                .sort((a: any, b: any) => a.name.localeCompare(b.name))
            : [];
        });
      }

      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["parties"] });
        queryClient.invalidateQueries({ queryKey: ["invoice-parties"] });
        queryClient.invalidateQueries({ queryKey: ["purchase-parties"] });
      }
      toast({ title: "Party updated successfully" });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating party",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const currentUser = user;
      if (!currentUser) throw new Error("User not authenticated");

      const currentPartyToDelete = parties.find((p) => p.id === id);
      if (currentPartyToDelete) {
        const deletedItem = {
          ...currentPartyToDelete,
          type: "party",
          party_type: currentPartyToDelete.type,
          deleted_at: new Date().toISOString(),
        };
        delete (deletedItem as any).type;
        deletedItem.type = "party";

        const key = `recently_deleted_parties_${currentUser.id}`;
        const existingStr = localStorage.getItem(key);
        const existing = existingStr ? JSON.parse(existingStr) : [];
        localStorage.setItem(key, JSON.stringify([deletedItem, ...existing]));
      }

      const { error } = await offlineMutate({
        table: "parties",
        action: "delete",
        recordId: id,
        userId: currentUser.id,
      });
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      if (user?.id) {
        queryClient.setQueryData(["parties", user.id], (old: any) => {
          return old ? old.filter((p: any) => p.id !== id) : [];
        });
      }

      if (selectedPartyId === id) {
        const remaining = parties.filter((p) => p.id !== id);
        setSelectedPartyId(remaining.length > 0 ? remaining[0].id : null);
      }

      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["parties"] });
        queryClient.invalidateQueries({ queryKey: ["invoice-parties"] });
        queryClient.invalidateQueries({ queryKey: ["purchase-parties"] });
      }
      toast({ title: "Party deleted successfully" });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting party",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveParty = (partyData: Partial<Party>, isEditing: boolean) => {
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

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    handleSaveParty,
    confirmDelete,
  };
}
