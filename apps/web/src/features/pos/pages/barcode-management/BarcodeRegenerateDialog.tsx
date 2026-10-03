import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";
import { POSProduct } from "../../types";

interface BarcodeRegenerateDialogProps {
  product: POSProduct | null;
  onClose: () => void;
  onConfirm: (product: POSProduct) => void;
}

export const BarcodeRegenerateDialog: React.FC<BarcodeRegenerateDialogProps> = ({
  product,
  onClose,
  onConfirm,
}) => {
  return (
    <AlertDialog open={Boolean(product)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <AlertDialogContent className="bg-card border-border text-foreground rounded-2xl shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground flex items-center gap-2 text-lg font-bold">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            Regenerate Barcode?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-sm">
            Regenerating will replace the existing barcode{" "}
            <strong className="text-foreground font-mono">{product?.barcode}</strong> for{" "}
            <strong className="text-foreground">{product?.name}</strong>. Any previously printed physical
            sticker labels will no longer match this product in POS.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border text-foreground hover:bg-muted font-medium">
            Keep Existing
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (product) {
                onConfirm(product);
                onClose();
              }
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            Confirm & Generate New
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
