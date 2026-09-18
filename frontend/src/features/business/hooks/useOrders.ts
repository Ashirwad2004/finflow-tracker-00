import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { offlineMutate } from "@/core/offline/apiService";
import { sqliteService } from "@/core/offline/sqliteService";
import {
    SaleOrder,
    PurchaseOrder,
    SaleOrderItem,
    PurchaseOrderItem,
    SaleOrderStatus,
    PurchaseOrderStatus,
    OrderStockSummary,
    SaleOrderInvoiceLink,
    SaleOrderPurchaseOrderLink,
    PurchaseOrderBillLink,
} from "../types/orders";

// ─── DERIVED STATUS LOGIC ───────────────────────────────────────────────────────
// In accordance with enterprise CA standards: document status is derived from
// quantities delivered/received rather than purely manual entry.

export function computeSaleOrderStatus(
    items: SaleOrderItem[],
    currentStatus: SaleOrderStatus
): SaleOrderStatus {
    if (currentStatus === "cancelled" || currentStatus === "draft") return currentStatus;

    const totalOrdered = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    const totalDelivered = items.reduce((acc, it) => acc + (Number(it.delivered_qty) || 0), 0);

    if (totalOrdered > 0 && totalDelivered >= totalOrdered) {
        return "delivered";
    }
    if (totalDelivered > 0) {
        return "partially_delivered";
    }
    return "confirmed";
}

export function computePurchaseOrderStatus(
    items: PurchaseOrderItem[],
    currentStatus: PurchaseOrderStatus
): PurchaseOrderStatus {
    if (currentStatus === "cancelled" || currentStatus === "draft") return currentStatus;

    const totalOrdered = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    const totalReceived = items.reduce((acc, it) => acc + (Number(it.received_qty) || 0), 0);

    if (totalOrdered > 0 && totalReceived >= totalOrdered) {
        return "received";
    }
    if (totalReceived > 0) {
        return "partially_received";
    }
    return "sent";
}

export function calculateOrderStockSummary(order: SaleOrder): OrderStockSummary {
    const items = order.items || [];
    const ordered = items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
    const delivered = items.reduce((acc, i) => acc + (Number(i.delivered_qty) || 0), 0);
    const purchased = items.reduce((acc, i) => acc + (Number(i.purchased_qty) || 0), 0);

    const remainingDelivery = Math.max(0, ordered - delivered);
    const remainingProcurement = Math.max(0, ordered - purchased);
    const reserved = order.status !== "cancelled" && order.status !== "delivered" ? remainingDelivery : 0;

    return {
        ordered,
        reserved,
        delivered,
        invoiced: delivered,
        remainingDelivery,
        purchased,
        remainingProcurement,
    };
}

// ─── QUERY HOOKS ────────────────────────────────────────────────────────────────

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
                        .select("*, sale:sales(id, invoice_number, date, total_amount, status)")
                        .eq("sale_order_id", saleOrderId),
                    (supabase as any)
                        .from("sale_order_purchase_orders")
                        .select("*, purchase_order:purchase_orders(id, po_number, vendor_name, order_date, total_amount, status)")
                        .eq("sale_order_id", saleOrderId),
                ]);

                return {
                    invoices: (invRes.data || []) as SaleOrderInvoiceLink[],
                    purchaseOrders: (poRes.data || []) as SaleOrderPurchaseOrderLink[],
                };
            } catch (err) {
                console.warn("[useSaleOrderRelations] Failed to fetch relations:", err);
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

                return {
                    bills: (billsRes.data || []) as PurchaseOrderBillLink[],
                    sourceSaleOrders: soRes.data || [],
                };
            } catch (err) {
                console.warn("[usePurchaseOrderRelations] Failed to fetch relations:", err);
                return { bills: [], sourceSaleOrders: [] };
            }
        },
        enabled: !!purchaseOrderId && !!userId,
    });
}

// ─── MUTATION HOOKS ─────────────────────────────────────────────────────────────

export function useUpsertSaleOrder(userId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (order: Partial<SaleOrder> & { id?: string }) => {
            if (!userId) throw new Error("User authentication required");

            const id = order.id || crypto.randomUUID();
            const now = new Date().toISOString();
            const payload: any = {
                id,
                user_id: userId,
                order_number: order.order_number || `SO-${Date.now().toString().slice(-6)}`,
                party_id: order.party_id || null,
                customer_name: order.customer_name || "Walk-in Customer",
                customer_phone: order.customer_phone || null,
                customer_email: order.customer_email || null,
                customer_gstin: order.customer_gstin || null,
                billing_address: order.billing_address || null,
                shipping_address: order.shipping_address || null,
                place_of_supply: order.place_of_supply || null,
                order_date: order.order_date || now.split("T")[0],
                expected_delivery_date: order.expected_delivery_date || null,
                status: order.status || "confirmed",
                items: order.items || [],
                subtotal: Number(order.subtotal) || 0,
                tax_amount: Number(order.tax_amount) || 0,
                discount_amount: Number(order.discount_amount) || 0,
                total_amount: Number(order.total_amount) || 0,
                advance_paid: Number(order.advance_paid) || 0,
                notes: order.notes || null,
                terms_conditions: order.terms_conditions || null,
                updated_at: now,
            };

            if (!order.id) {
                payload.created_at = now;
            }

            const { error } = await offlineMutate({
                table: "sale_orders",
                action: order.id ? "update" : "insert",
                recordId: id,
                payload,
                userId,
            });

            if (error) throw error;
            return payload as SaleOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sale_orders", userId] });
        },
    });
}

export function useDeleteSaleOrder(userId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderId: string) => {
            if (!userId) throw new Error("User authentication required");

            const { error } = await offlineMutate({
                table: "sale_orders",
                action: "delete",
                recordId: orderId,
                userId,
            });

            if (error) throw error;
            return orderId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sale_orders", userId] });
        },
    });
}

export function useUpsertPurchaseOrder(userId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (order: Partial<PurchaseOrder> & { id?: string }) => {
            if (!userId) throw new Error("User authentication required");

            const id = order.id || crypto.randomUUID();
            const now = new Date().toISOString();
            const payload: any = {
                id,
                user_id: userId,
                po_number: order.po_number || `PO-${Date.now().toString().slice(-6)}`,
                party_id: order.party_id || null,
                vendor_name: order.vendor_name || "Supplier",
                vendor_phone: order.vendor_phone || null,
                vendor_email: order.vendor_email || null,
                vendor_gstin: order.vendor_gstin || null,
                billing_address: order.billing_address || null,
                shipping_address: order.shipping_address || null,
                place_of_supply: order.place_of_supply || null,
                order_date: order.order_date || now.split("T")[0],
                expected_delivery_date: order.expected_delivery_date || null,
                status: order.status || "sent",
                items: order.items || [],
                subtotal: Number(order.subtotal) || 0,
                tax_amount: Number(order.tax_amount) || 0,
                discount_amount: Number(order.discount_amount) || 0,
                total_amount: Number(order.total_amount) || 0,
                advance_paid: Number(order.advance_paid) || 0,
                notes: order.notes || null,
                terms_conditions: order.terms_conditions || null,
                updated_at: now,
            };

            if (!order.id) {
                payload.created_at = now;
            }

            const { error } = await offlineMutate({
                table: "purchase_orders",
                action: order.id ? "update" : "insert",
                recordId: id,
                payload,
                userId,
            });

            if (error) throw error;
            return payload as PurchaseOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase_orders", userId] });
        },
    });
}

export function useDeletePurchaseOrder(userId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (poId: string) => {
            if (!userId) throw new Error("User authentication required");

            const { error } = await offlineMutate({
                table: "purchase_orders",
                action: "delete",
                recordId: poId,
                userId,
            });

            if (error) throw error;
            return poId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase_orders", userId] });
        },
    });
}

export interface ConvertSaleOrderToInvoiceParams {
    saleOrder: SaleOrder;
    deliveryItems: {
        item_id?: string;
        name: string;
        quantity: number; // quantity delivered on this invoice
        price: number;
        tax_rate?: number;
        unit?: string;
        hsn_code?: string;
    }[];
    invoiceNumber: string;
    invoiceDate?: string;
    dueDate?: string;
    paymentStatus?: "paid" | "pending" | "partial";
    paymentMethod?: string;
    amountPaid?: number;
    deductStock?: boolean;
    dbProducts?: any[];
}

export function useConvertSaleOrderToInvoice(userId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: ConvertSaleOrderToInvoiceParams) => {
            if (!userId) throw new Error("User authentication required");
            const { saleOrder, deliveryItems, invoiceNumber, invoiceDate, dueDate, paymentStatus, paymentMethod, amountPaid, deductStock, dbProducts } = params;

            const saleId = crypto.randomUUID();
            const now = new Date().toISOString();
            const dateStr = invoiceDate || now.split("T")[0];

            // 1. Calculate items amounts
            const saleItems = deliveryItems.map((it) => {
                const sub = it.quantity * it.price;
                const tax = ((it.tax_rate || 0) * sub) / 100;
                return {
                    id: crypto.randomUUID(),
                    name: it.name,
                    quantity: it.quantity,
                    price: it.price,
                    amount: sub + tax,
                    total: sub + tax,
                    tax_rate: it.tax_rate || 0,
                    tax_amount: tax,
                    unit: it.unit || "pcs",
                    hsn_code: it.hsn_code || "",
                };
            });

            const subtotal = saleItems.reduce((acc, i) => acc + (i.quantity * i.price), 0);
            const tax_amount = saleItems.reduce((acc, i) => acc + (i.tax_amount || 0), 0);
            const total_amount = subtotal + tax_amount;
            const paid = Number(amountPaid) || 0;
            const balance_due = Math.max(0, total_amount - paid);

            // 2. Insert into `sales` table
            const salePayload = {
                id: saleId,
                user_id: userId,
                customer_name: saleOrder.customer_name,
                customer_phone: saleOrder.customer_phone || null,
                customer_email: saleOrder.customer_email || null,
                customer_gstin: saleOrder.customer_gstin || null,
                invoice_number: invoiceNumber,
                date: dateStr,
                due_date: dueDate || null,
                status: paymentStatus || (balance_due === 0 ? "paid" : paid > 0 ? "partial" : "pending"),
                payment_method: paymentMethod || "Cash",
                subtotal,
                tax_amount,
                total_amount,
                amount_paid: paid,
                balance_due,
                items: saleItems,
                notes: `Generated from Sale Order #${saleOrder.order_number}`,
            };

            const { error: saleErr } = await offlineMutate({
                table: "sales",
                action: "insert",
                recordId: saleId,
                payload: salePayload,
                userId,
            });
            if (saleErr) throw saleErr;

            // 3. Update delivered_qty on Sale Order items
            const updatedItems = (saleOrder.items || []).map((orderItem) => {
                const deliveredNow = deliveryItems.find(
                    (d) => (d.item_id && d.item_id === orderItem.id) || d.name.trim().toLowerCase() === orderItem.name.trim().toLowerCase()
                );
                const addQty = deliveredNow ? Number(deliveredNow.quantity) || 0 : 0;
                return {
                    ...orderItem,
                    delivered_qty: (Number(orderItem.delivered_qty) || 0) + addQty,
                };
            });

            const newStatus = computeSaleOrderStatus(updatedItems, saleOrder.status);

            const { error: orderErr } = await offlineMutate({
                table: "sale_orders",
                action: "update",
                recordId: saleOrder.id,
                payload: {
                    ...saleOrder,
                    items: updatedItems,
                    status: newStatus,
                    updated_at: now,
                },
                userId,
            });
            if (orderErr) throw orderErr;

            // 4. Create junction record in sale_order_invoices
            const junctionId = crypto.randomUUID();
            await offlineMutate({
                table: "sale_order_invoices",
                action: "insert",
                recordId: junctionId,
                payload: {
                    id: junctionId,
                    user_id: userId,
                    sale_order_id: saleOrder.id,
                    sale_id: saleId,
                    delivered_items: deliveryItems,
                    created_at: now,
                },
                userId,
            });

            // 5. Deduct inventory stock if requested (Production CA / ERP standard)
            if (deductStock !== false && dbProducts && Array.isArray(dbProducts)) {
                for (const item of deliveryItems) {
                    const matchedProduct = dbProducts.find(
                        (p: any) =>
                            (item.item_id && p.id === item.item_id) ||
                            (p.name && item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
                    );
                    if (matchedProduct && matchedProduct.id) {
                        const currentStock = Number(matchedProduct.stock_quantity) || 0;
                        const newStock = currentStock - (Number(item.quantity) || 0);
                        try {
                            await offlineMutate({
                                table: "products",
                                action: "update",
                                recordId: matchedProduct.id,
                                payload: {
                                    ...matchedProduct,
                                    stock_quantity: newStock,
                                },
                                userId,
                            });
                        } catch (err) {
                            console.warn("[useConvertSaleOrderToInvoice] Stock deduction failed for", matchedProduct.name, err);
                        }
                    }
                }
            }

            return { saleId, invoiceNumber, newStatus };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["sale_orders", userId] });
            queryClient.invalidateQueries({ queryKey: ["sales", userId] });
            queryClient.invalidateQueries({ queryKey: ["products", userId] });
            queryClient.invalidateQueries({ queryKey: ["sale_order_relations", variables.saleOrder.id] });
        },
    });
}

export interface ProcureSaleOrderToPOParams {
    saleOrder: SaleOrder;
    vendor: {
        id?: string;
        name: string;
        phone?: string;
        email?: string;
        gstin?: string;
        address?: string;
    };
    procureItems: {
        item_id?: string;
        name: string;
        quantity: number; // quantity procured on this PO
        price: number;
        tax_rate?: number;
        unit?: string;
        hsn_code?: string;
    }[];
    poNumber: string;
    orderDate?: string;
    expectedDeliveryDate?: string;
    notes?: string;
}

export function useProcureSaleOrderToPO(userId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: ProcureSaleOrderToPOParams) => {
            if (!userId) throw new Error("User authentication required");
            const { saleOrder, vendor, procureItems, poNumber, orderDate, expectedDeliveryDate, notes } = params;

            const poId = crypto.randomUUID();
            const now = new Date().toISOString();
            const dateStr = orderDate || now.split("T")[0];

            // 1. Calculate PO items
            const poItems: PurchaseOrderItem[] = procureItems.map((it) => {
                const sub = it.quantity * it.price;
                const tax = ((it.tax_rate || 0) * sub) / 100;
                return {
                    id: crypto.randomUUID(),
                    name: it.name,
                    quantity: it.quantity,
                    price: it.price,
                    tax_rate: it.tax_rate || 0,
                    tax_amount: tax,
                    total: sub + tax,
                    unit: it.unit || "pcs",
                    hsn_code: it.hsn_code || "",
                    received_qty: 0,
                };
            });

            const subtotal = poItems.reduce((acc, i) => acc + (i.quantity * i.price), 0);
            const tax_amount = poItems.reduce((acc, i) => acc + (i.tax_amount || 0), 0);
            const total_amount = subtotal + tax_amount;

            // 2. Insert into purchase_orders table
            const poPayload: PurchaseOrder = {
                id: poId,
                user_id: userId,
                po_number: poNumber,
                party_id: vendor.id || null,
                vendor_name: vendor.name,
                vendor_phone: vendor.phone || null,
                vendor_email: vendor.email || null,
                vendor_gstin: vendor.gstin || null,
                billing_address: vendor.address || null,
                shipping_address: null,
                place_of_supply: null,
                order_date: dateStr,
                expected_delivery_date: expectedDeliveryDate || null,
                status: "sent",
                items: poItems,
                subtotal,
                tax_amount,
                discount_amount: 0,
                total_amount,
                advance_paid: 0,
                notes: notes || `Procured for Customer Sale Order #${saleOrder.order_number}`,
                terms_conditions: null,
                created_at: now,
                updated_at: now,
            };

            const { error: poErr } = await offlineMutate({
                table: "purchase_orders",
                action: "insert",
                recordId: poId,
                payload: poPayload,
                userId,
            });
            if (poErr) throw poErr;

            // 3. Update purchased_qty on Sale Order items
            const updatedSOItems = (saleOrder.items || []).map((orderItem) => {
                const matchProcured = procureItems.find(
                    (p) => (p.item_id && p.item_id === orderItem.id) || p.name.trim().toLowerCase() === orderItem.name.trim().toLowerCase()
                );
                const addQty = matchProcured ? Number(matchProcured.quantity) || 0 : 0;
                return {
                    ...orderItem,
                    purchased_qty: (Number(orderItem.purchased_qty) || 0) + addQty,
                };
            });

            const { error: soUpdateErr } = await offlineMutate({
                table: "sale_orders",
                action: "update",
                recordId: saleOrder.id,
                payload: {
                    ...saleOrder,
                    items: updatedSOItems,
                    updated_at: now,
                },
                userId,
            });
            if (soUpdateErr) throw soUpdateErr;

            // 4. Create junction link in sale_order_purchase_orders
            const junctionId = crypto.randomUUID();
            await offlineMutate({
                table: "sale_order_purchase_orders",
                action: "insert",
                recordId: junctionId,
                payload: {
                    id: junctionId,
                    user_id: userId,
                    sale_order_id: saleOrder.id,
                    purchase_order_id: poId,
                    procured_items: procureItems,
                    created_at: now,
                },
                userId,
            });

            return { poId, poNumber };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["sale_orders", userId] });
            queryClient.invalidateQueries({ queryKey: ["purchase_orders", userId] });
            queryClient.invalidateQueries({ queryKey: ["sale_order_relations", variables.saleOrder.id] });
        },
    });
}

export interface ConvertPurchaseOrderToBillParams {
    purchaseOrder: PurchaseOrder;
    receivedItems: {
        item_id?: string;
        name: string;
        quantity: number; // quantity received on this bill
        price: number;
        tax_rate?: number;
        unit?: string;
        hsn_code?: string;
    }[];
    billNumber: string;
    billDate?: string;
    notes?: string;
    addStock?: boolean;
    dbProducts?: any[];
}

export function useConvertPurchaseOrderToBill(userId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: ConvertPurchaseOrderToBillParams) => {
            if (!userId) throw new Error("User authentication required");
            const { purchaseOrder, receivedItems, billNumber, billDate, notes, addStock, dbProducts } = params;

            const purchaseId = crypto.randomUUID();
            const now = new Date().toISOString();
            const dateStr = billDate || now.split("T")[0];

            // 1. Calculate bill items
            const purchaseItems = receivedItems.map((it) => {
                const sub = it.quantity * it.price;
                const tax = ((it.tax_rate || 0) * sub) / 100;
                return {
                    id: crypto.randomUUID(),
                    name: it.name,
                    quantity: it.quantity,
                    price: it.price,
                    amount: sub + tax,
                    tax_rate: it.tax_rate || 0,
                    tax_amount: tax,
                    unit: it.unit || "pcs",
                    hsn_code: it.hsn_code || "",
                };
            });

            const subtotal = purchaseItems.reduce((acc, i) => acc + (i.quantity * i.price), 0);
            const tax_amount = purchaseItems.reduce((acc, i) => acc + (i.tax_amount || 0), 0);
            const total_amount = subtotal + tax_amount;

            // 2. Insert into `purchases` table
            const purchasePayload = {
                id: purchaseId,
                user_id: userId,
                bill_number: billNumber,
                vendor_name: purchaseOrder.vendor_name,
                vendor_phone: purchaseOrder.vendor_phone || null,
                vendor_email: purchaseOrder.vendor_email || null,
                vendor_gstin: purchaseOrder.vendor_gstin || null,
                date: dateStr,
                status: "received",
                subtotal,
                tax_amount,
                total_amount,
                items: purchaseItems,
                notes: notes || `Generated from Purchase Order #${purchaseOrder.po_number}`,
            };

            const { error: billErr } = await offlineMutate({
                table: "purchases",
                action: "insert",
                recordId: purchaseId,
                payload: purchasePayload,
                userId,
            });
            if (billErr) throw billErr;

            // 3. Update received_qty on Purchase Order items
            const updatedPOItems = (purchaseOrder.items || []).map((poItem) => {
                const receivedNow = receivedItems.find(
                    (r) => (r.item_id && r.item_id === poItem.id) || r.name.trim().toLowerCase() === poItem.name.trim().toLowerCase()
                );
                const addQty = receivedNow ? Number(receivedNow.quantity) || 0 : 0;
                return {
                    ...poItem,
                    received_qty: (Number(poItem.received_qty) || 0) + addQty,
                };
            });

            const newStatus = computePurchaseOrderStatus(updatedPOItems, purchaseOrder.status);

            const { error: poUpdateErr } = await offlineMutate({
                table: "purchase_orders",
                action: "update",
                recordId: purchaseOrder.id,
                payload: {
                    ...purchaseOrder,
                    items: updatedPOItems,
                    status: newStatus,
                    updated_at: now,
                },
                userId,
            });
            if (poUpdateErr) throw poUpdateErr;

            // 4. Create junction link in purchase_order_bills
            const junctionId = crypto.randomUUID();
            await offlineMutate({
                table: "purchase_order_bills",
                action: "insert",
                recordId: junctionId,
                payload: {
                    id: junctionId,
                    user_id: userId,
                    purchase_order_id: purchaseOrder.id,
                    purchase_id: purchaseId,
                    received_items: receivedItems,
                    created_at: now,
                },
                userId,
            });

            // 5. Add to inventory stock if requested
            if (addStock !== false && dbProducts && Array.isArray(dbProducts)) {
                for (const item of receivedItems) {
                    const matchedProduct = dbProducts.find(
                        (p: any) =>
                            (item.item_id && p.id === item.item_id) ||
                            (p.name && item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
                    );
                    if (matchedProduct && matchedProduct.id) {
                        const currentStock = Number(matchedProduct.stock_quantity) || 0;
                        const newStock = currentStock + (Number(item.quantity) || 0);
                        try {
                            await offlineMutate({
                                table: "products",
                                action: "update",
                                recordId: matchedProduct.id,
                                payload: {
                                    ...matchedProduct,
                                    stock_quantity: newStock,
                                },
                                userId,
                            });
                        } catch (err) {
                            console.warn("[useConvertPurchaseOrderToBill] Stock addition failed for", matchedProduct.name, err);
                        }
                    }
                }
            }

            return { purchaseId, billNumber, newStatus };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["purchase_orders", userId] });
            queryClient.invalidateQueries({ queryKey: ["purchases", userId] });
            queryClient.invalidateQueries({ queryKey: ["products", userId] });
            queryClient.invalidateQueries({ queryKey: ["purchase_order_relations", variables.purchaseOrder.id] });
        },
    });
}
