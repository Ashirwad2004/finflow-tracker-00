import { UseFormSetValue } from "react-hook-form";
import { InvoiceFormValues } from "../../hooks";
import { SalesSettings } from "@/core/hooks/use-sales-settings";

interface UseInvoiceSmartParseProps {
  setValue: UseFormSetValue<InvoiceFormValues>;
  salesSettings?: SalesSettings;
  handleCustomerSelect: (customerName: string) => void;
  toast: any;
}

export function useInvoiceSmartParse({
  setValue,
  salesSettings,
  handleCustomerSelect,
  toast,
}: UseInvoiceSmartParseProps) {
  const handleSmartParse = (data: any) => {
    if (data.customerName) {
      setValue("customer_name", data.customerName, { shouldValidate: true, shouldDirty: true });
      handleCustomerSelect(data.customerName);
    }
    if (data.customerPhone) {
      setValue("customer_phone", data.customerPhone, { shouldValidate: true, shouldDirty: true });
    }
    if (data.customerEmail) {
      setValue("customer_email", data.customerEmail, { shouldValidate: true, shouldDirty: true });
    }
    if (data.customerGstin) {
      setValue("customer_gstin", data.customerGstin.toUpperCase(), { shouldValidate: true, shouldDirty: true });
    }
    if (data.status) {
      setValue("status", data.status, { shouldValidate: true, shouldDirty: true });
    }
    if (data.taxRate !== undefined) {
      setValue("tax_rate", data.taxRate, { shouldValidate: true, shouldDirty: true });
    }
    if (data.overallDiscount !== undefined) {
      setValue("overall_discount", data.overallDiscount, { shouldValidate: true, shouldDirty: true });
    }
    if (data.items && data.items.length > 0) {
      const mappedItems = data.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity || 1,
        price: item.price || 0,
        discount: item.discount || 0,
        tax_rate: data.taxRate !== undefined ? data.taxRate : (salesSettings?.defaultTaxRate ?? 0),
        total: (item.quantity || 1) * (item.price || 0) * (1 - (item.discount || 0) / 100),
        hsn_code: "",
        unit: "",
      }));
      setValue("items", mappedItems, { shouldValidate: true, shouldDirty: true });
    }
    toast({ title: "AI Magic ✨", description: "Invoice fields populated from your request." });
  };

  return { handleSmartParse };
}
