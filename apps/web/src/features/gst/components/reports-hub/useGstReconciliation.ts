import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { format } from "date-fns";
import { GstPeriod, GstReconciliationData } from "./types";

const defaultRecon: GstReconciliationData = {
  salesCount: 0,
  purchasesCount: 0,
  outwardTaxable: 0,
  inwardTaxable: 0,
  output: { igst: 0, cgst: 0, sgst: 0, total: 0 },
  itc: { igst: 0, cgst: 0, sgst: 0, total: 0 },
  net: { igst: 0, cgst: 0, sgst: 0, payable: 0, credit: 0 },
};

export function useGstReconciliation(
  userId: string | undefined,
  activePeriod: GstPeriod,
  effectiveStateCode: string
) {
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", userId || "")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const {
    data: reconciliationData,
    isLoading: isReconLoading,
    refetch: refetchRecon,
  } = useQuery({
    queryKey: [
      "gst-reconciliation",
      userId,
      activePeriod.from.toISOString(),
      activePeriod.to.toISOString(),
      effectiveStateCode,
    ],
    queryFn: async (): Promise<GstReconciliationData> => {
      const startDateStr = format(activePeriod.from, "yyyy-MM-dd");
      const endDateStr = format(activePeriod.to, "yyyy-MM-dd");

      // Fetch Sales
      const { data: salesData } = await (supabase as any)
        .from("sales")
        .select("id, total_amount, subtotal, tax_amount, customer_gstin, place_of_supply, status, date")
        .eq("user_id", userId || "")
        .gte("date", startDateStr)
        .lte("date", endDateStr)
        .neq("status", "draft");

      // Fetch Purchases
      const { data: purchasesData } = await (supabase as any)
        .from("purchases")
        .select("id, total_amount, subtotal, tax_amount, vendor_gstin, place_of_supply, date")
        .eq("user_id", userId || "")
        .gte("date", startDateStr)
        .lte("date", endDateStr);

      const sales = salesData || [];
      const purchases = purchasesData || [];

      // Calculate Outward Tax (GSTR-1 / Output Liability)
      let outwardTaxable = 0;
      let outputIgst = 0;
      let outputCgst = 0;
      let outputSgst = 0;

      sales.forEach((s: any) => {
        const tax = Number(s.tax_amount) || 0;
        const taxable = Number(s.subtotal) || (Number(s.total_amount) || 0) - tax;
        outwardTaxable += taxable;

        const pos = s.place_of_supply || (s.customer_gstin ? s.customer_gstin.slice(0, 2) : effectiveStateCode);
        const isInter = pos !== effectiveStateCode;

        if (isInter) {
          outputIgst += tax;
        } else {
          outputCgst += tax / 2;
          outputSgst += tax / 2;
        }
      });

      // Calculate Inward Tax Credit (GSTR-2B / Eligible ITC)
      let inwardTaxable = 0;
      let itcIgst = 0;
      let itcCgst = 0;
      let itcSgst = 0;

      purchases.forEach((p: any) => {
        const tax = Number(p.tax_amount) || 0;
        const taxable = Number(p.subtotal) || (Number(p.total_amount) || 0) - tax;
        inwardTaxable += taxable;

        const isRegistered = p.vendor_gstin && p.vendor_gstin.trim().length === 15;
        if (isRegistered || tax > 0) {
          const pos = p.place_of_supply || (p.vendor_gstin ? p.vendor_gstin.slice(0, 2) : effectiveStateCode);
          const isInter = pos !== effectiveStateCode;
          if (isInter) {
            itcIgst += tax;
          } else {
            itcCgst += tax / 2;
            itcSgst += tax / 2;
          }
        }
      });

      // Net Payable or Credit (GSTR-3B summary)
      const netIgst = outputIgst - itcIgst;
      const netCgst = outputCgst - itcCgst;
      const netSgst = outputSgst - itcSgst;
      const totalOutput = outputIgst + outputCgst + outputSgst;
      const totalItc = itcIgst + itcCgst + itcSgst;
      const netTotalPayable = Math.max(0, totalOutput - totalItc);
      const netCreditCarryForward = Math.max(0, totalItc - totalOutput);

      return {
        salesCount: sales.length,
        purchasesCount: purchases.length,
        outwardTaxable,
        inwardTaxable,
        output: { igst: outputIgst, cgst: outputCgst, sgst: outputSgst, total: totalOutput },
        itc: { igst: itcIgst, cgst: itcCgst, sgst: itcSgst, total: totalItc },
        net: { igst: netIgst, cgst: netCgst, sgst: netSgst, payable: netTotalPayable, credit: netCreditCarryForward },
      };
    },
    enabled: !!userId,
  });

  return {
    profile,
    recon: reconciliationData || defaultRecon,
    isReconLoading,
    refetchRecon,
  };
}
