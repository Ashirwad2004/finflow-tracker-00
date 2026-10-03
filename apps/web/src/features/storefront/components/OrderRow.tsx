import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronRight,
  Clock,
  MapPin,
  Package,
  Phone,
  User,
} from "lucide-react";
import { OnlineOrder, statusConfig } from "../types";

export function OrderRow({
  order,
  formatCurrency,
  onStatusChange,
  isUpdating,
}: {
  order: OnlineOrder;
  formatCurrency: (n: number) => string;
  onStatusChange: (orderId: string, status: string) => void;
  isUpdating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[order.status] ?? statusConfig.pending;

  const formattedDate = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedTime = new Date(order.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      {/* ── Main Row ── */}
      <TableRow
        className="cursor-pointer hover:bg-muted/40 transition-colors select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Expand chevron + Customer */}
        <TableCell>
          <div className="flex items-center gap-2">
            <span
              className="text-muted-foreground flex-shrink-0 transition-transform duration-200"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="font-semibold text-sm">{order.customer_name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" />
                {order.customer_phone}
              </div>
            </div>
          </div>
        </TableCell>

        {/* Date */}
        <TableCell className="text-sm">
          <div className="font-medium">{formattedDate}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formattedTime}
          </div>
        </TableCell>

        {/* Items count */}
        <TableCell className="text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="w-3.5 h-3.5" />
            <span>
              {order.online_order_items?.length ?? 0} item
              {(order.online_order_items?.length ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>
        </TableCell>

        {/* Amount */}
        <TableCell className="font-semibold text-sm">{formatCurrency(order.total_amount)}</TableCell>

        {/* Status badge */}
        <TableCell>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}
          >
            {cfg.label}
          </span>
        </TableCell>

        {/* Status update — stop propagation so clicking the select doesn't toggle the row */}
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <Select
            defaultValue={order.status}
            onValueChange={(val) => onStatusChange(order.id, val)}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-[130px] ml-auto h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
      </TableRow>

      {/* ── Expandable Detail Panel ── */}
      {expanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={6} className="p-0">
            <div className="px-6 py-5 border-t border-dashed border-border space-y-4 animate-fade-in">
              {/* Delivery Address */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-background border border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Delivery Address
                  </p>
                  {order.customer_address ? (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {order.customer_address}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No address provided</p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              {order.online_order_items && order.online_order_items.length > 0 && (
                <div className="rounded-xl border border-border overflow-hidden bg-background">
                  <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ordered Items
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {order.online_order_items.map((item, idx) => (
                      <div key={item.id ?? idx} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                            style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))" }}
                          >
                            {item.quantity}
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">
                            {item.products?.name ?? `Product (${item.product_id.slice(0, 8)}…)`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(item.price_at_time)} × {item.quantity}
                          </span>
                          <span className="text-sm font-bold text-foreground min-w-[60px] text-right">
                            {formatCurrency(item.price_at_time * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Total row */}
                  {order.delivery_charge > 0 && (
                    <div className="flex items-center justify-between px-4 pt-3 pb-1 border-t border-border bg-muted/30">
                      <span className="text-xs font-medium text-muted-foreground">Delivery Fee</span>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {formatCurrency(order.delivery_charge)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex items-center justify-between px-4 pb-3 ${
                      order.delivery_charge > 0 ? "pt-1" : "pt-3 border-t border-border"
                    } bg-muted/30`}
                  >
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Order Total
                    </span>
                    <span className="text-sm font-black text-primary">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Customer info row */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <User className="w-3 h-3" />
                <span>{order.customer_name}</span>
                <span className="text-border">·</span>
                <Phone className="w-3 h-3" />
                <span>{order.customer_phone}</span>
                <span className="text-border">·</span>
                <Clock className="w-3 h-3" />
                <span>
                  Placed on {formattedDate} at {formattedTime}
                </span>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
