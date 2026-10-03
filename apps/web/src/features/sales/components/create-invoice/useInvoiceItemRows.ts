import { useRef, useEffect } from "react";
import { UseFieldArrayAppend, FieldArrayWithId } from "react-hook-form";
import { InvoiceFormValues } from "../../hooks";
import { SalesSettings } from "@/core/hooks/use-sales-settings";

interface UseInvoiceItemRowsProps {
  fields: FieldArrayWithId<InvoiceFormValues, "items", "id">[];
  append: UseFieldArrayAppend<InvoiceFormValues, "items">;
  salesSettings?: SalesSettings;
}

export function useInvoiceItemRows({
  fields,
  append,
  salesSettings,
}: UseInvoiceItemRowsProps) {
  const descriptionRefs = useRef<(HTMLInputElement | null)[]>([]);
  const shouldFocusLastRowRef = useRef(false);

  const addEmptyItemRow = () => {
    shouldFocusLastRowRef.current = true;
    append({
      description: "",
      quantity: 1,
      price: 0,
      discount: 0,
      tax_rate: salesSettings?.defaultTaxRate ?? 0,
      total: 0,
      hsn_code: "",
      unit: "",
    });
  };

  const handleItemKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();

    if (index === fields.length - 1) {
      addEmptyItemRow();
    } else {
      descriptionRefs.current[index + 1]?.focus();
    }
  };

  useEffect(() => {
    if (!shouldFocusLastRowRef.current) return;
    shouldFocusLastRowRef.current = false;
    requestAnimationFrame(() => {
      const lastIndex = fields.length - 1;
      descriptionRefs.current[lastIndex]?.focus();
    });
  }, [fields.length]);

  return {
    descriptionRefs,
    addEmptyItemRow,
    handleItemKeyDown,
  };
}
