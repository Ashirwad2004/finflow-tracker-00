import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useWhatsAppSendInvoice } from "@/features/whatsapp/hooks/useWhatsApp";
import {
  useCreateInvoiceMutation,
  InvoiceFormValues,
  useInvoiceProducts,
  useInvoiceCalculations,
  useInvoiceValidation,
} from "../../hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useItemSettings } from "@/core/hooks/use-item-settings";
import { SalesSettings } from "@/core/hooks/use-sales-settings";
import { useProductsRealtime } from "@/core/hooks/useProductsRealtime";
import { useAuth } from "@/core/lib/auth";
import { useInvoicePartyData } from "./useInvoicePartyData";
import { useInvoiceNumberSequence } from "./useInvoiceNumberSequence";
import { useInvoiceFormInit } from "./useInvoiceFormInit";
import { useInvoiceItemRows } from "./useInvoiceItemRows";
import { useInvoiceQuickBilling } from "./useInvoiceQuickBilling";
import { useInvoiceSmartParse } from "./useInvoiceSmartParse";

export * from "./useInvoicePartyData";
export * from "./useInvoiceNumberSequence";
export * from "./useInvoiceFormInit";
export * from "./useInvoiceItemRows";
export * from "./useInvoiceQuickBilling";
export * from "./useInvoiceSmartParse";

export interface UseCreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceToEdit?: any;
  salesSettings?: SalesSettings;
  initialParty?: any;
  onSuccess?: (savedInvoice: any) => void;
}

export function useCreateInvoiceDialog({
  open,
  onOpenChange,
  invoiceToEdit,
  salesSettings,
  initialParty,
  onSuccess,
}: UseCreateInvoiceDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id;

  const { settings } = useItemSettings(currentUserId);
  useProductsRealtime(currentUserId);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      customer_gstin: "",
      place_of_supply: "",
      is_reverse_charge: false,
      document_type: "invoice",
      original_invoice_id: "",
      invoice_number: "",
      date: new Date().toISOString().split("T")[0],
      due_date: "",
      items: [
        {
          description: "",
          quantity: 1,
          price: 0,
          discount: 0,
          tax_rate: salesSettings?.defaultTaxRate ?? 0,
          total: 0,
          hsn_code: "",
          unit: "",
        },
      ],
      tax_rate: salesSettings?.defaultTaxRate ?? 0,
      overall_discount: 0,
      status: "paid",
      amount_paid: 0,
      quick_item_name: "General Sale",
      quick_total_amount: 0,
    },
    mode: "onBlur",
  });

  const [activeStep, setActiveStep] = useState<"form" | "preview">("form");
  const [savedInvoiceData, setSavedInvoiceData] = useState<any | null>(null);
  const [draftPreviewData, setDraftPreviewData] = useState<any | null>(null);
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(
    salesSettings?.autoSendWhatsAppOnInvoice ?? false
  );
  const sendInvoiceMutation = useWhatsAppSendInvoice();

  useEffect(() => {
    if (open) {
      setSendWhatsApp(salesSettings?.autoSendWhatsAppOnInvoice ?? false);
    } else {
      setActiveStep("form");
      setSavedInvoiceData(null);
      setDraftPreviewData(null);
    }
  }, [open, salesSettings?.autoSendWhatsAppOnInvoice]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Row navigation and auto-focus
  const { descriptionRefs, addEmptyItemRow, handleItemKeyDown } = useInvoiceItemRows({
    fields,
    append,
    salesSettings,
  });

  // Form watchers
  const watchItems = watch("items");
  const watchTaxRate = watch("tax_rate");
  const watchOverallDiscount = watch("overall_discount");
  const watchQuickItemName = watch("quick_item_name");
  const watchQuickTotalAmount = watch("quick_total_amount");
  const watchCustomerName = watch("customer_name") || "";
  const watchCustomerPhone = watch("customer_phone") || "";
  const watchCustomerEmail = watch("customer_email") || "";
  const watchCustomerGstin = watch("customer_gstin") || "";
  const watchPlaceOfSupply = watch("place_of_supply") || "";
  const watchStatus = watch("status") || "paid";
  const watchAmountPaid = watch("amount_paid") || 0;

  // Quick billing syncing
  const { isQuickBilling, setIsQuickBilling } = useInvoiceQuickBilling({
    open,
    invoiceToEdit,
    salesSettings,
    setValue,
    watchTaxRate,
    watchQuickItemName,
    watchQuickTotalAmount,
  });

  // Hook: Party & Sales Data
  const { profile, parties, userSales, selectedParty } = useInvoicePartyData(
    currentUserId,
    watchCustomerName
  );

  // Hook: Products Catalog & Autocomplete
  const {
    dbProducts,
    products,
    handleProductSelect: onProductSelectInternal,
    handleQuickAddProduct,
  } = useInvoiceProducts({
    currentUserId,
    authUserId: authUser?.id,
    defaultTaxRate: salesSettings?.defaultTaxRate ?? 0,
  });

  const handleProductSelect = (index: number, product: any) => {
    onProductSelectInternal(index, product, setValue, watch, append, fields.length);
  };

  // Hook: Invoice Calculations & Draft Generator
  const {
    isItemWiseTax,
    subtotal,
    overallDiscountAmount,
    taxAmount,
    taxRate,
    roundOffDiff,
    totalAmount,
    currentInvoiceDue,
    partyPreviousBalance,
    partyClosingDue,
    buildDraftInvoice,
  } = useInvoiceCalculations({
    watchItems,
    watchTaxRate,
    watchOverallDiscount,
    watchQuickTotalAmount,
    watchStatus,
    watchAmountPaid,
    isQuickBilling,
    salesSettings,
    userSales,
    selectedParty,
    watchCustomerName,
    invoiceToEditId: invoiceToEdit?.id,
  });

  // Hook: Invoice Validations
  const { validateInvoice } = useInvoiceValidation({
    salesSettings,
    itemSettings: settings,
    invoiceToEdit,
    products,
    authUser,
    queryClient,
    toast,
  });

  const handleCustomerSelect = (customerName: string) => {
    const party = parties.find((p: any) => p.name === customerName);
    if (!party) return;

    if (party.phone && !watch("customer_phone")) {
      setValue("customer_phone", party.phone, { shouldValidate: true, shouldDirty: true });
    }
    if (party.email && !watch("customer_email")) {
      setValue("customer_email", party.email, { shouldValidate: true, shouldDirty: true });
    }
    if (party.gstin && !watch("customer_gstin")) {
      setValue("customer_gstin", party.gstin, { shouldValidate: true, shouldDirty: true });
    }
  };

  // AI Smart Parse
  const { handleSmartParse } = useInvoiceSmartParse({
    setValue,
    salesSettings,
    handleCustomerSelect,
    toast,
  });

  // Hook: Form Initialization / Reset on Open
  useInvoiceFormInit(open, invoiceToEdit, initialParty, salesSettings, reset);

  // Hook: Next Invoice Number Sequence
  const { lastInvoiceNumber } = useInvoiceNumberSequence({
    open,
    invoiceToEdit,
    salesSettings,
    userId: authUser?.id,
    setValue,
  });

  const handlePreviewDraft = () => {
    const values = getValues();
    const draft = buildDraftInvoice(values, lastInvoiceNumber, profile, invoiceToEdit);
    setDraftPreviewData(draft);
    setActiveStep("preview");
  };

  // Mutation
  const createInvoiceMutation = useCreateInvoiceMutation({
    authUser,
    profile,
    invoiceToEdit,
    salesSettings,
    itemSettings: settings,
    selectedParty,
    isQuickBilling,
    isItemWiseTax,
    dbProducts,
    parties,
    partyPreviousBalance,
    partyClosingDue,
    sendWhatsApp,
    sendInvoiceMutation,
    onSuccess,
    onOpenChange,
    reset,
    setActiveStep,
    setSavedInvoiceData,
    setDraftPreviewData,
  });

  const onSubmit = async (data: InvoiceFormValues) => {
    const isValid = await validateInvoice(data);
    if (!isValid) return;
    createInvoiceMutation.mutate(data);
  };

  const handleCloseDialog = () => {
    setActiveStep("form");
    setSavedInvoiceData(null);
    setDraftPreviewData(null);
    reset();
    onOpenChange(false);
  };

  return {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    errors,
    fields,
    remove,
    addEmptyItemRow,
    descriptionRefs,
    handleItemKeyDown,
    isQuickBilling,
    setIsQuickBilling,
    activeStep,
    setActiveStep,
    savedInvoiceData,
    draftPreviewData,
    sendWhatsApp,
    setSendWhatsApp,
    currentUserId,
    profile,
    parties,
    products,
    selectedParty,
    formatCurrency,
    isItemWiseTax,
    subtotal,
    overallDiscountAmount,
    taxAmount,
    taxRate,
    roundOffDiff,
    totalAmount,
    currentInvoiceDue,
    partyPreviousBalance,
    partyClosingDue,
    watchItems,
    watchCustomerName,
    watchCustomerPhone,
    watchCustomerEmail,
    watchCustomerGstin,
    watchPlaceOfSupply,
    watchQuickItemName,
    watchQuickTotalAmount,
    watchStatus,
    handleCustomerSelect,
    handleProductSelect,
    handleQuickAddProduct,
    handleSmartParse,
    handlePreviewDraft,
    onSubmit,
    handleCloseDialog,
    isPending: createInvoiceMutation.isPending,
  };
}
