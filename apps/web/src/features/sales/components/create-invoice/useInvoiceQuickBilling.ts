import { useState, useEffect } from "react";
import { UseFormSetValue } from "react-hook-form";
import { InvoiceFormValues } from "../../hooks";
import { SalesSettings } from "@/core/hooks/use-sales-settings";

interface UseInvoiceQuickBillingProps {
  open: boolean;
  invoiceToEdit?: any;
  salesSettings?: SalesSettings;
  setValue: UseFormSetValue<InvoiceFormValues>;
  watchTaxRate: number;
  watchQuickItemName: string;
  watchQuickTotalAmount: number;
}

export function useInvoiceQuickBilling({
  open,
  invoiceToEdit,
  salesSettings,
  setValue,
  watchTaxRate,
  watchQuickItemName,
  watchQuickTotalAmount,
}: UseInvoiceQuickBillingProps) {
  const [isQuickBilling, setIsQuickBilling] = useState(
    salesSettings?.enableQuickBilling ?? false
  );

  useEffect(() => {
    if (open) {
      setIsQuickBilling(
        invoiceToEdit ? false : (salesSettings?.enableQuickBilling ?? false)
      );
    }
  }, [open, invoiceToEdit, salesSettings?.enableQuickBilling]);

  useEffect(() => {
    if (!isQuickBilling) return;

    const tax = Number(watchTaxRate) || 0;
    const total = Number(watchQuickTotalAmount) || 0;
    const price = total / (1 + tax / 100);

    setValue(
      "items",
      [
        {
          description: watchQuickItemName || "General Sale",
          quantity: 1,
          price,
          discount: 0,
          tax_rate: tax,
          total: price,
          hsn_code: "",
          unit: "",
        },
      ],
      {
        shouldValidate: true,
        shouldDirty: true,
      }
    );
  }, [isQuickBilling, watchQuickItemName, watchQuickTotalAmount, watchTaxRate, setValue]);

  return {
    isQuickBilling,
    setIsQuickBilling,
  };
}
