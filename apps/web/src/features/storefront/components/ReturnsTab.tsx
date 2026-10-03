import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, ArrowRightLeft, Loader2 } from "lucide-react";
import { OrderReturn } from "../types";

interface ReturnsTabProps {
  orderReturns: OrderReturn[];
  isLoadingReturns: boolean;
  isFetchingReturns: boolean;
  returnsRefreshInterval: number | false;
  setReturnsRefreshInterval: (interval: number | false) => void;
  lastUpdatedReturns: Date;
  onRefreshReturns: () => void;
  onPreviewImage: (url: string) => void;
  onUpdateReturnStatus: (returnId: string, status: string) => void;
  isUpdatingReturn: boolean;
  formatCurrency: (amount: number) => string;
}

export function ReturnsTab({
  orderReturns,
  isLoadingReturns,
  isFetchingReturns,
  returnsRefreshInterval,
  setReturnsRefreshInterval,
  lastUpdatedReturns,
  onRefreshReturns,
  onPreviewImage,
  onUpdateReturnStatus,
  isUpdatingReturn,
  formatCurrency,
}: ReturnsTabProps) {
  return (
    <div className="bg-card border rounded-xl shadow-sm">
      <div className="p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Order Return Requests</h2>
          <Badge variant="secondary">{orderReturns.length} total</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {returnsRefreshInterval ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-450 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold">Live Monitoring ({returnsRefreshInterval / 1000}s)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full border">
              <span className="h-2 w-2 rounded-full bg-slate-400"></span>
              <span className="font-semibold">Monitoring Paused</span>
            </div>
          )}

          <span className="text-xs text-muted-foreground hidden md:inline">
            Last updated: {lastUpdatedReturns.toLocaleTimeString()}
          </span>

          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Interval:</span>
            <Select
              value={returnsRefreshInterval === false ? "off" : returnsRefreshInterval.toString()}
              onValueChange={(val) => {
                if (val === "off") {
                  setReturnsRefreshInterval(false);
                } else {
                  setReturnsRefreshInterval(Number(val));
                }
              }}
            >
              <SelectTrigger className="h-8 w-[80px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="5000">5s</SelectItem>
                <SelectItem value="10000">10s</SelectItem>
                <SelectItem value="30000">30s</SelectItem>
                <SelectItem value="60000">1m</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 gap-1.5 text-xs"
            onClick={onRefreshReturns}
            disabled={isFetchingReturns}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingReturns ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="p-0">
        {isLoadingReturns ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !orderReturns || orderReturns.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <ArrowRightLeft className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No return requests</h3>
            <p className="text-xs text-muted-foreground">
              Return requests submitted by storefront customers will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Order Info</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Product Photo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderReturns.map((ret: any) => {
                const ord = ret.online_orders || {};
                const formattedRetDate = new Date(ret.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                return (
                  <TableRow key={ret.id}>
                    <TableCell>
                      <div className="font-semibold text-sm">{ord.customer_name || "N/A"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{ord.customer_phone || "N/A"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold">Order ID: {ret.order_id.slice(0, 8)}…</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Amount: {formatCurrency(ord.total_amount || 0)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{formattedRetDate}</TableCell>
                    <TableCell className="text-xs text-slate-700 max-w-[200px] truncate" title={ret.reason}>
                      {ret.reason}
                    </TableCell>
                    <TableCell>
                      {ret.image_url ? (
                        <div
                          className="relative w-10 h-10 rounded-lg overflow-hidden border border-border bg-muted cursor-pointer hover:opacity-85 transition-opacity"
                          onClick={() => onPreviewImage(ret.image_url)}
                        >
                          <img
                            src={ret.image_url}
                            alt="Return product proof"
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No image</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          ret.status === "approved"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-100 text-[10px]"
                            : ret.status === "rejected"
                            ? "bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-100 text-[10px]"
                            : "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100 text-[10px]"
                        }
                      >
                        {ret.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {ret.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                            disabled={isUpdatingReturn}
                            onClick={() => onUpdateReturnStatus(ret.id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg text-xs bg-rose-50 text-rose-750 hover:bg-rose-100 border-rose-200"
                            disabled={isUpdatingReturn}
                            onClick={() => onUpdateReturnStatus(ret.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Processed</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
