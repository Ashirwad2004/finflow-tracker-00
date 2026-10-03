import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { getOverdueDaysThreshold } from "@/core/utils/overdue";
import { useAuth } from "@/core/lib/auth";
import { ProductItem } from "./ProductCombobox";
import { ExtractedPurchaseBill } from "./PurchaseBillScanner";
import { PurchaseItemRowData } from "./PurchaseItemsTable";
import {
  useRecordPurchaseMutation,
  type PurchaseFormValues,
  usePurchaseProducts,
  usePurchaseCalculations,
} from "../../hooks";
import { getInitialPurchaseFormValues } from "./purchaseFormHydration";
import { applyScannerExtraction, applySmartParse } from "./purchaseScannerHandler";

export * from "./purchaseFormHydration";
export * from "./purchaseScannerHandler";

export interface UseRecordPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseToEdit?: any;
  startWithScanner?: boolean;
  initialParty?: any;
}

export function useRecordPurchaseDialog({
  open,
  onOpenChange,
  purchaseToEdit,
  startWithScanner = false,
  initialParty,
}: UseRecordPurchaseDialogProps) {
  const { toast } = useToast();
  const { formatCurrency, currency } = useCurrency();
  const { user } = useAuth();

  const overdueThresholdDays = getOverdueDaysThreshold();
  const [isQuickBilling, setIsQuickBilling] = useState(false);
  const [isAiFillOpen, setIsAiFillOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(startWithScanner);
  const [scannedNotification, setScannedNotification] = useState<{
    vendor: string;
    itemCount: number;
    fileName?: string;
    isPdf?: boolean;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setIsScannerOpen(startWithScanner);
      setScannedNotification(null);
    }
  }, [open, startWithScanner]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PurchaseFormValues>({
    defaultValues: {
      vendor_name: "",
      vendor_phone: "",
      vendor_gstin: "",
      place_of_supply: "",
      bill_number: `BILL-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split("T")[0],
      due_date: new Date().toISOString().split("T")[0],
      payment_status: "paid",
      amount_paid: 0,
      discount_amount: 0,
      tax_rate: 0,
      notes: "",
      attachment_url: "",
      quick_item_name: "General Purchase Item",
      quick_total_amount: 0,
      items: [
        {
          description: "",
          quantity: 1,
          price: 0,
          unit: "pc",
          discount: 0,
          tax_rate: 0,
          total: 0,
        },
      ],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "items",
  });

  // Form Watchers
  const watchItems = watch("items");
  const watchPaymentStatus = watch("payment_status") || "paid";
  const watchAmountPaid = Number(watch("amount_paid") || 0);
  const watchDate = watch("date") || "";
  const watchDueDate = watch("due_date") || "";
  const watchBillDiscount = Number(watch("discount_amount") || 0);
  const watchDefaultTaxRate = Number(watch("tax_rate") || 0);
  const watchVendorName = watch("vendor_name") || "";
  const watchVendorGstin = watch("vendor_gstin") || "";
  const watchVendorPhone = watch("vendor_phone") || "";
  const watchPlaceOfSupply = watch("place_of_supply") || "";
  const watchBillNumber = watch("bill_number") || "";
  const watchNotes = watch("notes") || "";
  const watchAttachmentUrl = watch("attachment_url") || "";
  const watchQuickItemName = watch("quick_item_name") || "";
  const watchQuickTotalAmount = Number(watch("quick_total_amount") || 0);

  // Fetch Parties for Vendor Autocomplete
  const { data: parties = [] } = useQuery({
    queryKey: ["parties", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from("parties")
        .select("*")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: open && !!user?.id,
  });

  const vendorParties = parties.filter(
    (party: any) => party.type === "vendor" || party.type === "both" || !party.type
  );

  // Fetch user purchases for vendor ledger status
  const { data: userPurchases = [] } = useQuery({
    queryKey: ["purchases-ledger", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data } = await (supabase as any)
          .from("purchases")
          .select("id, vendor_name, total_amount, amount_paid, balance_due, status, date, party_id")
          .eq("user_id", user.id);
        if (data && data.length > 0) return data;
      } catch {
        // offline fallback
      }
      return [];
    },
    enabled: open && !!user?.id,
  });

  // Modular Hook: Products
  const {
    products,
    handleProductSelect: onProductSelectInternal,
    handleQuickAddProduct,
  } = usePurchaseProducts({
    userId: user?.id,
    open,
  });

  // Modular Hook: Calculations
  const {
    subtotal,
    itemDiscounts,
    totalTaxAmount,
    finalTotalAmount,
    effectiveBillTotal,
    balanceDue,
    selectedParty,
    vendorPreviousBalance,
    vendorClosingPayable,
    getDefaultDueDate,
    handlePaymentStatusChange: onPaymentStatusChangeInternal,
    handleBillDateChange: onBillDateChangeInternal,
    handleItemChange: onLineItemChangeInternal,
  } = usePurchaseCalculations({
    watchItems,
    watchBillDiscount,
    watchDefaultTaxRate,
    watchQuickTotalAmount,
    watchAmountPaid,
    isQuickBilling,
    parties,
    userPurchases,
    watchVendorName,
    purchaseToEditId: purchaseToEdit?.id,
    overdueThresholdDays,
  });

  // Keep amount_paid updated if payment_status is 'paid'
  useEffect(() => {
    if (watchPaymentStatus === "paid") {
      setValue("amount_paid", effectiveBillTotal);
    }
  }, [effectiveBillTotal, watchPaymentStatus, setValue]);

  // Keep single item synchronized when in Quick Billing mode
  useEffect(() => {
    if (!isQuickBilling) return;
    const price = Number(watchQuickTotalAmount) || 0;
    const desc = (watchQuickItemName || "").trim() || "General Purchase Item";
    const tax = Number(watchDefaultTaxRate) || 0;

    setValue(
      "items",
      [
        {
          description: desc,
          quantity: 1,
          price: price,
          unit: "pc",
          discount: 0,
          tax_rate: tax,
          total: price,
        },
      ],
      { shouldValidate: true, shouldDirty: true }
    );
  }, [isQuickBilling, watchQuickItemName, watchQuickTotalAmount, watchDefaultTaxRate, setValue]);

  const handlePaymentStatusChange = (status: "paid" | "partial" | "pending") => {
    onPaymentStatusChangeInternal(status, setValue);
  };

  const handleBillDateChange = (dateVal: string) => {
    onBillDateChangeInternal(dateVal, setValue);
  };

  const handleItemChange = (index: number, field: keyof PurchaseItemRowData, value: any) => {
    onLineItemChangeInternal(index, field, value, setValue, watchItems);
  };

  const handleProductSelect = (index: number, product: ProductItem) => {
    onProductSelectInternal(index, product, setValue, watchItems, watchDefaultTaxRate, append, fields.length);
  };

  // Reset or hydrate form values
  useEffect(() => {
    if (open) {
      const initialValues = getInitialPurchaseFormValues(purchaseToEdit, initialParty, getDefaultDueDate);
      reset(initialValues);
      setIsAiFillOpen(false);
    }
  }, [open, purchaseToEdit, initialParty, reset, getDefaultDueDate]);

  const handleAddItem = () => {
    append({
      description: "",
      quantity: 1,
      price: 0,
      unit: "pc",
      discount: 0,
      tax_rate: watchDefaultTaxRate,
      total: 0,
    });
  };

  const handleRemoveItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      setValue("items.0.description", "");
      setValue("items.0.quantity", 1);
      setValue("items.0.price", 0);
      setValue("items.0.discount", 0);
      setValue("items.0.unit", "pc");
      setValue("items.0.total", 0);
    }
  };

  // Save Purchase Mutation
  const createPurchaseMutation = useRecordPurchaseMutation({
    user,
    purchaseToEdit,
    vendorParties,
    products,
    getDefaultDueDate,
    onSuccessCallback: () => {
      onOpenChange(false);
      reset();
    },
  });

  const handleSmartParse = (data: {
    vendorName?: string;
    billNumber?: string;
    date?: string;
    items?: Array<{ description: string; quantity: number; price: number }>;
  }) => {
    applySmartParse({
      data,
      vendorParties,
      getDefaultDueDate,
      watchDefaultTaxRate,
      setValue,
      replace,
      toast,
      setIsAiFillOpen,
    });
  };

  const handleScannerExtract = (data: ExtractedPurchaseBill, autoSaveImmediately?: boolean) => {
    applyScannerExtraction({
      data,
      vendorParties,
      getDefaultDueDate,
      setValue,
      replace,
      createPurchaseMutation,
      toast,
      setScannedNotification,
      autoSaveImmediately,
    });
  };

  const onSubmit = (data: PurchaseFormValues) => {
    if (isQuickBilling) {
      const amt = Number(data.quick_total_amount) || 0;
      if (amt <= 0) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid bill total amount greater than 0.",
          variant: "destructive",
        });
        return;
      }
      const itemDesc = (data.quick_item_name || "").trim() || "General Purchase Item";
      data.items = [
        {
          description: itemDesc,
          quantity: 1,
          price: amt,
          unit: "pc",
          discount: 0,
          tax_rate: Number(data.tax_rate) || 0,
          total: amt,
        },
      ];
      if (data.payment_status === "paid") {
        data.amount_paid = amt;
      }
    }
    createPurchaseMutation.mutate(data);
  };

  return {
    user,
    formatCurrency,
    currency,
    isQuickBilling,
    setIsQuickBilling,
    isAiFillOpen,
    setIsAiFillOpen,
    isScannerOpen,
    setIsScannerOpen,
    scannedNotification,
    setScannedNotification,
    register,
    handleSubmit,
    setValue,
    errors,
    watchItems,
    watchPaymentStatus,
    watchAmountPaid,
    watchDate,
    watchDueDate,
    watchBillDiscount,
    watchDefaultTaxRate,
    watchVendorName,
    watchVendorGstin,
    watchVendorPhone,
    watchPlaceOfSupply,
    watchBillNumber,
    watchNotes,
    watchAttachmentUrl,
    watchQuickItemName,
    watchQuickTotalAmount,
    parties,
    products,
    selectedParty,
    subtotal,
    itemDiscounts,
    totalTaxAmount,
    finalTotalAmount,
    effectiveBillTotal,
    balanceDue,
    vendorPreviousBalance,
    vendorClosingPayable,
    handlePaymentStatusChange,
    handleBillDateChange,
    handleItemChange,
    handleProductSelect,
    handleAddItem,
    handleRemoveItem,
    handleQuickAddProduct,
    handleSmartParse,
    handleScannerExtract,
    onSubmit,
    isPending: createPurchaseMutation.isPending,
  };
}
