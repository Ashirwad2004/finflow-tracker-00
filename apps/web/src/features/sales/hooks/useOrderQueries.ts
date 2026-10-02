import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";
import {
    SaleOrder,
    PurchaseOrder,
    SaleOrderInvoiceLink,
    SaleOrderPurchaseOrderLink,
    PurchaseOrderBillLink,
} from "../types/orders";

export function useSaleOrders(userId?: string) {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ["sale_orders", userId],
        queryFn: async () => {
            if (!userId) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("sale_orders")
                    .select("*")
                    .eq("user_id", userId)
                    .order("order_date", { ascending: false });

                if (!error && data) return data as SaleOrder[];
            } catch (err) {
                console.warn("[useSaleOrders] Fetch failed offline, falling back to local storage:", err);
            }

            const cached = queryClient.getQueryData<SaleOrder[]>(["sale_orders", userId]);
            if (cached && cached.length > 0) return cached;

            const local = await sqliteService.getAll<SaleOrder>("sale_orders", userId);
            return local || [];
        },
        enabled: !!userId,
    });
}

export function usePurchaseOrders(userId?: string) {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ["purchase_orders", userId],
        queryFn: async () => {
            if (!userId) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("purchase_orders")
                    .select("*")
                    .eq("user_id", userId)
                    .order("order_date", { ascending: false });

                if (!error && data) return data as PurchaseOrder[];
            } catch (err) {
                console.warn("[usePurchaseOrders] Fetch failed offline, falling back to local storage:", err);
            }

            const cached = queryClient.getQueryData<PurchaseOrder[]>(["purchase_orders", userId]);
            if (cached && cached.length > 0) return cached;

            const local = await sqliteService.getAll<PurchaseOrder>("purchase_orders", userId);
            return local || [];
        },
        enabled: !!userId,
    });
}

export function useSaleOrderRelations(saleOrderId?: string, userId?: string) {
    return useQuery({
        queryKey: ["sale_order_relations", saleOrderId],
        queryFn: async () => {
            if (!saleOrderId || !userId) return { invoices: [], purchaseOrders: [] };

            try {
                const [invRes, poRes] = await Promise.all([
                    (supabase as any)
                        .from("sale_order_invoices")
                        .select("*, sale:sales(id, invoice_number, date, total_amount, amount_paid, balance_due, status)")
                        .eq("sale_order_id", saleOrderId),
                    (supabase as any)
                        .from("sale_order_purchase_orders")
                        .select("*, purchase_order:purchase_orders(id, po_number, vendor_name, order_date, total_amount, status)")
                        .eq("sale_order_id", saleOrderId),
                ]);

                if (!invRes.error && !poRes.error && invRes.data && poRes.data) {
                    return {
                        invoices: (invRes.data || []) as SaleOrderInvoiceLink[],
                        purchaseOrders: (poRes.data || []) as SaleOrderPurchaseOrderLink[],
                    };
                }
            } catch (err) {
                console.warn("[useSaleOrderRelations] Online fetch failed, trying local fallback:", err);
            }

            // Local fallback for offline mode
            try {
                const localInvoices = await sqliteService.getAll<any>("sale_order_invoices", userId);
                const filteredInvoices = (localInvoices || []).filter((i: any) => i.sale_order_id === saleOrderId);
                const localSales = await sqliteService.getAll<any>("sales", userId);
                const enrichedInvoices = filteredInvoices.map((inv: any) => {
                    const s = (localSales || []).find((x: any) => x.id === inv.sale_id);
                    return {
                        ...inv,
                        sale: s
                            ? {
                                  id: s.id,
                                  invoice_number: s.invoice_number,
                                  date: s.date,
                                  total_amount: Number(s.total_amount) || 0,
                                  amount_paid: Number(s.amount_paid) || 0,
                                  balance_due: Number(s.balance_due) || 0,
                                  status: s.status,
                              }
                            : undefined,
                    };
                });

                const localPOs = await sqliteService.getAll<any>("sale_order_purchase_orders", userId);
                const filteredPOs = (localPOs || []).filter((p: any) => p.sale_order_id === saleOrderId);
                const localPOList = await sqliteService.getAll<any>("purchase_orders", userId);
                const enrichedPOs = filteredPOs.map((link: any) => {
                    const po = (localPOList || []).find((x: any) => x.id === link.purchase_order_id);
                    return {
                        ...link,
                        purchase_order: po
                            ? {
                                  id: po.id,
                                  po_number: po.po_number,
                                  vendor_name: po.vendor_name,
                                  order_date: po.order_date,
                                  total_amount: Number(po.total_amount) || 0,
                                  status: po.status,
                              }
                            : undefined,
                    };
                });

                return {
                    invoices: enrichedInvoices as SaleOrderInvoiceLink[],
                    purchaseOrders: enrichedPOs as SaleOrderPurchaseOrderLink[],
                };
            } catch (localErr) {
                console.warn("[useSaleOrderRelations] Local fallback error:", localErr);
                return { invoices: [], purchaseOrders: [] };
            }
        },
        enabled: !!saleOrderId && !!userId,
    });
}

export function usePurchaseOrderRelations(purchaseOrderId?: string, userId?: string) {
    return useQuery({
        queryKey: ["purchase_order_relations", purchaseOrderId],
        queryFn: async () => {
            if (!purchaseOrderId || !userId) return { bills: [], sourceSaleOrders: [] };

            try {
                const [billsRes, soRes] = await Promise.all([
                    (supabase as any)
                        .from("purchase_order_bills")
                        .select("*, purchase:purchases(id, bill_number, date, total_amount, status)")
                        .eq("purchase_order_id", purchaseOrderId),
                    (supabase as any)
                        .from("sale_order_purchase_orders")
                        .select("*, sale_order:sale_orders(id, order_number, customer_name, order_date, total_amount, status)")
                        .eq("purchase_order_id", purchaseOrderId),
                ]);

                if (!billsRes.error && !soRes.error && billsRes.data && soRes.data) {
                    return {
                        bills: (billsRes.data || []) as PurchaseOrderBillLink[],
                        sourceSaleOrders: soRes.data || [],
                    };
                }
            } catch (err) {
                console.warn("[usePurchaseOrderRelations] Online fetch failed, trying local fallback:", err);
            }

            // Local fallback for offline mode
            try {
                const localBills = await sqliteService.getAll<any>("purchase_order_bills", userId);
                const filteredBills = (localBills || []).filter((b: any) => b.purchase_order_id === purchaseOrderId);
                const localPurchases = await sqliteService.getAll<any>("purchases", userId);
                const enrichedBills = filteredBills.map((b: any) => {
                    const p = (localPurchases || []).find((x: any) => x.id === b.purchase_id);
                    return {
                        ...b,
                        purchase: p
                            ? {
                                  id: p.id,
                                  bill_number: p.bill_number,
                                  date: p.date,
                                  total_amount: Number(p.total_amount) || 0,
                                  status: p.status,
                              }
                            : undefined,
                    };
                });

                const localSOPOs = await sqliteService.getAll<any>("sale_order_purchase_orders", userId);
                const filteredSOPOs = (localSOPOs || []).filter((link: any) => link.purchase_order_id === purchaseOrderId);
                const localSOs = await sqliteService.getAll<any>("sale_orders", userId);
                const enrichedSOs = filteredSOPOs.map((link: any) => {
                    const so = (localSOs || []).find((x: any) => x.id === link.sale_order_id);
                    return {
                        ...link,
                        sale_order: so
                            ? {
                                  id: so.id,
                                  order_number: so.order_number,
                                  customer_name: so.customer_name,
                                  order_date: so.order_date,
                                  total_amount: Number(so.total_amount) || 0,
                                  status: so.status,
                              }
                            : undefined,
                    };
                });

                return {
                    bills: enrichedBills as PurchaseOrderBillLink[],
                    sourceSaleOrders: enrichedSOs,
                };
            } catch (localErr) {
                console.warn("[usePurchaseOrderRelations] Local fallback error:", localErr);
                return { bills: [], sourceSaleOrders: [] };
            }
        },
        enabled: !!purchaseOrderId && !!userId,
    });
}
