import { useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { offlineMutate } from "@/core/offline/apiService";
import { purchasesApi } from "@/core/api/purchases";
import { PurchaseItemRowData } from "../components/purchase/PurchaseItemsTable";

export interface PurchaseFormValues {
  vendor_name: string;
  vendor_phone: string;
  vendor_email?: string;
  vendor_gstin: string;
  place_of_supply: string;
  bill_number: string;
  date: string;
  due_date: string;
  payment_status: "paid" | "partial" | "pending";
  amount_paid: number;
  discount_amount: number;
  tax_rate: number;
  notes: string;
  attachment_url?: string;
  items: PurchaseItemRowData[];
  quick_item_name?: string;
  quick_total_amount?: number;
}

interface UseRecordPurchaseMutationParams {
  user: any;
  purchaseToEdit?: any;
  vendorParties: any[];
  products: any[];
  getDefaultDueDate: (baseDate?: string) => string;
  onSuccessCallback: () => void;
}

export function useRecordPurchaseMutation({
  user,
  purchaseToEdit,
  vendorParties,
  products,
  getDefaultDueDate,
  onSuccessCallback,
}: UseRecordPurchaseMutationParams) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  return useMutation({
    mutationFn: async (values: PurchaseFormValues) => {
      if (!user) throw new Error("User not authenticated");

      if (!values.vendor_name?.trim()) {
        throw new Error("Supplier / Vendor name is required.");
      }

      // Filter out empty trailing item rows
      const validItems = values.items.filter((it) => it.description.trim() !== "");
      const finalItemsList = validItems.length > 0 ? validItems : values.items;

      if (finalItemsList.length === 0 || !finalItemsList[0].description.trim()) {
        throw new Error("Please add at least one product with a name.");
      }

      const purchaseId = purchaseToEdit ? purchaseToEdit.id : uuidv4();

      // ------------------------------------------------
      // 1. AUTHORITATIVE SERVER API PURCHASE CREATION
      // ------------------------------------------------
      if (!purchaseToEdit && navigator.onLine) {
        try {
          const cachedProducts: any[] = queryClient.getQueryData(["products", user.id]) || [];
          const authoritativePurchase = await purchasesApi.recordPurchase({
            party_id: null,
            vendor_name: values.vendor_name.trim(),
            vendor_phone: values.vendor_phone?.trim() || null,
            vendor_email: values.vendor_email?.trim() || null,
            vendor_gstin: values.vendor_gstin?.trim()?.toUpperCase() || null,
            place_of_supply: values.place_of_supply?.trim() || null,
            bill_number: values.bill_number?.trim() || null,
            date: values.date,
            due_date: values.due_date || null,
            items: finalItemsList.map((item) => ({
              product_id: cachedProducts.find(
                (p: any) => p.name?.toLowerCase() === item.description.trim().toLowerCase()
              )?.id,
              name: item.description.trim(),
              description: item.description.trim(),
              quantity: Number(item.quantity || 1),
              price: Number(item.price || 0),
              discount: Number(item.discount || 0),
              tax_rate: item.tax_rate !== undefined ? Number(item.tax_rate) : undefined,
              unit: item.unit || "pc",
            })),
            discount_amount: Number(values.discount_amount || 0),
            tax_rate: Number(values.tax_rate || 0),
            status: values.payment_status || "paid",
            amount_paid: Number(values.amount_paid || 0),
            notes: values.notes || null,
            attachment_url: values.attachment_url || null,
          });

          if (authoritativePurchase && authoritativePurchase.id) {
            queryClient.invalidateQueries({ queryKey: ["purchases", user.id] });
            queryClient.invalidateQueries({ queryKey: ["products", user.id] });
            queryClient.invalidateQueries({ queryKey: ["parties", user.id] });
            queryClient.invalidateQueries({ queryKey: ["api-purchases"] });
            return {
              purchaseId: authoritativePurchase.id,
              purchaseData: authoritativePurchase,
              productSyncs: [],
              userId: user.id,
            };
          }
        } catch (apiErr) {
          console.warn("[RecordPurchase] Server authoritative purchase API error, falling back to local queue:", apiErr);
        }
      }

      const calcSubtotal = finalItemsList.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
        0
      );

      const calcItemDiscounts = finalItemsList.reduce((sum, item) => {
        const lineVal = Number(item.quantity || 0) * Number(item.price || 0);
        return sum + (lineVal * Number(item.discount || 0)) / 100;
      }, 0);

      const calcTaxAmount = finalItemsList.reduce((sum, item) => {
        const lineVal = Number(item.quantity || 0) * Number(item.price || 0);
        const lineDiscount = (lineVal * Number(item.discount || 0)) / 100;
        const lineTaxable = Math.max(0, lineVal - lineDiscount);
        const rate = Number(item.tax_rate ?? values.tax_rate ?? 0);
        return sum + (lineTaxable * rate) / 100;
      }, 0);

      const calcTotalAmount = Math.max(
        0,
        calcSubtotal - calcItemDiscounts - Number(values.discount_amount || 0) + calcTaxAmount
      );

      const calcAmountPaid = Number(values.amount_paid || 0);
      const calcBalanceDue = Math.max(0, calcTotalAmount - calcAmountPaid);

      let calcStatus: "paid" | "pending" | "overdue" | "partial" = "paid";
      if (calcAmountPaid >= calcTotalAmount && calcTotalAmount > 0) {
        calcStatus = "paid";
      } else if (calcAmountPaid > 0 && calcAmountPaid < calcTotalAmount) {
        calcStatus = "partial";
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(values.due_date || getDefaultDueDate());
        due.setHours(0, 0, 0, 0);
        calcStatus = due < today ? "overdue" : "pending";
      }

      // Auto-Save Vendor to Parties Directory if not already present
      let resolvedPartyId: string | null = null;
      if (values.vendor_name?.trim()) {
        const existingVendor = vendorParties.find(
          (p: any) => p.name?.toLowerCase() === values.vendor_name.trim().toLowerCase()
        );
        if (existingVendor) {
          resolvedPartyId = existingVendor.id;
        } else {
          resolvedPartyId = uuidv4();
          await offlineMutate({
            table: "parties",
            action: "insert",
            recordId: resolvedPartyId,
            payload: {
              id: resolvedPartyId,
              user_id: user.id,
              name: values.vendor_name.trim(),
              type: "vendor",
              phone: values.vendor_phone || null,
              gst_number: values.vendor_gstin || null,
              opening_balance: 0,
              opening_balance_type: "to_pay",
            },
            userId: user.id,
          });
        }
      }

      const purchaseData = {
        id: purchaseId,
        user_id: user.id,
        party_id: resolvedPartyId,
        bill_number: values.bill_number || `BILL-${Date.now().toString().slice(-6)}`,
        vendor_name: values.vendor_name.trim(),
        vendor_phone: values.vendor_phone || null,
        vendor_gstin: values.vendor_gstin || null,
        place_of_supply:
          values.place_of_supply ||
          (values.vendor_gstin ? values.vendor_gstin.substring(0, 2) : null),
        date: values.date,
        due_date: values.due_date,
        amount_paid: calcAmountPaid,
        balance_due: calcBalanceDue,
        status: calcStatus,
        tax_rate: Number(values.tax_rate || 0),
        tax_amount: calcTaxAmount,
        discount_amount: Number(values.discount_amount || 0) + calcItemDiscounts,
        subtotal: calcSubtotal,
        total_amount: calcTotalAmount,
        notes: values.notes || null,
        attachment_url: values.attachment_url || null,
        items: finalItemsList.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
          unit: item.unit || "pc",
          discount: Number(item.discount || 0),
          tax_rate: Number(item.tax_rate ?? values.tax_rate ?? 0),
          total:
            Number(item.quantity || 1) *
            Number(item.price || 0) *
            (1 - Number(item.discount || 0) / 100),
        })),
      };

      const productSyncs: any[] = [];
      const cachedProducts: any[] =
        queryClient.getQueryData(["products", user.id]) || products || [];

      // Safe DB Saver with schema fallback (prevents column missing errors on Supabase DB)
      const savePurchaseToDB = async (
        action: "insert" | "update",
        rId: string,
        pData: any
      ) => {
        try {
          const res = await offlineMutate({
            table: "purchases",
            action,
            recordId: rId,
            payload: pData,
            userId: user.id,
          });
          if (!res.error) return res;
        } catch (err: any) {
          console.warn(
            "Full purchases schema insert threw exception, falling back to core DB schema:",
            err
          );
        }

        const corePayload = {
          id: pData.id,
          user_id: pData.user_id,
          bill_number: pData.bill_number,
          vendor_name: pData.vendor_name,
          date: pData.date,
          status: pData.status,
          subtotal: pData.subtotal,
          tax_amount: pData.tax_amount,
          total_amount: pData.total_amount,
          items: pData.items,
        };

        return await offlineMutate({
          table: "purchases",
          action,
          recordId: rId,
          payload: corePayload,
          userId: user.id,
        });
      };

      if (purchaseToEdit) {
        const { error } = await savePurchaseToDB("update", purchaseToEdit.id, purchaseData);
        if (error) throw error;
      } else {
        const { error: purchaseError } = await savePurchaseToDB(
          "insert",
          purchaseId,
          purchaseData
        );
        if (purchaseError) throw purchaseError;

        // Sync inventory stock for purchased items
        for (const item of finalItemsList) {
          if (!item.description?.trim()) continue;

          const existingProduct = cachedProducts.find(
            (p: any) =>
              p.name?.toLowerCase() === item.description.trim().toLowerCase()
          );

          if (existingProduct) {
            const newQty =
              Number(existingProduct.stock_quantity || 0) +
              Number(item.quantity || 1);
            const { error: updateError } = await offlineMutate({
              table: "products",
              action: "update",
              recordId: existingProduct.id,
              payload: { stock_quantity: newQty },
              userId: user.id,
            });
            if (updateError) throw updateError;
            productSyncs.push({
              id: existingProduct.id,
              name: item.description.trim(),
              isNew: false,
              quantity: Number(item.quantity),
              price: Number(item.price),
              unit: item.unit || existingProduct.unit || "pc",
            });
          } else {
            const productId = uuidv4();
            const { error: insertProdError } = await offlineMutate({
              table: "products",
              action: "insert",
              recordId: productId,
              payload: {
                id: productId,
                user_id: user.id,
                name: item.description.trim(),
                price: Number(item.price || 0),
                cost_price: Number(item.price || 0),
                stock_quantity: Number(item.quantity || 1),
                unit: item.unit || "pc",
              },
              userId: user.id,
            });
            if (insertProdError) throw insertProdError;
            productSyncs.push({
              id: productId,
              name: item.description.trim(),
              isNew: true,
              quantity: Number(item.quantity),
              price: Number(item.price),
              unit: item.unit || "pc",
            });
          }
        }
      }

      return { purchaseId, purchaseData, productSyncs, userId: user.id };
    },
    onSuccess: (data) => {
      const { purchaseData, productSyncs, userId } = data;

      queryClient.setQueryData(["purchases", userId], (old: any) => {
        if (purchaseToEdit) {
          return old
            ? old.map((p: any) =>
                p.id === purchaseToEdit.id ? { ...p, ...purchaseData } : p
              )
            : [purchaseData];
        } else {
          return old ? [purchaseData, ...old] : [purchaseData];
        }
      });

      if (productSyncs.length > 0) {
        queryClient.setQueryData(["products", userId], (old: any) => {
          const prods = old ? [...old] : [];
          for (const sync of productSyncs) {
            if (sync.isNew) {
              prods.push({
                id: sync.id,
                user_id: userId,
                name: sync.name,
                price: sync.price,
                cost_price: sync.price,
                stock_quantity: sync.quantity,
                unit: sync.unit,
              });
            } else {
              const idx = prods.findIndex((p: any) => p.id === sync.id);
              if (idx !== -1) {
                prods[idx] = {
                  ...prods[idx],
                  stock_quantity:
                    Number(prods[idx].stock_quantity || 0) + sync.quantity,
                };
              }
            }
          }
          return prods;
        });
      }

      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["purchases"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["parties"] });
      }

      toast({
        title: purchaseToEdit ? "Purchase Bill Updated" : "Purchase Recorded",
        description:
          purchaseData.balance_due > 0
            ? `Saved bill. Balance due of ${formatCurrency(
                purchaseData.balance_due
              )} added to ${purchaseData.vendor_name}.`
            : "Purchase saved and paid in full.",
      });

      onSuccessCallback();
    },
    onError: (error: any) => {
      toast({
        title: "Error Recording Purchase",
        description: error?.message || "Failed to save purchase bill.",
        variant: "destructive",
      });
    },
  });
}
