import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface CustomerTaxSupplyFieldsProps {
  customerGstin: string;
  placeOfSupply: string;
  isValidGstin: (gst: string) => boolean;
  onCustomerGstinChange: (val: string) => void;
  onPlaceOfSupplyChange: (val: string) => void;
}

export function CustomerTaxSupplyFields({
  customerGstin,
  placeOfSupply,
  isValidGstin,
  onCustomerGstinChange,
  onPlaceOfSupplyChange,
}: CustomerTaxSupplyFieldsProps) {
  return (
    <>
      {/* Customer GSTIN */}
      <div className="md:col-span-4">
        <Label className="text-xs font-semibold text-foreground flex items-center justify-between mb-1.5">
          <span>GSTIN (B2B Tax Invoice)</span>
          {customerGstin.trim() && (
            <span
              className={`text-[10px] font-bold ${
                isValidGstin(customerGstin)
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-500"
              }`}
            >
              {isValidGstin(customerGstin) ? "✓ Valid GSTIN" : "15 chars required"}
            </span>
          )}
        </Label>
        <Input
          type="text"
          value={customerGstin}
          maxLength={15}
          onChange={(e) => {
            const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
            onCustomerGstinChange(val);
            if (val.length >= 2 && !placeOfSupply) {
              onPlaceOfSupplyChange(val.substring(0, 2));
            }
          }}
          placeholder="e.g. 29ABCDE1234F1Z5 (optional)"
          className="h-9 text-xs font-mono uppercase bg-background"
        />
      </div>

      {/* Place of Supply */}
      <div className="md:col-span-2">
        <Label className="text-xs font-semibold text-foreground mb-1.5 block">
          Place of Supply
        </Label>
        <Input
          type="text"
          value={placeOfSupply}
          maxLength={2}
          onChange={(e) => onPlaceOfSupplyChange(e.target.value.toUpperCase())}
          placeholder="State Code (e.g. 27)"
          className="h-9 text-xs font-mono uppercase bg-background"
        />
      </div>
    </>
  );
}
