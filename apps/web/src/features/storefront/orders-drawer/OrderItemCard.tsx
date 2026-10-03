import React from "react";
import { Download, ArrowRightLeft, CreditCard } from "lucide-react";
import { isOrderDeclined } from "@/core/hooks/useStorefrontOrdersRealtime";
import { OrderRecord } from "./types";

interface OrderItemCardProps {
  order: OrderRecord;
  formatCurrency: (n: number) => string;
  isWithin24Hours: (dateStr: string) => boolean;
  onDownloadInvoice: (order: OrderRecord, items: any[]) => void;
  onRequestReturn: (order: OrderRecord) => void;
  onPayOrder?: (order: OrderRecord) => void;
}

export const OrderItemCard: React.FC<OrderItemCardProps> = ({
  order,
  formatCurrency,
  isWithin24Hours,
  onDownloadInvoice,
  onRequestReturn,
  onPayOrder,
}) => {
  let orderItems: any[] = [];
  try {
    if (typeof order.items === "string") {
      orderItems = JSON.parse(order.items);
    } else if (Array.isArray(order.items)) {
      orderItems = order.items;
    }
  } catch (e) {
    console.error("Error parsing items for order", order.id, e);
    orderItems = [];
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3 hover:border-slate-300 transition-all">
      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs font-bold text-slate-400 mb-1">
            {new Date(order.created_at).toLocaleDateString()} at{" "}
            {new Date(order.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="font-black text-slate-900">
            {formatCurrency(Number(order.total_amount))}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
              order.status === "completed"
                ? "bg-green-50 text-green-700 border border-green-200"
                : order.status === "accepted"
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : isOrderDeclined(order.status)
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-amber-50 text-amber-750 border border-amber-250"
            }`}
          >
            {isOrderDeclined(order.status) ? "rejected" : order.status}
          </span>

          {/* Payment Status Badge */}
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
              order.payment?.status === "success"
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : order.payment?.status === "refunded"
                ? "bg-purple-100 text-purple-700 border border-purple-200"
                : order.payment?.status === "failed"
                ? "bg-rose-100 text-rose-700 border border-rose-200"
                : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}
          >
            {order.payment ? order.payment.status : "unpaid"}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {orderItems && orderItems.length > 0 ? (
          orderItems.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-600 flex items-center gap-2">
                <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-[10px] font-bold text-slate-500">
                  {item.quantity}x
                </span>
                {item.product_name || "Unknown Product"}
              </span>
              <span className="font-bold text-slate-900">
                {formatCurrency(
                  (item.price_at_time || 0) * (item.quantity || 1)
                )}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400 italic">No items in this order</p>
        )}

        {Number(order.delivery_charge || 0) > 0 && (
          <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-dashed border-slate-100">
            <span>Delivery Fee</span>
            <span className="font-semibold text-slate-700">
              {formatCurrency(Number(order.delivery_charge))}
            </span>
          </div>
        )}

        {/* Return Status if present */}
        {order.returnRequest && (
          <div className="mt-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                Return Status:
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  order.returnRequest.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : order.returnRequest.status === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-indigo-100 text-indigo-700"
                }`}
              >
                {order.returnRequest.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Reason: &ldquo;{order.returnRequest.reason}&rdquo;
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {order.status === "accepted" && (
            <button
              onClick={() => onDownloadInvoice(order, orderItems)}
              className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 text-primary text-xs font-bold hover:bg-primary/5 active:scale-[0.98] transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Invoice
            </button>
          )}

          {order.status === "completed" && !order.returnRequest && (
            isWithin24Hours(order.created_at) ? (
              <button
                onClick={() => onRequestReturn(order)}
                className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl border border-rose-250 text-rose-650 text-xs font-bold hover:bg-rose-50 active:scale-[0.98] transition-all"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Return Order
              </button>
            ) : (
              <span className="flex-1 text-center py-2 bg-slate-50 border border-slate-200/50 rounded-xl text-[10px] text-slate-400 font-bold tracking-tight">
                Return Window Expired (24h limit)
              </span>
            )
          )}

          {order.payment?.status !== "success" &&
            order.payment?.status !== "refunded" &&
            order.status !== "completed" &&
            onPayOrder && (
              <button
                onClick={() => onPayOrder(order)}
                className="w-full h-9 flex items-center justify-center gap-1.5 rounded-xl text-white text-xs font-black active:scale-[0.98] transition-all shadow-md"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))",
                }}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Pay Online
              </button>
            )}
        </div>
      </div>
    </div>
  );
};
