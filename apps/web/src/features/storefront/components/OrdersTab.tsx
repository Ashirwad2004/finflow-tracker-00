import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, ChevronDown, ShoppingBag } from "lucide-react";
import { OnlineOrder } from "../types";
import { OrderRow } from "./OrderRow";

interface OrdersTabProps {
  orders: OnlineOrder[];
  isLoadingOrders: boolean;
  pendingCount: number;
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
  onRefresh: () => void;
  formatCurrency: (amount: number) => string;
  onStatusChange: (orderId: string, status: string) => void;
  isUpdatingStatus: boolean;
}

export function OrdersTab({
  orders,
  isLoadingOrders,
  pendingCount,
  autoRefresh,
  setAutoRefresh,
  onRefresh,
  formatCurrency,
  onStatusChange,
  isUpdatingStatus,
}: OrdersTabProps) {
  return (
    <div className="bg-card border rounded-xl shadow-sm h-full flex flex-col">
      <div className="p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Incoming Orders</h2>
          {pendingCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100 text-xs">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label
              htmlFor="auto-refresh"
              className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5 select-none font-medium"
            >
              {autoRefresh && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />}
              Auto-refresh (8s)
            </Label>
          </div>
          <div className="h-4 w-px bg-border" />
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-8 text-xs flex items-center gap-1.5 font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Badge variant="secondary">{orders.length} total</Badge>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="px-6 py-2.5 border-b border-dashed border-border bg-muted/20">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ChevronDown className="w-3 h-3" />
            Click any row to view delivery address and order items
          </p>
        </div>
      )}

      <div className="p-0 flex-1 relative">
        {isLoadingOrders ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24 px-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Once customers start placing orders on your storefront, they will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-0">
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  formatCurrency={formatCurrency}
                  onStatusChange={onStatusChange}
                  isUpdating={isUpdatingStatus}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
