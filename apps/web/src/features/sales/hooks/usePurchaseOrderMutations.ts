import { useMutation, useQueryClient } from "@tanstack/react-query";
import { offlineMutate } from "@/core/offline/apiService";
import {
    PurchaseOrder,
    PurchaseOrderItem,
    SaleOrder,
} from "../types/orders";
import { computePurchaseOrderStatus } from "../lib/orderStatusCalculations";

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
        product_id?: string;
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
                    product_id: it.product_id,
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
                    (p) =>
                        (p.item_id && p.item_id === orderItem.id) ||
                        p.name.trim().toLowerCase() === orderItem.name.trim().toLowerCase()
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
            try {
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
            } catch (juncErr) {
                console.warn("[useProcureSaleOrderToPO] Junction record insert warning:", juncErr);
            }

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
        product_id?: string;
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
                party_id: purchaseOrder.party_id || null,
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
                    (r) =>
                        (r.item_id && poItem.id && r.item_id === poItem.id) ||
                        (r.product_id && poItem.product_id && r.product_id === poItem.product_id) ||
                        r.name.trim().toLowerCase() === poItem.name.trim().toLowerCase()
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
            try {
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
            } catch (juncErr) {
                console.warn("[useConvertPurchaseOrderToBill] Junction record insert warning:", juncErr);
            }

            // 5. Add to inventory stock if requested
            if (addStock !== false && dbProducts && Array.isArray(dbProducts)) {
                for (const item of receivedItems) {
                    const matchedProduct = dbProducts.find(
                        (p: any) =>
                            (item.product_id && p.id === item.product_id) ||
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
                            console.warn(
                                "[useConvertPurchaseOrderToBill] Stock addition failed for",
                                matchedProduct.name,
                                err
                            );
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
            queryClient.invalidateQueries({ queryKey: ["parties", userId] });
            queryClient.invalidateQueries({ queryKey: ["purchase_order_relations", variables.purchaseOrder.id] });
        },
    });
}
