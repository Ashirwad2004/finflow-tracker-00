import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/core/lib/auth";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";

interface UseUniversalPaymentDataOptions {
  open: boolean;
  isReceipt: boolean;
  selectedPartyId: string;
}

export function useUniversalPaymentData({
  open,
  isReceipt,
  selectedPartyId,
}: UseUniversalPaymentDataOptions) {
  const { user } = useAuth();

  // Business profile for receipts
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const { data } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (data) return data;
      } catch (_) {}
      return (await sqliteService.getById<any>(user.id)) || null;
    },
    enabled: !!user && open,
  });

  // 1. Fetch Parties
  const { data: parties = [] } = useQuery({
    queryKey: ["parties", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("parties")
          .select("*")
          .eq("user_id", user.id)
          .order("name", { ascending: true });
        if (!error && data) return data;
      } catch (e) {
        console.warn("[PaymentDialog] Parties fetch fallback:", e);
      }
      return (await sqliteService.getAll<any>("parties", user.id)) || [];
    },
    enabled: !!user && open,
  });

  // Filter parties based on mode
  const eligibleParties = useMemo(() => {
    return parties.filter((p: any) => {
      if (isReceipt) {
        return p.type === "customer" || p.type === "both";
      }
      return p.type === "vendor" || p.type === "both";
    });
  }, [parties, isReceipt]);

  // 2. Fetch Bills (Sales for payment_in, Purchases for payment_out)
  const { data: salesBills = [] } = useQuery({
    queryKey: ["sales", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("sales")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });
        if (!error && data) return data;
      } catch (e) {
        console.warn("[PaymentDialog] Sales fetch fallback:", e);
      }
      return (await sqliteService.getAll<any>("sales", user.id)) || [];
    },
    enabled: !!user && open && isReceipt,
  });

  const { data: purchaseBills = [] } = useQuery({
    queryKey: ["purchases", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("purchases")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });
        if (!error && data) return data;
      } catch (e) {
        console.warn("[PaymentDialog] Purchases fetch fallback:", e);
      }
      return (await sqliteService.getAll<any>("purchases", user.id)) || [];
    },
    enabled: !!user && open && !isReceipt,
  });

  // Current raw bills array
  const allBills = isReceipt ? salesBills : purchaseBills;

  // Selected party object
  const activeParty = useMemo(() => {
    return parties.find((p: any) => p.id === selectedPartyId) || null;
  }, [parties, selectedPartyId]);

  // Pending/unpaid bills for active party
  const partyPendingBills = useMemo(() => {
    if (!activeParty) return [];
    const pName = (activeParty.name || "").trim().toLowerCase();

    return allBills
      .filter((b: any) => {
        if (b.status === "paid" || b.status === "cancelled" || b.status === "draft") return false;
        const billPartyName = ((isReceipt ? b.customer_name : b.vendor_name) || "").trim().toLowerCase();
        const matchesId = b.party_id && b.party_id === activeParty.id;
        const matchesName = billPartyName && billPartyName === pName;
        return matchesId || matchesName;
      })
      .map((b: any) => {
        const total = Number(b.total_amount || 0);
        const currentPaid = Number(b.amount_paid != null ? b.amount_paid : (b.status === "paid" ? total : 0));
        const balanceDue = b.balance_due != null ? Number(b.balance_due) : Math.max(0, total - currentPaid);
        const billNumber = isReceipt
          ? b.invoice_number || `INV-${b.id?.substring(0, 6)?.toUpperCase()}`
          : b.bill_number || `BILL-${b.id?.substring(0, 6)?.toUpperCase()}`;
        const partyName = isReceipt ? b.customer_name : b.vendor_name;

        return {
          id: b.id,
          billNumber,
          partyName,
          partyGstin: isReceipt ? b.customer_gstin : b.vendor_gstin,
          partyPhone: isReceipt ? b.customer_phone : b.vendor_phone,
          totalAmount: total,
          amountPaid: currentPaid,
          balanceDue,
          date: b.date || b.created_at?.split("T")[0],
          dueDate: b.due_date,
          notes: b.notes,
          paymentMethod: b.payment_method || "cash",
          type: (isReceipt ? "sale" : "purchase") as "sale" | "purchase",
          rawRecord: b,
        };
      })
      .filter((b: any) => b.balanceDue > 0.01)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()); // FIFO order: oldest first
  }, [allBills, activeParty, isReceipt]);

  // Outstanding party balance calculation
  const partyBalance = useMemo(() => {
    if (!activeParty) return 0;
    const openBal = Number(activeParty.opening_balance || 0);
    const isOpeningReceivable = activeParty.opening_balance_type
      ? activeParty.opening_balance_type === "to_receive"
      : activeParty.type !== "vendor";

    const openDues = partyPendingBills.reduce(
      (sum: number, b: any) => sum + Number(b.balanceDue || 0),
      0
    );

    if (isReceipt) {
      return openDues + (isOpeningReceivable ? openBal : -openBal);
    } else {
      return openDues + (!isOpeningReceivable ? openBal : -openBal);
    }
  }, [activeParty, partyPendingBills, isReceipt]);

  return {
    profile,
    parties,
    eligibleParties,
    allBills,
    activeParty,
    partyPendingBills,
    partyBalance,
  };
}
