import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, AlertCircle, ShoppingCart } from "lucide-react";
import { ProcureItemsDialogProps } from "./types";
import { useProcureItemsState } from "./useProcureItemsState";
import { ProcureVendorSection } from "./ProcureVendorSection";
import { ProcureItemsTable } from "./ProcureItemsTable";
import { ProcureSummaryNotes } from "./ProcureSummaryNotes";

export type { ProcureItemsDialogProps };

export const ProcureItemsDialog: React.FC<ProcureItemsDialogProps> = (props) => {
  const { open, onOpenChange, saleOrder, parties = [] } = props;

  const {
    vendorId,
    vendorName,
    setVendorName,
    vendorPhone,
    setVendorPhone,
    vendorGstin,
    setVendorGstin,
    poNumber,
    setPoNumber,
    orderDate,
    setOrderDate,
    expectedDeliveryDate,
    setExpectedDeliveryDate,
    notes,
    setNotes,
    rows,
    handleVendorSelect,
    updateRow,
    selectAllRemaining,
    selectedRows,
    estimatedTotal,
    handleSubmit,
    procureMutation,
  } = useProcureItemsState(props);

  if (!saleOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Procure Items for Order #{saleOrder.order_number}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Customer:{" "}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {saleOrder.customer_name}
                    </strong>{" "}
                    • Generate Purchase Order directly for suppliers.
                  </DialogDescription>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  New PO No.
                </span>
                <Input
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="h-8 font-mono text-xs font-bold w-40 text-right bg-white dark:bg-slate-800"
                  required
                />
              </div>
            </div>

            {/* Informational Banner */}
            <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-[11px] text-blue-800 dark:text-blue-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                <strong>Smart Procurement Flow:</strong> You can allocate items to different suppliers across multiple Purchase Orders. FinFlow tracks cumulative procured quantities so you never double-order.
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <ProcureVendorSection
              parties={parties}
              vendorId={vendorId}
              vendorName={vendorName}
              vendorPhone={vendorPhone}
              vendorGstin={vendorGstin}
              orderDate={orderDate}
              expectedDeliveryDate={expectedDeliveryDate}
              onVendorSelect={handleVendorSelect}
              onVendorNameChange={setVendorName}
              onVendorPhoneChange={setVendorPhone}
              onVendorGstinChange={setVendorGstin}
              onOrderDateChange={setOrderDate}
              onExpectedDeliveryDateChange={setExpectedDeliveryDate}
            />

            <ProcureItemsTable
              rows={rows}
              onUpdateRow={updateRow}
              onSelectAllRemaining={selectAllRemaining}
            />

            <ProcureSummaryNotes
              notes={notes}
              onNotesChange={setNotes}
              selectedRowsCount={selectedRows.length}
              totalUnits={selectedRows.reduce(
                (acc, r) => acc + Number(r.procure_qty),
                0
              )}
              estimatedTotal={estimatedTotal}
            />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={procureMutation.isPending || selectedRows.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-6 shadow-md shadow-blue-500/20 flex items-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {procureMutation.isPending
                ? "Generating PO..."
                : "Issue Purchase Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProcureItemsDialog;
