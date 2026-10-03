import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { offlineMutate } from "@/core/offline/apiService";
import { v4 as uuidv4 } from "uuid";
import imageCompression from "browser-image-compression";
import { toast } from "@/core/hooks/use-toast";
import { z } from "zod";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { useExpensesQuery } from "@/features/expenses/api/useExpensesQuery";
import { Category, ExpenseRow, expenseSchema } from "./types";

export const createDefaultExpenseRow = (): ExpenseRow => ({
  id: uuidv4(),
  description: "",
  amount: "",
  categoryId: "",
  date: new Date().toISOString().split("T")[0],
  billFile: null,
  billPreview: null,
  taxAmount: "",
  invoiceNumber: "",
  vendorName: "",
  isReimbursable: false,
});

export function useAddExpenseDialog(
  categories: Category[],
  userId: string,
  onOpenChange: (open: boolean) => void
) {
  const queryClient = useQueryClient();
  const { currency } = useCurrency();
  const { isBusinessMode } = useBusiness();
  const { data: historicalExpenses = [] } = useExpensesQuery(userId);

  const [activeTab, setActiveTab] = useState(0);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([createDefaultExpenseRow()]);

  const isValidRow = (row: ExpenseRow) => {
    return (
      row.description.trim().length > 0 &&
      !isNaN(parseFloat(row.amount)) &&
      parseFloat(row.amount) > 0 &&
      row.categoryId !== ""
    );
  };

  const addRow = () => {
    const newRow = createDefaultExpenseRow();
    setExpenses([...expenses, newRow]);
    setActiveTab(expenses.length);
  };

  const removeRow = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();

    if (expenses.length === 1) {
      toast({ title: "Cannot delete last item", variant: "destructive" });
      return;
    }

    if (expenses[index].billPreview) {
      URL.revokeObjectURL(expenses[index].billPreview!);
    }

    const newExpenses = expenses.filter((_, i) => i !== index);
    setExpenses(newExpenses);

    if (activeTab >= index && activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
  };

  const updateExpense = (field: keyof ExpenseRow, value: any) => {
    const updated = [...expenses];
    updated[activeTab] = { ...updated[activeTab], [field]: value };
    setExpenses(updated);
  };

  const handleSmartParse = (data: { amount: string; description: string; categoryName?: string }) => {
    const updated = [...expenses];
    const current = updated[activeTab];

    if (data.amount) current.amount = data.amount;
    if (data.description) current.description = data.description;

    if (data.categoryName) {
      const matchedCategory = categories.find(
        (c) => c.name.toLowerCase() === data.categoryName!.toLowerCase()
      );
      if (matchedCategory) {
        current.categoryId = matchedCategory.id;
        toast({
          title: "AI Magic ✨",
          description: `Auto-selected category: ${matchedCategory.name}`,
        });
      }
    }
    setExpenses(updated);
  };

  const handleBillData = (data: any) => {
    const updated = [...expenses];
    const current = updated[activeTab];

    if (data.merchant_name) current.description = data.merchant_name;
    if (data.merchant_name && isBusinessMode) current.vendorName = data.merchant_name;

    if (data.total_amount) current.amount = data.total_amount.toString();
    if (data.tax_amount && isBusinessMode) current.taxAmount = data.tax_amount.toString();

    if (data.bill_date) current.date = data.bill_date;
    if (data.invoice_id && isBusinessMode) current.invoiceNumber = data.invoice_id;

    if (data.category_suggestion) {
      const match = categories.find(
        (c) => c.name.toLowerCase() === data.category_suggestion?.toLowerCase()
      );
      if (match) current.categoryId = match.id;
    }
    setExpenses(updated);
  };

  const handleFileUpload = (file: File, preview: string) => {
    const updated = [...expenses];
    if (updated[activeTab].billPreview) URL.revokeObjectURL(updated[activeTab].billPreview!);
    updated[activeTab].billFile = file;
    updated[activeTab].billPreview = preview;
    setExpenses(updated);
  };

  const handleClearFile = () => {
    const updated = [...expenses];
    if (updated[activeTab].billPreview) URL.revokeObjectURL(updated[activeTab].billPreview!);
    updated[activeTab].billFile = null;
    updated[activeTab].billPreview = null;
    setExpenses(updated);
  };

  const uploadBillToStorage = async (file: File): Promise<string | null> => {
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      let fileToUpload = file;
      if (file.type.startsWith("image/")) {
        fileToUpload = await imageCompression(file, options);
      }

      const fileExt = fileToUpload.name.split(".").pop() || "jpg";
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error } = await supabase.storage.from("bills").upload(fileName, fileToUpload);
      if (error) return null;
      return fileName;
    } catch (err) {
      console.error("Error uploading bill:", err);
      return null;
    }
  };

  const addExpensesMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        expenses.map(async (e) => {
          let billUrl: string | null = null;
          try {
            if (e.billFile && navigator.onLine) billUrl = await uploadBillToStorage(e.billFile);
          } catch (err) {
            console.warn("Storage upload deferred/failed offline", err);
          }

          const recordPayload = {
            id: e.id,
            description: e.description,
            amount: parseFloat(e.amount),
            category_id: e.categoryId,
            date: e.date,
            user_id: userId,
            bill_url: billUrl,
            tax_amount: e.taxAmount ? parseFloat(e.taxAmount) : null,
            invoice_number: e.invoiceNumber || null,
            vendor_name: e.vendorName || null,
            is_reimbursable: e.isReimbursable || false,
          };

          const result = await offlineMutate({
            table: "expenses",
            action: "insert",
            recordId: e.id,
            payload: recordPayload,
            userId,
          });

          if (result.error) throw result.error;
        })
      );
    },
    onSuccess: () => {
      if (userId) {
        queryClient.setQueryData(["expenses", userId], (old: any[] | undefined) => {
          const optimisticNewItems = expenses.map((e) => ({
            id: e.id,
            description: e.description,
            amount: parseFloat(e.amount),
            date: e.date,
            user_id: userId,
            category_id: e.categoryId,
            tax_amount: e.taxAmount ? parseFloat(e.taxAmount) : null,
            invoice_number: e.invoiceNumber || null,
            vendor_name: e.vendorName || null,
            is_reimbursable: e.isReimbursable || false,
            categories: categories.find((c) => c.id === e.categoryId) || {
              name: "Pending Sync",
              icon: "wifi-off",
              color: "#94a3b8",
            },
          }));
          return [...optimisticNewItems, ...(old || [])];
        });
      }

      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["expenses", userId] });
      }
      toast({ title: "Success", description: "All expenses saved successfully." });
      onOpenChange(false);

      // Reset
      expenses.forEach((e) => e.billPreview && URL.revokeObjectURL(e.billPreview));
      setExpenses([createDefaultExpenseRow()]);
      setActiveTab(0);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    try {
      expenses.forEach((e) =>
        expenseSchema.parse({
          description: e.description,
          amount: parseFloat(e.amount),
          category_id: e.categoryId,
          date: e.date,
          tax_amount: e.taxAmount ? parseFloat(e.taxAmount) : undefined,
          invoice_number: e.invoiceNumber,
          vendor_name: e.vendorName,
          is_reimbursable: e.isReimbursable,
        })
      );
      addExpensesMutation.mutate();
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast({ title: "Something is missing", description: "Please check all fields.", variant: "destructive" });
      }
    }
  };

  const currentExpense = expenses[activeTab];

  return {
    currency,
    isBusinessMode,
    historicalExpenses,
    activeTab,
    setActiveTab,
    expenses,
    currentExpense,
    isValidRow,
    addRow,
    removeRow,
    updateExpense,
    handleSmartParse,
    handleBillData,
    handleFileUpload,
    handleClearFile,
    handleSubmit,
    isPending: addExpensesMutation.isPending,
  };
}
