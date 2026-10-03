import React from "react";
import { QrCode, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MerchantUpiBannerProps {
  upiId: string;
  isEditingUpi: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  upiInputVal: string;
  onUpiInputChange: (val: string) => void;
  onSaveUpi: () => void;
}

export const MerchantUpiBanner: React.FC<MerchantUpiBannerProps> = ({
  upiId,
  isEditingUpi,
  onStartEdit,
  onCancelEdit,
  upiInputVal,
  onUpiInputChange,
  onSaveUpi,
}) => {
  return (
    <div className="bg-card border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <QrCode className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-foreground">
              Merchant UPI & Scan-to-Pay QR
            </h3>
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 text-primary border-primary/20 bg-primary/5"
            >
              Printed on Invoices
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {upiId ? (
              <span>
                Active UPI ID:{" "}
                <span className="font-mono font-bold text-foreground">
                  {upiId}
                </span>
              </span>
            ) : (
              "Add your business UPI ID to generate scan-and-pay Dynamic QR codes on customer tax invoices."
            )}
          </p>
        </div>
      </div>

      {isEditingUpi ? (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            value={upiInputVal}
            onChange={(e) => onUpiInputChange(e.target.value)}
            placeholder="e.g. storename@okaxis"
            className="h-8 text-xs font-mono w-full sm:w-60 rounded-lg"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveUpi();
              if (e.key === "Escape") onCancelEdit();
            }}
            autoFocus
          />
          <Button
            size="sm"
            onClick={onSaveUpi}
            className="h-8 text-xs px-3 rounded-lg"
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancelEdit}
            className="h-8 text-xs px-2 rounded-lg"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={onStartEdit}
          className="h-8 text-xs rounded-xl font-semibold gap-1.5 shrink-0"
        >
          <Edit2 className="w-3.5 h-3.5" />
          {upiId ? "Change UPI ID" : "Set UPI ID"}
        </Button>
      )}
    </div>
  );
};
