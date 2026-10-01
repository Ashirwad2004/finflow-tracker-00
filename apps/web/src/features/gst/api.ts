import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { GstSummaryData } from "./types";

export const gstKeys = {
  all: ["gst"] as const,
  summary: (userId?: string, startDate?: string, endDate?: string) =>
    [...gstKeys.all, "summary", userId, startDate, endDate] as const,
  filings: (userId?: string) => [...gstKeys.all, "filings", userId] as const,
};

export function useGstSummaryQuery(startDate: string, endDate: string) {
  const { user } = useAuth();

  return useQuery<GstSummaryData>({
    queryKey: gstKeys.summary(user?.id, startDate, endDate),
    queryFn: async () => {
      if (!user?.id) {
        return {
          outwardTaxable: 0,
          igstOutput: 0,
          cgstOutput: 0,
          sgstOutput: 0,
          totalOutputTax: 0,
          inwardTaxable: 0,
          igstInput: 0,
          cgstInput: 0,
          sgstInput: 0,
          totalInputTax: 0,
          netTaxPayable: 0,
        };
      }

      // Fetch sales invoices within date range
      const { data: sales } = await (supabase as any)
        .from("invoices")
        .select("total_amount, tax_amount, cgst, sgst, igst")
        .eq("user_id", user.id)
        .gte("invoice_date", startDate)
        .lte("invoice_date", endDate);

      // Fetch purchase bills within date range
      const { data: purchases } = await (supabase as any)
        .from("purchases")
        .select("total_amount, tax_amount, cgst, sgst, igst")
        .eq("user_id", user.id)
        .gte("bill_date", startDate)
        .lte("bill_date", endDate);

      const outwardTaxable = (sales || []).reduce(
        (sum: number, r: any) => sum + (Number(r.total_amount) - Number(r.tax_amount || 0)),
        0
      );
      const igstOutput = (sales || []).reduce((sum: number, r: any) => sum + Number(r.igst || 0), 0);
      const cgstOutput = (sales || []).reduce((sum: number, r: any) => sum + Number(r.cgst || 0), 0);
      const sgstOutput = (sales || []).reduce((sum: number, r: any) => sum + Number(r.sgst || 0), 0);
      const totalOutputTax = igstOutput + cgstOutput + sgstOutput;

      const inwardTaxable = (purchases || []).reduce(
        (sum: number, r: any) => sum + (Number(r.total_amount) - Number(r.tax_amount || 0)),
        0
      );
      const igstInput = (purchases || []).reduce((sum: number, r: any) => sum + Number(r.igst || 0), 0);
      const cgstInput = (purchases || []).reduce((sum: number, r: any) => sum + Number(r.cgst || 0), 0);
      const sgstInput = (purchases || []).reduce((sum: number, r: any) => sum + Number(r.sgst || 0), 0);
      const totalInputTax = igstInput + cgstInput + sgstInput;

      return {
        outwardTaxable,
        igstOutput,
        cgstOutput,
        sgstOutput,
        totalOutputTax,
        inwardTaxable,
        igstInput,
        cgstInput,
        sgstInput,
        totalInputTax,
        netTaxPayable: Math.max(0, totalOutputTax - totalInputTax),
      };
    },
    enabled: !!user?.id && !!startDate && !!endDate,
  });
}
