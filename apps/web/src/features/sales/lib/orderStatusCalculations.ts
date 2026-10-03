import {
    SaleOrder,
    SaleOrderItem,
    PurchaseOrderItem,
    SaleOrderStatus,
    PurchaseOrderStatus,
    OrderStockSummary,
} from "../types/orders";

// ─── DERIVED STATUS LOGIC ───────────────────────────────────────────────────────
// In accordance with enterprise CA standards: document status is derived from
// quantities delivered/received rather than purely manual entry.

export function computeSaleOrderStatus(
    items: SaleOrderItem[],
    currentStatus: SaleOrderStatus
): SaleOrderStatus {
    if (currentStatus === "cancelled" || currentStatus === "draft") return currentStatus;
    if (!items || items.length === 0) return currentStatus;

    const allFulfilled = items.every((it) => (Number(it.delivered_qty) || 0) >= (Number(it.quantity) || 0));
    if (allFulfilled) {
        return "delivered";
    }

    const anyDelivered = items.some((it) => (Number(it.delivered_qty) || 0) > 0);
    if (anyDelivered) {
        return "partially_delivered";
    }

    return "confirmed";
}

export function computePurchaseOrderStatus(
    items: PurchaseOrderItem[],
    currentStatus: PurchaseOrderStatus
): PurchaseOrderStatus {
    if (currentStatus === "cancelled" || currentStatus === "draft") return currentStatus;
    if (!items || items.length === 0) return currentStatus;

    const allReceived = items.every((it) => (Number(it.received_qty) || 0) >= (Number(it.quantity) || 0));
    if (allReceived) {
        return "received";
    }

    const anyReceived = items.some((it) => (Number(it.received_qty) || 0) > 0);
    if (anyReceived) {
        return "partially_received";
    }

    return "sent";
}

export function calculateOrderStockSummary(order: SaleOrder): OrderStockSummary {
    const items = order.items || [];
    const ordered = items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
    const delivered = items.reduce((acc, i) => acc + (Number(i.delivered_qty) || 0), 0);
    const purchased = items.reduce((acc, i) => acc + (Number(i.purchased_qty) || 0), 0);

    const remainingDelivery = items.reduce((acc, i) => {
        const ord = Number(i.quantity) || 0;
        const del = Number(i.delivered_qty) || 0;
        return acc + Math.max(0, ord - del);
    }, 0);

    const remainingProcurement = items.reduce((acc, i) => {
        const ord = Number(i.quantity) || 0;
        const pur = Number(i.purchased_qty) || 0;
        return acc + Math.max(0, ord - pur);
    }, 0);

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
