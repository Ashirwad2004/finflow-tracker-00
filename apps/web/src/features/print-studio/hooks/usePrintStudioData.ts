import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { UniversalDocumentType } from "@/utils/generateInvoicePDF";
import {
  sampleSale,
  samplePurchaseBill,
  sampleSaleOrder,
  samplePurchaseOrder,
} from "../types";

export function usePrintStudioData(user: any) {
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [selectedDocType, setSelectedDocType] = useState<UniversalDocumentType>("invoice");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id || "")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: recentSales = [], isLoading: isLoadingRecentSales } = useQuery({
    queryKey: ["recent_sales_for_print", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales")
        .select("*")
        .eq("user_id", user?.id || "")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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
        console.warn("[PrintStudio] Parties fetch fallback:", e);
      }
      return [];
    },
    enabled: !!user,
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ["all_sales_for_balance", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("sales")
          .select(
            "id, party_id, customer_name, total_amount, amount_paid, balance_due, status, document_type, date, created_at"
          )
          .eq("user_id", user.id);
        if (!error && data) return data;
      } catch (e) {
        console.warn("[PrintStudio] Sales fetch fallback:", e);
      }
      return [];
    },
    enabled: !!user,
  });

  const getPartyBalanceForSale = useCallback(
    (sale: any) => {
      if (!sale) return { previous_balance: 0, party_pending_balance: 0 };

      if (
        sale.previous_balance !== undefined &&
        sale.previous_balance !== null &&
        Number(sale.previous_balance) !== 0
      ) {
        const pb = Number(sale.previous_balance);
        const curDue = Number(
          sale.balance_due != null
            ? sale.balance_due
            : Math.max(0, Number(sale.total_amount || 0) - Number(sale.amount_paid || 0))
        );
        const pd =
          sale.party_pending_balance !== undefined
            ? Number(sale.party_pending_balance)
            : sale.total_due_balance !== undefined
            ? Number(sale.total_due_balance)
            : pb + curDue;
        return { previous_balance: pb, party_pending_balance: pd };
      }

      const custName = (sale.customer_name || "").trim().toLowerCase();
      if (!custName || ["cash customer", "cash sale", "walk-in", "cash"].includes(custName)) {
        const curDue = Number(
          sale.balance_due != null
            ? sale.balance_due
            : Math.max(0, Number(sale.total_amount || 0) - Number(sale.amount_paid || 0))
        );
        return { previous_balance: 0, party_pending_balance: curDue };
      }

      const party = (parties as any[]).find(
        (p: any) =>
          (sale.party_id && p.id === sale.party_id) ||
          (p.name && p.name.trim().toLowerCase() === custName)
      );

      const openBal = Number(party?.opening_balance) || 0;
      const isOpeningReceivable = party?.opening_balance_type
        ? party.opening_balance_type === "to_receive"
        : party?.type !== "vendor";
      let prevBal = isOpeningReceivable ? openBal : -openBal;

      const salesList = (allSales.length > 0 ? allSales : recentSales) as any[];

      const otherSales = salesList.filter((s: any) => {
        if (s.id && sale.id && s.id === sale.id) return false;
        const match =
          (s.party_id && party?.id && s.party_id === party.id) ||
          (s.customer_name && s.customer_name.trim().toLowerCase() === custName);
        return match;
      });

      otherSales.forEach((s: any) => {
        const statusStr = (s.status || "").toLowerCase();
        if (statusStr === "draft" || statusStr === "cancelled") return;
        const tot = Number(s.total_amount) || 0;
        const pd = Number(s.amount_paid != null ? s.amount_paid : statusStr === "paid" ? tot : 0);
        const due = Number(s.balance_due != null ? s.balance_due : Math.max(0, tot - pd));
        const docType = (s.document_type || "invoice").toLowerCase();
        if (docType === "receipt") {
          prevBal = Math.max(0, prevBal - (tot || pd));
        } else if (docType === "credit_note") {
          prevBal -= tot;
        } else if (docType === "debit_note") {
          prevBal += tot;
        } else {
          prevBal += due;
        }
      });

      if (prevBal === 0 && (!sale.id || sale.id.startsWith("sample-"))) {
        prevBal = 8500;
      }

      const curDue = Number(
        sale.balance_due != null
          ? sale.balance_due
          : Math.max(0, Number(sale.total_amount || 0) - Number(sale.amount_paid || 0))
      );
      return {
        previous_balance: prevBal,
        party_pending_balance: prevBal + curDue,
      };
    },
    [parties, allSales, recentSales]
  );

  useEffect(() => {
    if (recentSales.length > 0 && !selectedSale) {
      setSelectedSale(recentSales[0]);
    }
  }, [recentSales, selectedSale]);

  const activeSaleData = useMemo(() => {
    let baseSale = selectedSale || sampleSale;
    if (selectedDocType === "purchase_bill") baseSale = samplePurchaseBill;
    else if (selectedDocType === "sale_order") baseSale = sampleSaleOrder;
    else if (selectedDocType === "purchase_order") baseSale = samplePurchaseOrder;

    const { previous_balance, party_pending_balance } = getPartyBalanceForSale(baseSale);
    return {
      ...baseSale,
      previous_balance,
      party_pending_balance,
      total_due_balance: party_pending_balance,
    };
  }, [selectedSale, selectedDocType, getPartyBalanceForSale]);

  return {
    profile,
    recentSales,
    isLoadingRecentSales,
    selectedSale,
    setSelectedSale,
    selectedDocType,
    setSelectedDocType,
    getPartyBalanceForSale,
    activeSaleData,
  };
}
