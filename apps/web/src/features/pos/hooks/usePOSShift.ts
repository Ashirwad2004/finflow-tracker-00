import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/core/api/apiClient";
import { toast } from "sonner";
import { POSShift, POSShiftSummary } from "../types";

interface UsePOSShiftOptions {
  storeId: string;
  userId: string | undefined;
  formatCurrency: (val: number) => string;
}

export function usePOSShift({ storeId, userId, formatCurrency }: UsePOSShiftOptions) {
  const queryClient = useQueryClient();

  const { data: shiftData, refetch: refetchShift } = useQuery({
    queryKey: ["pos_current_shift", storeId, userId],
    queryFn: async () => {
      if (!storeId) return { active_shift: null, summary: null };
      try {
        const res = await apiClient.get("/api/v1/pos/shifts/current");
        return res.data;
      } catch (err) {
        console.warn("[POS] Shift check endpoint unavailable offline:", err);
        return { active_shift: null, summary: null };
      }
    },
    enabled: !!storeId,
    refetchInterval: 30000,
  });

  const activeShift: POSShift | null = shiftData?.active_shift || null;
  const shiftSummary: POSShiftSummary | null = shiftData?.summary || null;

  const handleOpenShift = async (openingCash: number, notes?: string) => {
    try {
      await apiClient.post("/api/v1/pos/shifts/open", {
        opening_cash: openingCash,
        notes: notes || null,
      });
      toast.success("Register shift opened successfully!");
      await queryClient.invalidateQueries({ queryKey: ["pos_current_shift"] });
      await refetchShift();
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Failed to open shift";
      toast.error(`Shift Error: ${detail}`);
      throw err;
    }
  };

  const handleCloseShift = async (
    shiftId: string,
    actualCash: number,
    notes?: string
  ) => {
    try {
      const res = await apiClient.post(`/api/v1/pos/shifts/${shiftId}/close`, {
        actual_cash: actualCash,
        notes: notes || null,
      });
      const diff = res.data.difference;
      if (diff === 0) {
        toast.success("Register balanced perfectly! Shift closed.");
      } else if (diff > 0) {
        toast.warning(`Shift closed with surplus cash of +${formatCurrency(diff)}`);
      } else {
        toast.error(`Shift closed with cash shortage of -${formatCurrency(Math.abs(diff))}`);
      }
      await queryClient.invalidateQueries({ queryKey: ["pos_current_shift"] });
      await refetchShift();
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Failed to close shift";
      toast.error(`Shift Close Error: ${detail}`);
      throw err;
    }
  };

  const handleRecordCashMovement = async (
    shiftId: string,
    type: "cash_in" | "cash_out",
    amount: number,
    reason: string
  ) => {
    try {
      await apiClient.post("/api/v1/pos/cash-movements", {
        shift_id: shiftId,
        type,
        amount,
        reason,
      });
      toast.success(
        `Recorded ${type === "cash_in" ? "Cash In (+)" : "Cash Out (-)"} of ${formatCurrency(amount)}`
      );
      await queryClient.invalidateQueries({ queryKey: ["pos_current_shift"] });
      await refetchShift();
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Failed to record cash movement";
      toast.error(`Cash Movement Error: ${detail}`);
      throw err;
    }
  };

  return {
    activeShift,
    shiftSummary,
    refetchShift,
    handleOpenShift,
    handleCloseShift,
    handleRecordCashMovement,
  };
}
