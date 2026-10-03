import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface POSUpiViewProps {
  upiUri: string;
  upiReference: string;
  onUpiReferenceChange: (val: string) => void;
  upiConfirmed: boolean;
  onUpiConfirmedChange: (val: boolean) => void;
}

export const POSUpiView: React.FC<POSUpiViewProps> = ({
  upiUri,
  upiReference,
  onUpiReferenceChange,
  upiConfirmed,
  onUpiConfirmedChange,
}) => {
  return (
    <div className="space-y-3 flex flex-col items-center text-center">
      {upiUri ? (
        <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-md inline-block">
          <QRCodeSVG value={upiUri} size={130} level="M" />
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          No store UPI ID configured. Go to Settings &gt; Bank Details to setup UPI.
        </div>
      )}

      <div className="w-full space-y-2 text-left">
        <div>
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Bank Reference / UTR Number (Optional)
          </Label>
          <Input
            type="text"
            placeholder="e.g. 12-digit UTR from phone or soundbox"
            value={upiReference}
            onChange={(e) => onUpiReferenceChange(e.target.value)}
            className="h-9 text-xs mt-1 bg-background border-border rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="upi-confirm-check"
            checked={upiConfirmed}
            onChange={(e) => onUpiConfirmedChange(e.target.checked)}
            className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
          />
          <label
            htmlFor="upi-confirm-check"
            className="text-xs font-medium text-foreground cursor-pointer select-none"
          >
            Payment received in store account (Soundbox verified)
          </label>
        </div>
      </div>
    </div>
  );
};
