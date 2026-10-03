import { useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";
import { Party } from "../types";
import {
  computePartyLedgerMap,
  computeDirectorySummary,
  computeActivePartyTransactions,
} from "../lib/partyLedgerCalculations";

const getPartiesTable = () => (supabase as any).from("parties");

interface UsePartyDataProps {
  user: any;
  searchTerm: string;
  filterType: "All Types" | "Customer" | "Vendor" | "Both";
  selectedPartyId: string | null;
  setSelectedPartyId: (id: string | null) => void;
  activeTab: "all" | "sales" | "purchases";
}

export function usePartyData({
  user,
  searchTerm,
  filterType,
  selectedPartyId,
  setSelectedPartyId,
  activeTab,
}: UsePartyDataProps) {
  const queryClient = useQueryClient();

  // Fetch Business Profile
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (!error && data) return data;
      } catch (e) {
        console.warn("[Parties] Profile fetch failed offline, falling back to cache:", e);
      }
      const cached = queryClient.getQueryData<any>(["profile", user.id]);
      if (cached) return cached;
      return await sqliteService.getById<any>(user.id);
    },
    initialData: () => queryClient.getQueryData<any>(["profile", user?.id]) || undefined,
    enabled: !!user,
  });

  // Fetch Parties with Offline Fallback
  const { data: parties = [], isLoading: isLoadingParties } = useQuery({
    queryKey: ["parties", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await getPartiesTable()
          .select("*")
          .eq("user_id", user.id)
          .order("name");
        if (!error && data) return data as Party[];
      } catch (e) {
        console.warn("[Parties] Parties fetch failed offline, falling back to cache:", e);
      }
      const cached = queryClient.getQueryData<Party[]>(["parties", user.id]);
      if (cached && cached.length > 0) return cached;
      const localData = await sqliteService.getAll<Party>("parties", user.id);
      return localData || [];
    },
    initialData: () => queryClient.getQueryData<Party[]>(["parties", user?.id]) || undefined,
    enabled: !!user,
  });

  // Fetch Sales
  const { data: sales = [] } = useQuery({
    queryKey: ["sales", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("sales")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });
        if (!error && data) return data || [];
      } catch (e) {
        console.warn("[Parties] Sales fetch failed offline, falling back to cache:", e);
      }
      const cached = queryClient.getQueryData<any[]>(["sales", user.id]);
      if (cached && cached.length > 0) return cached;
      const localData = await sqliteService.getAll<any>("sales", user.id);
      return localData || [];
    },
    initialData: () => queryClient.getQueryData<any[]>(["sales", user?.id]) || undefined,
    enabled: !!user,
  });

  // Fetch Purchases
  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("purchases")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });
        if (!error && data) return data || [];
      } catch (e) {
        console.warn("[Parties] Purchases fetch failed offline, falling back to cache:", e);
      }
      const cached = queryClient.getQueryData<any[]>(["purchases", user.id]);
      if (cached && cached.length > 0) return cached;
      const localData = await sqliteService.getAll<any>("purchases", user.id);
      return localData || [];
    },
    initialData: () => queryClient.getQueryData<any[]>(["purchases", user?.id]) || undefined,
    enabled: !!user,
  });

  // Pre-indexed linear calculation of metrics
  const partyLedgerMap = useMemo(() => {
    return computePartyLedgerMap(parties, sales, purchases);
  }, [parties, sales, purchases]);

  // High-level aggregate totals
  const directorySummary = useMemo(() => {
    return computeDirectorySummary(partyLedgerMap, parties.length);
  }, [partyLedgerMap, parties.length]);

  // Filter parties based on search input and category filter
  const filteredParties = useMemo(() => {
    return parties.filter((party) => {
      const matchesSearch =
        party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (party.phone && party.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (party.email && party.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (party.gst_number && party.gst_number.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === "All Types") return true;
      if (filterType === "Customer") return party.type === "customer" || party.type === "both";
      if (filterType === "Vendor") return party.type === "vendor" || party.type === "both";
      if (filterType === "Both") return party.type === "both";

      return true;
    });
  }, [parties, searchTerm, filterType]);

  // Keep active party selection in sync
  useEffect(() => {
    if (filteredParties.length > 0) {
      if (!selectedPartyId || !filteredParties.some((p) => p.id === selectedPartyId)) {
        setSelectedPartyId(filteredParties[0].id);
      }
    } else {
      setSelectedPartyId(null);
    }
  }, [filteredParties, selectedPartyId, setSelectedPartyId]);

  const activeParty = useMemo(() => {
    return parties.find((p) => p.id === selectedPartyId) || null;
  }, [parties, selectedPartyId]);

  const activePartyMetrics = useMemo(() => {
    if (!activeParty) return null;
    return partyLedgerMap.get(activeParty.id) || null;
  }, [activeParty, partyLedgerMap]);

  // Unified transactions for active party
  const activePartyTransactions = useMemo(() => {
    return computeActivePartyTransactions(activeParty, activePartyMetrics, activeTab);
  }, [activeParty, activePartyMetrics, activeTab]);

  return {
    profile,
    parties,
    isLoadingParties,
    sales,
    purchases,
    partyLedgerMap,
    directorySummary,
    filteredParties,
    activeParty,
    activePartyMetrics,
    activePartyTransactions,
  };
}
