import { useMutation, useQueryClient } from "@tanstack/react-query";
import { offlineMutate } from "@/core/offline/apiService";
import { SaleOrder } from "../types/orders";
import { computeSaleOrderStatus } from "../lib/orderStatusCalculations";

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

export interface ConvertSaleOrderToInvoiceParams {
    saleOrder: SaleOrder;
    deliveryItems: {
        item_id?: string;
        product_id?: string;
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
            const {
                saleOrder,
                deliveryItems,
                invoiceNumber,
                invoiceDate,
                dueDate,
                paymentStatus,
                paymentMethod,
                amountPaid,
                deductStock,
                dbProducts,
            } = params;

            const saleId = crypto.randomUUID();
            const now = new Date().toISOString();
            const dateStr = invoiceDate || now.split("T")[0];

            // 1. Calculate items amounts
            const saleItems = deliveryItems.map((it) => {
                const sub = it.quantity * it.price;
                const tax = ((it.tax_rate || 0) * sub) / 100;
                return {
                    id: crypto.randomUUID(),
                    product_id: it.product_id,
                    name: it.name,
                    description: it.name,
                    quantity: it.quantity,
                    price: it.price,
                    amount: sub,
                    total: sub + tax,
                    tax_rate: it.tax_rate || 0,
                    tax_amount: tax,
                    unit: it.unit || "pcs",
                    hsn_code: it.hsn_code || "",
                };
            });

            const subtotal = saleItems.reduce((acc, i) => acc + i.quantity * i.price, 0);
            const tax_amount = saleItems.reduce((acc, i) => acc + (i.tax_amount || 0), 0);
            const total_amount = subtotal + tax_amount;
            const paid = Number(amountPaid) || 0;
            const balance_due = Math.max(0, total_amount - paid);
            const derivedStatus =
                paymentStatus || (balance_due === 0 ? "paid" : paid > 0 ? "partial" : "pending");

            // 2. Insert into `sales` table with CA ledger & compliance fields
            const noteParts = [
                `Generated from Sale Order #${saleOrder.order_number}`,
                saleOrder.billing_address ? `Billing: ${saleOrder.billing_address}` : null,
                saleOrder.shipping_address && saleOrder.shipping_address !== saleOrder.billing_address
                    ? `Shipping: ${saleOrder.shipping_address}`
                    : null,
                saleOrder.notes || null,
            ].filter(Boolean);
            const formattedNotes = noteParts.join(" • ");

            const salePayload: any = {
                id: saleId,
                user_id: userId,
                party_id: saleOrder.party_id || null,
                customer_name: saleOrder.customer_name,
                customer_phone: saleOrder.customer_phone || null,
                customer_email: saleOrder.customer_email || null,
                customer_gstin: saleOrder.customer_gstin || null,
                place_of_supply:
                    saleOrder.place_of_supply ||
                    (saleOrder.customer_gstin ? saleOrder.customer_gstin.trim().substring(0, 2) : null),
                document_type: "invoice",
                invoice_number: invoiceNumber,
                date: dateStr,
                due_date: dueDate || null,
                status: derivedStatus,
                payment_method: paymentMethod || "Cash",
                subtotal,
                discount_amount: 0,
                tax_rate: saleItems.length > 0 ? saleItems[0].tax_rate : 0,
                tax_amount,
                total_amount,
                amount_paid: paid,
                balance_due,
                items: saleItems,
                notes: formattedNotes,
                created_at: now,
            };

            let saleErr: any = null;
            try {
                const res = await offlineMutate({
                    table: "sales",
                    action: "insert",
                    recordId: saleId,
                    payload: salePayload,
                    userId,
                });
                saleErr = res?.error;
            } catch (e: any) {
                saleErr = e;
            }

            // Resilient fallback to core sales columns if remote DB schema lacks optional columns
            if (saleErr) {
                console.warn(
                    "[useConvertSaleOrderToInvoice] Full schema insert warning, falling back to core columns:",
                    saleErr
                );
                const coreSalePayload = {
                    id: saleId,
                    user_id: userId,
                    party_id: saleOrder.party_id || null,
                    invoice_number: invoiceNumber,
                    customer_name: saleOrder.customer_name,
                    customer_phone: saleOrder.customer_phone || null,
                    customer_email: saleOrder.customer_email || null,
                    date: dateStr,
                    status: derivedStatus,
                    subtotal,
                    tax_amount,
                    total_amount,
                    amount_paid: paid,
                    balance_due,
                    payment_method: paymentMethod || "Cash",
                    items: saleItems,
                    notes: formattedNotes,
                    created_at: now,
                };
                const coreRes = await offlineMutate({
                    table: "sales",
                    action: "insert",
                    recordId: saleId,
                    payload: coreSalePayload,
                    userId,
                });
                if (coreRes?.error) throw coreRes.error;
            }

            // 3. Update delivered_qty on Sale Order items
            const updatedItems = (saleOrder.items || []).map((orderItem) => {
                const deliveredNow = deliveryItems.find(
                    (d) =>
                        (d.item_id && orderItem.id && d.item_id === orderItem.id) ||
                        (d.product_id && orderItem.product_id && d.product_id === orderItem.product_id) ||
                        d.name.trim().toLowerCase() === orderItem.name.trim().toLowerCase()
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
            try {
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
            } catch (juncErr) {
                console.warn("[useConvertSaleOrderToInvoice] Junction record insert warning:", juncErr);
            }

            // 5. Deduct inventory stock if requested (Production CA / ERP standard)
            if (deductStock !== false && dbProducts && Array.isArray(dbProducts)) {
                for (const item of deliveryItems) {
                    const matchedProduct = dbProducts.find(
                        (p: any) =>
                            (item.product_id && p.id === item.product_id) ||
                            (p.name && item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
                    );
                    if (matchedProduct && matchedProduct.id) {
                        const currentStock = Number(matchedProduct.stock_quantity) || 0;
                        const newStock = Math.max(0, currentStock - (Number(item.quantity) || 0));
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
                                "[useConvertSaleOrderToInvoice] Stock deduction failed for",
                                matchedProduct.name,
                                err
                            );
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
            queryClient.invalidateQueries({ queryKey: ["parties", userId] });
            queryClient.invalidateQueries({ queryKey: ["sale_order_relations", variables.saleOrder.id] });
        },
    });
}
