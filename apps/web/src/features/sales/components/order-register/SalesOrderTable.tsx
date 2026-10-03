import React from "react";
import {
  ShoppingBag,
  PackageCheck,
  Truck,
  MoreHorizontal,
  History,
  Eye,
  Download,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SaleOrder, SaleOrderStatus } from "../../types/orders";
import { calculateOrderStockSummary } from "../../hooks/useOrders";

interface SalesOrderTableProps {
  orders: SaleOrder[];
  isLoading: boolean;
  onOpenCreate: () => void;
  onDeliver: (order: SaleOrder) => void;
  onProcure: (order: SaleOrder) => void;
  onTimeline: (order: SaleOrder) => void;
  onPreviewPDF: (order: SaleOrder) => void;
  onDownloadPDF: (order: SaleOrder) => void;
  onEdit: (order: SaleOrder) => void;
  onDelete: (orderId: string, orderNumber: string) => void;
}

export function getSalesOrderStatusBadge(status: SaleOrderStatus) {
  switch (status) {
    case "confirmed":
      return (
        <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 text-[11px] font-semibold">
          Confirmed
        </Badge>
      );
    case "partially_delivered":
      return (
        <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 text-[11px] font-semibold">
          Partially Delivered
        </Badge>
      );
    case "delivered":
      return (
        <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-semibold">
          Delivered & Invoiced
        </Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 text-[11px] font-semibold">
          Cancelled
        </Badge>
      );
    case "draft":
    default:
      return (
        <Badge
          variant="outline"
          className="text-slate-600 dark:text-slate-400 text-[11px]"
        >
          Draft
        </Badge>
      );
  }
}

export const SalesOrderTable: React.FC<SalesOrderTableProps> = ({
  orders,
  isLoading,
  onOpenCreate,
  onDeliver,
  onProcure,
  onTimeline,
  onPreviewPDF,
  onDownloadPDF,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        Loading sales orders...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
          No Sales Orders Found
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
          Book customer advance orders, track fulfillment stages, and convert confirmed orders to GST Tax Invoices in 1-click.
        </p>
        <Button
          onClick={onOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-5 rounded-xl shadow-md shadow-indigo-500/20 gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Create First Sales Order
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3.5">Order No & Date</th>
              <th className="p-3.5">Customer</th>
              <th className="p-3.5">Items Ordered</th>
              <th className="p-3.5 w-40">Delivery Progress</th>
              <th className="p-3.5 w-40">Procured via PO</th>
              <th className="p-3.5 text-right">Order Value</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {orders.map((order) => {
              const summary = calculateOrderStockSummary(order);
              const deliveryPct =
                summary.ordered > 0
                  ? Math.min(100, Math.round((summary.delivered / summary.ordered) * 100))
                  : 0;
              const procurePct =
                summary.ordered > 0
                  ? Math.min(100, Math.round((summary.purchased / summary.ordered) * 100))
                  : 0;

              return (
                <tr
                  key={order.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3.5">
                    <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      #{order.order_number}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {order.order_date}
                    </div>
                  </td>

                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {order.customer_name}
                    </div>
                    {order.customer_phone && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {order.customer_phone}
                      </div>
                    )}
                  </td>

                  <td className="p-3.5">
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      {order.items?.length || 0} line item(s)
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {summary.ordered} total units
                    </div>
                  </td>

                  {/* Delivery Progress Bar */}
                  <td className="p-3.5">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-mono">
                          {summary.delivered}/{summary.ordered} units
                        </span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {deliveryPct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                          style={{ width: `${deliveryPct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Procurement Progress Bar */}
                  <td className="p-3.5">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-mono">
                          {summary.purchased}/{summary.ordered} units
                        </span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {procurePct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${procurePct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5 text-right font-mono">
                    <div className="font-bold text-slate-900 dark:text-white">
                      ₹
                      {Number(order.total_amount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    {Number(order.advance_paid) > 0 && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Adv: ₹{Number(order.advance_paid).toLocaleString("en-IN")}
                      </div>
                    )}
                  </td>

                  <td className="p-3.5 text-center">
                    {getSalesOrderStatusBadge(order.status)}
                  </td>

                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {order.status !== "delivered" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDeliver(order)}
                          className="h-7 text-[11px] gap-1 px-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                          title="Deliver & Convert to Sale Invoice"
                        >
                          <PackageCheck className="w-3 h-3" />
                          <span>Deliver</span>
                        </Button>
                      )}

                      {summary.remainingProcurement > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onProcure(order)}
                          className="h-7 text-[11px] gap-1 px-2 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/50"
                          title="Create Purchase Order from this Sale Order"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Procure</span>
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem
                            onClick={() => onTimeline(order)}
                            className="gap-2 cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5 text-indigo-500" />
                            <span>View Order Timeline</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onPreviewPDF(order)}
                            className="gap-2 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Preview PDF Slip</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDownloadPDF(order)}
                            className="gap-2 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>Download PDF Slip</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onEdit(order)}
                            className="gap-2 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-500" />
                            <span>Edit Order</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(order.id, order.order_number)}
                            className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Order</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
