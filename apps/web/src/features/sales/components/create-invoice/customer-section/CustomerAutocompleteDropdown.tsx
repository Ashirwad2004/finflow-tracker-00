import { cn } from "@/core/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Check, Plus } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { CustomerPartyItem } from "./types";

interface CustomerAutocompleteDropdownProps {
  filteredParties: CustomerPartyItem[];
  matchedParty?: CustomerPartyItem;
  customerName: string;
  highlightedIndex: number;
  onMouseEnterIndex: (idx: number) => void;
  onSelectParty: (party: CustomerPartyItem) => void;
  onOpenNewPartyDialog: () => void;
}

export function CustomerAutocompleteDropdown({
  filteredParties,
  matchedParty,
  customerName,
  highlightedIndex,
  onMouseEnterIndex,
  onSelectParty,
  onOpenNewPartyDialog,
}: CustomerAutocompleteDropdownProps) {
  const { formatCurrency } = useCurrency();

  return (
    <div className="absolute z-50 left-0 top-[calc(100%+4px)] w-full bg-popover text-popover-foreground border border-border/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
      <div className="px-3 py-1.5 bg-muted/70 border-b border-border/60 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        <span>Existing Parties ({filteredParties.length})</span>
        <span className="text-[9px] font-normal text-muted-foreground lowercase">
          click to auto-fill
        </span>
      </div>

      <div className="max-h-56 overflow-y-auto divide-y divide-border/50">
        {filteredParties.length > 0 ? (
          filteredParties.map((party, idx) => {
            const isSelected = matchedParty?.id === party.id;
            const isHighlighted = highlightedIndex === idx;
            const partyGst = party.gst_number || party.gstin;

            return (
              <div
                key={party.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelectParty(party);
                }}
                onMouseEnter={() => onMouseEnterIndex(idx)}
                className={`px-3 py-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                  isHighlighted
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-muted/60"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-foreground flex items-center gap-1.5 truncate">
                      <span>{party.name}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      {party.phone && <span>📞 {party.phone}</span>}
                      {partyGst && <span>• GSTIN: {partyGst}</span>}
                      {party.address && <span>• {party.address}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-1">
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 h-4 border uppercase tracking-wider font-semibold"
                  >
                    {party.type || "customer"}
                  </Badge>
                  {party.opening_balance ? (
                    <span
                      className={cn(
                        "text-[10px] font-bold font-mono",
                        party.opening_balance_type === "to_receive"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {party.opening_balance_type === "to_receive" ? "+" : "-"}
                      {formatCurrency(party.opening_balance)}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">
              No registered customer found matching "{customerName}"
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              You can continue typing to save an unregistered walk-in customer,
              or click below to register.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Quick Create Action */}
      <div className="p-2 bg-muted/40 border-t border-border/60">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenNewPartyDialog}
          className="w-full h-8 text-xs font-semibold justify-center gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add "{customerName.trim() || "New Customer"}" to Customers</span>
        </Button>
      </div>
    </div>
  );
}
