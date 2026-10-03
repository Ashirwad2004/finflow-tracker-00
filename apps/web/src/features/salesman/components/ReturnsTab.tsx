import React from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { OrderReturn } from "./types";

interface ReturnsTabProps {
    orderReturns: OrderReturn[];
    isLoading: boolean;
    onPreviewImage: (url: string) => void;
    onUpdateStatus: (returnId: string, status: string) => void;
    isUpdatingStatus: boolean;
    formatCurrency: (amount: number) => string;
}

export const ReturnsTab: React.FC<ReturnsTabProps> = ({
    orderReturns,
    isLoading,
    onPreviewImage,
    onUpdateStatus,
    isUpdatingStatus,
    formatCurrency,
}) => {
    return (
        <div className="outline-none space-y-4">
            {isLoading ? (
                <div className="py-20 text-center text-muted-foreground animate-pulse flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
                    <span className="text-sm font-medium">Fetching returns...</span>
                </div>
            ) : orderReturns.length === 0 ? (
                <div className="py-20 text-center bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6">
                    <ArrowRightLeft className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-850 dark:text-slate-150">No returns submitted</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                        Return requests uploaded by storefront customers will appear here.
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-850">
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Order Info</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Photo Proof</TableHead>
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
                                        year: "numeric"
                                    });
                                    return (
                                        <TableRow key={ret.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30">
                                            <TableCell>
                                                <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{ord.customer_name || "N/A"}</div>
                                                <div className="text-[10px] text-muted-foreground mt-0.5">{ord.customer_phone || "N/A"}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs font-mono font-bold">Ord: {ret.order_id.slice(0, 8)}…</div>
                                                <div className="text-[10px] text-muted-foreground mt-0.5">Amount: {formatCurrency(ord.total_amount || 0)}</div>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate">
                                                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300" title={ret.reason}>{ret.reason}</div>
                                                <div className="text-[10px] text-muted-foreground mt-0.5">Filed: {formattedRetDate}</div>
                                            </TableCell>
                                            <TableCell>
                                                {ret.image_url ? (
                                                    <div 
                                                        className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-muted cursor-pointer hover:opacity-85 transition-opacity"
                                                        onClick={() => onPreviewImage(ret.image_url)}
                                                        title="Click to zoom proof"
                                                    >
                                                        <img src={ret.image_url} alt="Return proof" className="object-cover w-full h-full" />
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic font-medium">No photo</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={
                                                    ret.status === "approved" ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 text-[10px] font-black" :
                                                    ret.status === "rejected" ? "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30 text-[10px] font-black" :
                                                    "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30 text-[10px] font-black"
                                                }>
                                                    {ret.status.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {ret.status === "pending" ? (
                                                    <div className="inline-flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 rounded-lg text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400"
                                                            disabled={isUpdatingStatus}
                                                            onClick={() => onUpdateStatus(ret.id, "rejected")}
                                                        >
                                                            Reject
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-8 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                                            disabled={isUpdatingStatus}
                                                            onClick={() => onUpdateStatus(ret.id, "approved")}
                                                        >
                                                            Approve
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground font-medium italic">Processed</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    );
};
