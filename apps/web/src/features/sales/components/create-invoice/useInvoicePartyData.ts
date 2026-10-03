import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";

export function useInvoicePartyData(currentUserId?: string, watchCustomerName: string = "") {
  const queryClient = useQueryClient();

  // Fetch Business Profile
  const { data: profile } = useQuery({
    queryKey: ["profile", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      try {
        const { data } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("user_id", currentUserId)
          .single();
        if (data) return data;
      } catch {
        // fallback
      }
      return queryClient.getQueryData<any>(["profile", currentUserId]) || null;
    },
    enabled: !!currentUserId,
  });

  // Fetch Parties
  const { data: parties = [] } = useQuery({
    queryKey: ["parties", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      try {
        const { data } = await supabase
          .from("parties" as any)
          .select("*")
          .eq("user_id", currentUserId)
          .order("name", { ascending: true });

        if (data && data.length > 0) {
          sqliteService.upsertBatch("parties", currentUserId, data).catch(() => {});
          return data;
        }
      } catch {
        // Fall back
      }

      const cachedParties =
        (queryClient.getQueryData(["parties", currentUserId]) as any[]) ||
        (queryClient.getQueryData(["parties"]) as any[]) ||
        [];

      if (cachedParties.length > 0) return cachedParties;
      const localParties = await sqliteService.getAll<any>("parties", currentUserId);
      return localParties || [];
    },
    enabled: !!currentUserId,
  });

  // Fetch Sales for accurate party previous balance
  const { data: userSales = [] } = useQuery({
    queryKey: ["sales", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      try {
        const { data } = await supabase
          .from("sales" as any)
          .select("id, customer_name, total_amount, amount_paid, balance_due, status, date, document_type, party_id")
          .eq("user_id", currentUserId)
          .neq("status", "draft");
        if (data && data.length > 0) return data;
      } catch {
        // offline fallback
      }
      const cached = (queryClient.getQueryData(["sales", currentUserId]) as any[]) || [];
      if (cached.length > 0) return cached;
      return (await sqliteService.getAll<any>("sales", currentUserId)) || [];
    },
    enabled: !!currentUserId,
  });

  const selectedParty =
    parties.find((p: any) => p.name?.trim().toLowerCase() === watchCustomerName.trim().toLowerCase()) || null;

  return {
    profile,
    parties,
    userSales,
    selectedParty,
  };
}
