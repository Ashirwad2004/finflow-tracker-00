import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UseFormSetValue } from "react-hook-form";
import { supabase } from "@/core/integrations/supabase/client";
import { invoicesApi } from "@/core/api/invoices";
import { SalesSettings } from "@/core/hooks/use-sales-settings";
import { InvoiceFormValues } from "../../hooks";

export interface UseInvoiceNumberSequenceParams {
  open: boolean;
  invoiceToEdit?: any;
  salesSettings?: SalesSettings;
  userId?: string;
  setValue: UseFormSetValue<InvoiceFormValues>;
}

export function useInvoiceNumberSequence({
  open,
  invoiceToEdit,
  salesSettings,
  userId,
  setValue,
}: UseInvoiceNumberSequenceParams) {
  const queryClient = useQueryClient();

  // Next Invoice Number Query
  const { data: lastInvoiceNumber } = useQuery({
    queryKey: ["last-invoice-number"],
    queryFn: async () => {
      if (invoiceToEdit) return null;
      if (!userId) return null;

      try {
        if (navigator.onLine) {
          try {
            const nextNum = await invoicesApi.getNextInvoiceNumber(
              salesSettings?.invoiceNumberPrefix ?? "INV-"
            );
            if (nextNum) return nextNum;
          } catch {
            // fallback
          }
        }
        const { data, error } = await supabase
          .from("sales" as any)
          .select("invoice_number")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) return (data as any).invoice_number;
      } catch {
        // cache fallback
      }

      const cachedSales = (queryClient.getQueryData(["sales", userId]) as any[]) || [];
      return cachedSales[0]?.invoice_number || null;
    },
    enabled: open && !invoiceToEdit,
  });

  useEffect(() => {
    if (open && !invoiceToEdit) {
      const prefix = salesSettings?.invoiceNumberPrefix ?? "";
      if (lastInvoiceNumber) {
        const stripped = lastInvoiceNumber.startsWith(prefix)
          ? lastInvoiceNumber.slice(prefix.length)
          : lastInvoiceNumber;
        const numericPart = parseInt(stripped.replace(/\D/g, ""));
        setValue("invoice_number", !isNaN(numericPart) ? `${prefix}${numericPart + 1}` : `${prefix}1`);
      } else {
        setValue("invoice_number", `${prefix}1`);
      }
    }
  }, [open, lastInvoiceNumber, setValue, invoiceToEdit, salesSettings?.invoiceNumberPrefix]);

  return { lastInvoiceNumber };
}
