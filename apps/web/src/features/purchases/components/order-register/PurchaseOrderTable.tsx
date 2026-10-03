import React from "react";
import {
  ShoppingCart,
  ReceiptIndianRupee,
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
import { PurchaseOrder, PurchaseOrderStatus } from "../../types/orders";

interface PurchaseOrderTableProps {
  orders: PurchaseOrder[];
  isLoading: boolean;
  onOpenCreate: () => void;
  onReceive: (order: PurchaseOrder) => void;
  onTimeline: (order: PurchaseOrder) => void;
  onPreviewPDF: (order: PurchaseOrder) => void;
  onDownloadPDF: (order: PurchaseOrder) => void;
  onEdit: (order: PurchaseOrder) => void;
  onDelete: (poId: string, poNumber: string) => void;
}

export function getPurchaseOrderStatusBadge(status: PurchaseOrderStatus) {
  switch (status) {
    case "sent":
      return (
        <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800 text-[11px] font-semibold">
          Sent to Supplier
        </Badge>
      );
    case "partially_received":
      return (
        <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 text-[11px] font-semibold">
          Partially Received
        </Badge>
      );
    case "received":
      return (
        <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-semibold">
          Received & Billed
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

export const PurchaseOrderTable: React.FC<PurchaseOrderTableProps> = ({
  orders,
  isLoading,
  onOpenCreate,
  onReceive,
  onTimeline,
  onPreviewPDF,
  onDownloadPDF,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        Loading purchase orders...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
          No Purchase Orders Found
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
          Place formal vendor purchase orders, track inbound shipments, and convert received goods directly into Purchase Bills with automatic inventory increments.
        </p>
        <Button
          onClick={onOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-5 rounded-xl shadow-md shadow-emerald-500/20 gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Create First Purchase Order
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
              <th className="p-3.5">PO No & Date</th>
              <th className="p-3.5">Supplier / Vendor</th>
              <th className="p-3.5">Items Ordered</th>
              <th className="p-3.5 w-48">Receipt Progress</th>
              <th className="p-3.5 text-right">PO Total</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {orders.map((order) => {
              const items = order.items || [];
              const orderedQty = items.reduce(
                (acc, i) => acc + (Number(i.quantity) || 0),
                0
              );
              const receivedQty = items.reduce(
                (acc, i) => acc + (Number(i.received_qty) || 0),
                0
              );
              const receiptPct =
                orderedQty > 0
                  ? Math.min(100, Math.round((receivedQty / orderedQty) * 100))
                  : 0;

              return (
                <tr
                  key={order.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3.5">
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      #{order.po_number}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {order.order_date}
                    </div>
                  </td>

                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {order.vendor_name}
                    </div>
                    {order.vendor_phone && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {order.vendor_phone}
                      </div>
                    )}
                  </td>

                  <td className="p-3.5">
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      {items.length} line item(s)
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {orderedQty} total units
                    </div>
                  </td>

                  {/* Receipt Progress Bar */}
                  <td className="p-3.5">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-mono">
                          {receivedQty}/{orderedQty} units
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {receiptPct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                          style={{ width: `${receiptPct}%` }}
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
                      <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                        Adv: ₹{Number(order.advance_paid).toLocaleString("en-IN")}
                      </div>
                    )}
                  </td>

                  <td className="p-3.5 text-center">
                    {getPurchaseOrderStatusBadge(order.status)}
                  </td>

                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {order.status !== "received" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReceive(order)}
                          className="h-7 text-[11px] gap-1 px-2 border-teal-200 text-teal-600 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-950/50"
                          title="Receive Goods & Convert to Purchase Bill"
                        >
                          <ReceiptIndianRupee className="w-3 h-3" />
                          <span>Receive & Bill</span>
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
                            <History className="w-3.5 h-3.5 text-teal-500" />
                            <span>View PO Timeline</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onPreviewPDF(order)}
                            className="gap-2 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-500" />
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
                            <span>Edit PO</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(order.id, order.po_number)}
                            className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete PO</span>
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
