import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle,
  ShoppingCart,
  ReceiptIndianRupee,
} from "lucide-react";
import { PurchaseOrder } from "../../types/orders";

interface PurchaseOrderTimelineProps {
  order: PurchaseOrder;
  poRelations?: {
    bills?: any[];
    sourceSaleOrders?: any[];
  } | null;
}

export const PurchaseOrderTimeline: React.FC<PurchaseOrderTimelineProps> = ({
  order,
  poRelations,
}) => {
  const bills = poRelations?.bills || [];
  const sourceSOs = poRelations?.sourceSaleOrders || [];

  const totalOrdered = (order.items || []).reduce(
    (acc, i) => acc + (Number(i.quantity) || 0),
    0
  );
  const totalReceived = (order.items || []).reduce(
    (acc, i) => acc + (Number(i.received_qty) || 0),
    0
  );
  const remaining = Math.max(0, totalOrdered - totalReceived);

  return (
    <div className="space-y-6">
      {/* Stock Accounting Callout Banner */}
      <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <div>
          <span className="text-[11px] text-slate-500 font-medium">Total Ordered</span>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono">
            {totalOrdered} <span className="text-xs font-normal">units</span>
          </p>
        </div>
        <div>
          <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3" /> Expected Inbound
          </span>
          <p className="text-lg font-bold text-teal-600 dark:text-teal-400 font-mono">
            {remaining} <span className="text-xs font-normal">units</span>
          </p>
          <p className="text-[10px] text-slate-400 leading-tight">Pending delivery</p>
        </div>
        <div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Received into Stock
          </span>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {totalReceived} <span className="text-xs font-normal">units</span>
          </p>
          <p className="text-[10px] text-slate-400 leading-tight">Added to shelf</p>
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="relative pl-6 border-l-2 border-teal-200 dark:border-teal-900 space-y-8 my-4 ml-4">
        {/* Node 1: PO Placed */}
        <div className="relative">
          <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs shadow">
            <CheckCircle className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Purchase Order Issued</span>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
                >
                  #{order.po_number}
                </Badge>
              </h4>
              <span className="text-xs text-slate-400 font-mono">{order.order_date}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Vendor: <strong>{order.vendor_name}</strong>{" "}
              {order.vendor_phone ? `(${order.vendor_phone})` : ""}
            </p>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between font-medium">
                <span>PO Amount: ₹{Number(order.total_amount).toLocaleString("en-IN")}</span>
                {Number(order.advance_paid) > 0 && (
                  <span className="text-teal-600 dark:text-teal-400">
                    Advance Paid: ₹{Number(order.advance_paid).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Items:{" "}
                {order.items?.map((it) => `${it.name} (${it.quantity} ${it.unit || "pcs"})`).join(", ")}
              </p>
            </div>
          </div>
        </div>

        {/* Node 2: Source Customer Sale Order (if any) */}
        {sourceSOs.length > 0 && (
          <div className="relative">
            <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Procured for Customer Sale Order
              </h4>
              <div className="mt-2 space-y-2">
                {sourceSOs.map((link: any) => (
                  <div
                    key={link.id}
                    className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs"
                  >
                    <p className="font-semibold text-indigo-800 dark:text-indigo-300">
                      Order #{link.sale_order?.order_number}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Customer: {link.sale_order?.customer_name} • Total: ₹
                      {Number(link.sale_order?.total_amount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Node 3: Goods Receipts & Purchase Bills */}
        <div className="relative">
          <div
            className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow ${
              bills.length > 0
                ? "bg-emerald-600 text-white"
                : "bg-slate-200 dark:bg-slate-700 text-slate-500"
            }`}
          >
            <ReceiptIndianRupee className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Receipts & Purchase Bills</span>
                <span className="text-xs font-normal text-slate-400">({bills.length} received)</span>
              </h4>
            </div>

            {bills.length === 0 ? (
              <p className="text-xs text-slate-400 italic mt-1">
                Awaiting vendor delivery. No Purchase Bills recorded yet.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {bills.map((link: any) => (
                  <div
                    key={link.id}
                    className="p-3 rounded-lg border border-teal-200 dark:border-teal-900 bg-teal-50/40 dark:bg-teal-950/20 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-300">
                        <ReceiptIndianRupee className="w-3.5 h-3.5" />
                        <span>Bill #{link.purchase?.bill_number || "Bill"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {link.purchase?.date}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      <span>Amount: ₹{Number(link.purchase?.total_amount || 0).toLocaleString("en-IN")}</span>
                      <span className="capitalize font-semibold text-emerald-700 dark:text-emerald-400">
                        Status: {link.purchase?.status || "Received"}
                      </span>
                    </div>
                    {link.received_items && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Received into Stock:{" "}
                        {link.received_items.map((ri: any) => `${ri.name} (${ri.quantity})`).join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
