import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Boxes,
  CheckCircle,
  Truck,
  ShoppingCart,
  FileText,
} from "lucide-react";
import { SaleOrder } from "../../types/orders";
import { calculateOrderStockSummary } from "../../hooks/useOrders";

interface SaleOrderTimelineProps {
  order: SaleOrder;
  soRelations?: {
    invoices?: any[];
    purchaseOrders?: any[];
  } | null;
}

export const SaleOrderTimeline: React.FC<SaleOrderTimelineProps> = ({
  order,
  soRelations,
}) => {
  const stockSummary = calculateOrderStockSummary(order);
  const invoices = soRelations?.invoices || [];
  const linkedPOs = soRelations?.purchaseOrders || [];

  return (
    <div className="space-y-6">
      {/* Stock Accounting Callout Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <div>
          <span className="text-[11px] text-slate-500 font-medium">Total Ordered</span>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono">
            {stockSummary.ordered} <span className="text-xs font-normal">units</span>
          </p>
        </div>
        <div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
            <Boxes className="w-3 h-3" /> Reserved Stock
          </span>
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">
            {stockSummary.reserved} <span className="text-xs font-normal">units</span>
          </p>
          <p className="text-[10px] text-slate-400 leading-tight">Physical stock intact</p>
        </div>
        <div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Delivered
          </span>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {stockSummary.delivered} <span className="text-xs font-normal">units</span>
          </p>
          <p className="text-[10px] text-slate-400 leading-tight">Deducted from stock</p>
        </div>
        <div>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
            <Truck className="w-3 h-3" /> Procured via PO
          </span>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">
            {stockSummary.purchased} <span className="text-xs font-normal">units</span>
          </p>
          <p className="text-[10px] text-slate-400 leading-tight">
            {stockSummary.remainingProcurement > 0
              ? `${stockSummary.remainingProcurement} still to procure`
              : "Procurement complete"}
          </p>
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-900 space-y-8 my-4 ml-4">
        {/* Node 1: Order Booking */}
        <div className="relative">
          <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow">
            <CheckCircle className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Sale Order Booked</span>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                >
                  #{order.order_number}
                </Badge>
              </h4>
              <span className="text-xs text-slate-400 font-mono">{order.order_date}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Customer: <strong>{order.customer_name}</strong>{" "}
              {order.customer_phone ? `(${order.customer_phone})` : ""}
            </p>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between font-medium">
                <span>Order Value: ₹{Number(order.total_amount).toLocaleString("en-IN")}</span>
                {Number(order.advance_paid) > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Advance Token: ₹{Number(order.advance_paid).toLocaleString("en-IN")}
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

        {/* Node 2: Procurement (Linked POs) */}
        <div className="relative">
          <div
            className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow ${
              linkedPOs.length > 0
                ? "bg-blue-600 text-white"
                : "bg-slate-200 dark:bg-slate-700 text-slate-500"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Procurement & Supplier POs</span>
                <span className="text-xs font-normal text-slate-400">({linkedPOs.length} linked)</span>
              </h4>
            </div>

            {linkedPOs.length === 0 ? (
              <p className="text-xs text-slate-400 italic mt-1">
                No purchase orders generated for this order yet.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {linkedPOs.map((link: any) => (
                  <div
                    key={link.id}
                    className="p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>PO #{link.purchase_order?.po_number || "PO"}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-700">
                        {link.purchase_order?.status || "Sent"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Supplier: <strong>{link.purchase_order?.vendor_name || "Vendor"}</strong> • PO Value:
                      ₹{Number(link.purchase_order?.total_amount || 0).toLocaleString("en-IN")}
                    </p>
                    {link.procured_items && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Procured:{" "}
                        {link.procured_items.map((pi: any) => `${pi.name} (${pi.quantity})`).join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Node 3: Fulfillment & Sale Invoices */}
        <div className="relative">
          <div
            className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow ${
              invoices.length > 0
                ? "bg-emerald-600 text-white"
                : "bg-slate-200 dark:bg-slate-700 text-slate-500"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Deliveries & Tax Invoices</span>
                <span className="text-xs font-normal text-slate-400">({invoices.length} created)</span>
              </h4>
            </div>

            {invoices.length === 0 ? (
              <p className="text-xs text-slate-400 italic mt-1">
                Order pending physical delivery. No Sale Invoices issued yet.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {invoices.map((link: any) => (
                  <div
                    key={link.id}
                    className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Invoice #{link.sale?.invoice_number || "Invoice"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {link.sale?.date}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      <span>Amount: ₹{Number(link.sale?.total_amount || 0).toLocaleString("en-IN")}</span>
                      <span className="capitalize font-semibold text-emerald-700 dark:text-emerald-400">
                        Status: {link.sale?.status || "Pending"}
                      </span>
                    </div>
                    {link.delivered_items && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Delivered:{" "}
                        {link.delivered_items.map((di: any) => `${di.name} (${di.quantity})`).join(", ")}
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
