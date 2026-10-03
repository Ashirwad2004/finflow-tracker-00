import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import {
  PERIODS,
  downloadCSV,
  downloadGSTNJson,
  exportFullGSTR1CSV,
  B2BRecord,
  B2CLRecord,
  B2CSRecord,
  HSNRecord,
} from "./index";
import { processClientSalesForGSTR1 } from "./gstr1SalesProcessor";

export function useGSTR1Report() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState(0);

  const period = PERIODS[selectedPeriod];

  // Fetch profile (for GSTIN & business name)
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id || "")
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  const bizGSTIN = (profile as any)?.gst_number || "";
  const fallbackState =
    typeof window !== "undefined"
      ? localStorage.getItem("rupeebill_fallback_state_code") || "27"
      : "27";
  const effectiveStateCode =
    bizGSTIN && bizGSTIN.length >= 2 ? bizGSTIN.substring(0, 2) : fallbackState;
  const bizStateCode = effectiveStateCode;

  // Fetch pre-aggregated GSTR-1 data from backend RPC with client-side fallback
  const { data: gstr1Data, isLoading } = useQuery({
    queryKey: [
      "gstr1-data",
      user?.id,
      period.from.toISOString(),
      period.to.toISOString(),
      effectiveStateCode,
    ],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any).rpc(
          "generate_gstr1_data",
          {
            p_user_id: user?.id,
            p_start_date: format(period.from, "yyyy-MM-dd"),
            p_end_date: format(period.to, "yyyy-MM-dd"),
            p_biz_state_code: effectiveStateCode,
          }
        );
        if (!error && data) return data;
      } catch (e) {
        console.warn(
          "generate_gstr1_data RPC failed, using client-side calculation:",
          e
        );
      }

      // Fallback calculation directly from sales table
      const { data: rawSales, error: salesErr } = await (supabase as any)
        .from("sales")
        .select("*")
        .eq("user_id", user?.id || "")
        .gte("date", format(period.from, "yyyy-MM-dd"))
        .lte("date", format(period.to, "yyyy-MM-dd"))
        .neq("status", "draft");

      if (salesErr) throw salesErr;
      return processClientSalesForGSTR1(rawSales || [], effectiveStateCode);
    },
    enabled: !!user,
  });

  const b2bRecords: B2BRecord[] = gstr1Data?.b2b || [];
  const b2clRecords: B2CLRecord[] = gstr1Data?.b2cl || [];
  const b2csData: B2CSRecord[] = gstr1Data?.b2cs || [];
  const hsnSummary: HSNRecord[] = gstr1Data?.hsn || [];
  const salesCount = gstr1Data?.summary?.total_invoices || 0;

  const [healthErrors, setHealthErrors] = useState<string[]>([]);
  const [showHealthModal, setShowHealthModal] = useState(false);

  // Fetch tax period lock status
  const { data: lockStatus, refetch: refetchLock } = useQuery({
    queryKey: [
      "tax-period-lock",
      user?.id,
      period.from.getMonth() + 1,
      period.from.getFullYear(),
    ],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tax_periods")
        .select("status")
        .eq("user_id", user?.id)
        .eq("month", period.from.getMonth() + 1)
        .eq("year", period.from.getFullYear())
        .maybeSingle();
      if (error) throw error;
      return data?.status || "open";
    },
    enabled: !!user,
  });
  const isLocked = lockStatus === "locked";
  const isPendingReview = lockStatus === "pending_review";
  const isCA = (profile as any)?.is_ca === true;

  const setPeriodStatus = async (newStatus: "pending_review" | "locked") => {
    if (
      newStatus === "locked" &&
      !confirm(
        "Approve and lock this period? Modifications will be permanently disabled."
      )
    )
      return;
    if (
      newStatus === "pending_review" &&
      !confirm(
        "Submit this period for CA review? Modifications will be temporarily disabled."
      )
    )
      return;

    try {
      const { error } = await (supabase as any).from("tax_periods").upsert(
        {
          user_id: user?.id,
          month: period.from.getMonth() + 1,
          year: period.from.getFullYear(),
          status: newStatus,
        },
        { onConflict: "user_id, month, year" }
      );
      if (error) throw error;
      toast({
        title: newStatus === "locked" ? "Period Locked" : "Submitted for Review",
      });
      refetchLock();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: error.message,
      });
    }
  };

  const runHealthCheck = () => {
    const errors: string[] = [];
    hsnSummary.forEach((h) => {
      if (h.hsn_code === "0000")
        errors.push(
          `Missing HSN code for items totaling ₹${h.taxable_value.toFixed(2)}`
        );
    });
    b2bRecords.forEach((b) => {
      if (!b.place_of_supply)
        errors.push(`Invoice ${b.invoice_number} is missing Place of Supply.`);
    });
    setHealthErrors(
      errors.length > 0
        ? errors
        : ["No anomalies detected! Data looks compliant."]
    );
    setShowHealthModal(true);
  };

  // Table 3.1: Summary
  const summary = useMemo(() => {
    const totalTaxable =
      gstr1Data?.summary?.total_taxable_value ||
      gstr1Data?.summary?.total_taxable ||
      0;
    const totalValue = gstr1Data?.summary?.total_tax_amount
      ? totalTaxable + gstr1Data.summary.total_tax_amount
      : gstr1Data?.summary?.total_value || 0;
    const igst = [...b2bRecords, ...b2clRecords].reduce(
      (s, r: any) => s + (r.igst || 0),
      0
    );
    const cgst = [...b2bRecords, ...b2csData].reduce(
      (s, r: any) => s + (r.cgst || 0),
      0
    );
    const sgst = [...b2bRecords, ...b2csData].reduce(
      (s, r: any) => s + (r.sgst || 0),
      0
    );
    const totalTax = igst + cgst + sgst;
    return { totalTaxable, totalTax, totalValue, igst, cgst, sgst };
  }, [gstr1Data, b2bRecords, b2clRecords, b2csData]);

  // Table 13: Document Summary
  const docSummary = useMemo(() => {
    return { total: salesCount, from: "-", to: "-", cancelled: 0 };
  }, [salesCount]);

  // Export helpers
  const exportB2BCSV = () =>
    downloadCSV(
      `GSTR1_B2B_${period.label.replace(/\s/g, "_")}.csv`,
      [
        "GSTIN/UIN of Recipient",
        "Receiver Name",
        "Invoice Number",
        "Invoice Date",
        "Invoice Value",
        "Taxable Value",
        "IGST",
        "CGST",
        "SGST",
        "Place of Supply",
        "Reverse Charge",
      ],
      b2bRecords.map((r) => [
        r.gstin,
        r.customer_name,
        r.invoice_number,
        r.invoice_date,
        r.invoice_value.toFixed(2),
        r.taxable_value.toFixed(2),
        r.igst.toFixed(2),
        r.cgst.toFixed(2),
        r.sgst.toFixed(2),
        r.place_of_supply,
        r.reverse_charge ? "Y" : "N",
      ])
    );

  const exportB2CSCSV = () =>
    downloadCSV(
      `GSTR1_B2CS_${period.label.replace(/\s/g, "_")}.csv`,
      [
        "Type",
        "Place of Supply",
        "Tax Rate",
        "Taxable Value",
        "IGST",
        "CGST",
        "SGST",
      ],
      b2csData.map((r) => [
        "OE",
        r.place_of_supply,
        `${r.tax_rate}%`,
        r.taxable_value.toFixed(2),
        r.igst.toFixed(2),
        r.cgst.toFixed(2),
        r.sgst.toFixed(2),
      ])
    );

  const exportHSNCSV = () =>
    downloadCSV(
      `GSTR1_HSN_${period.label.replace(/\s/g, "_")}.csv`,
      [
        "HSN",
        "Description",
        "UQC",
        "Quantity",
        "Taxable Value",
        "Tax Rate",
        "IGST",
        "CGST",
        "SGST",
      ],
      hsnSummary.map((r) => [
        r.hsn_code,
        r.description,
        r.uqc,
        r.quantity,
        r.taxable_value.toFixed(2),
        `${r.tax_rate}%`,
        r.igst.toFixed(2),
        r.cgst.toFixed(2),
        r.sgst.toFixed(2),
      ])
    );

  const handleDownloadGSTNJson = () => {
    downloadGSTNJson(
      bizGSTIN,
      bizStateCode,
      period,
      b2bRecords,
      b2clRecords,
      b2csData,
      hsnSummary
    );
  };

  const handleExportFullGSTR1 = () => {
    exportFullGSTR1CSV(
      period,
      (profile as any)?.business_name || "Your Business",
      bizGSTIN,
      b2bRecords,
      b2clRecords,
      b2csData,
      hsnSummary
    );
  };

  return {
    period,
    selectedPeriod,
    setSelectedPeriod,
    bizGSTIN,
    isLoading,
    salesCount,
    summary,
    docSummary,
    b2bRecords,
    b2clRecords,
    b2csData,
    hsnSummary,
    healthErrors,
    showHealthModal,
    setShowHealthModal,
    isLocked,
    isPendingReview,
    isCA,
    runHealthCheck,
    setPeriodStatus,
    exportB2BCSV,
    exportB2CSCSV,
    exportHSNCSV,
    handleDownloadGSTNJson,
    handleExportFullGSTR1,
  };
}
