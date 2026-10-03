import { QrCode } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UpiPaymentQrCardProps {
  printUpiQr: boolean;
  onTogglePrintUpi: (checked: boolean) => void;
  upiIdInput: string;
  setUpiIdInput: (id: string) => void;
  onSaveUpiId: (id: string) => void;
}

export function UpiPaymentQrCard({
  printUpiQr,
  onTogglePrintUpi,
  upiIdInput,
  setUpiIdInput,
  onSaveUpiId,
}: UpiPaymentQrCardProps) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <QrCode className="w-3.5 h-3.5 text-primary" />
          5. UPI Payment QR Code
        </h2>
        <Switch checked={printUpiQr} onCheckedChange={onTogglePrintUpi} />
      </div>

      {printUpiQr ? (
        <div className="space-y-2.5 animate-fade-in">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground block">
              Merchant UPI ID / VPA
            </label>
            <div className="flex gap-1.5">
              <Input
                value={upiIdInput}
                onChange={(e) => setUpiIdInput(e.target.value)}
                onBlur={(e) => onSaveUpiId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSaveUpiId(upiIdInput);
                  }
                }}
                placeholder="e.g. yourshop@upi, 9876543210@paytm"
                className="h-8 text-xs font-mono"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onSaveUpiId(upiIdInput)}
                className="h-8 text-xs px-2.5 shrink-0"
              >
                Save
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground">
              Dynamic QR code encodes invoice balance due. Customers can scan using Google Pay, PhonePe,
              Paytm, or BHIM.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground italic">
          UPI QR code will not be printed on downloaded or printed invoices.
        </p>
      )}
    </div>
  );
}
