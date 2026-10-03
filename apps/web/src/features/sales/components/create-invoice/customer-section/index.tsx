import { User, Search, Plus, Check, X, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PartyDialog } from "@/features/parties/components/PartyDialog";
import { CustomerSectionProps, CustomerPartyItem } from "./types";
import { useCustomerSectionState } from "./useCustomerSectionState";
import { CustomerAutocompleteDropdown } from "./CustomerAutocompleteDropdown";
import { CustomerTaxSupplyFields } from "./CustomerTaxSupplyFields";
import { CustomerContactFields } from "./CustomerContactFields";

export type { CustomerSectionProps, CustomerPartyItem };

export const CustomerSection = (props: CustomerSectionProps) => {
  const {
    customerName,
    customerPhone,
    customerEmail,
    customerGstin,
    placeOfSupply,
    onCustomerNameChange,
    onCustomerPhoneChange,
    onCustomerEmailChange,
    onCustomerGstinChange,
    onPlaceOfSupplyChange,
    error,
  } = props;

  const {
    isDropdownOpen,
    setIsDropdownOpen,
    highlightedIndex,
    setHighlightedIndex,
    isPartyDialogOpen,
    setIsPartyDialogOpen,
    isSavingParty,
    containerRef,
    inputRef,
    filteredParties,
    matchedParty,
    handleSelectParty,
    handleQuickAddParty,
    isValidGstin,
  } = useCustomerSectionState(props);

  return (
    <div className="bg-card text-card-foreground border border-border/80 rounded-xl p-4 shadow-xs space-y-4">
      {/* Header: Title + Quick Add Button */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Customer / Bill To Information
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Select an existing registered party or enter new customer details
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsPartyDialogOpen(true)}
          className="h-7 text-xs font-semibold gap-1.5 border-dashed hover:border-primary hover:text-primary transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Customer</span>
        </Button>
      </div>

      {/* Main Row: Searchable Customer Name Combobox + GSTIN + Place of Supply */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Customer Name (Combobox) */}
        <div ref={containerRef} className="md:col-span-6 relative">
          <Label className="text-xs font-semibold text-foreground flex items-center justify-between mb-1.5">
            <span>
              Customer Name <span className="text-destructive">*</span>
            </span>
            {matchedParty && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Registered Customer
              </span>
            )}
          </Label>

          <div className="relative flex items-center">
            <Input
              ref={inputRef}
              type="text"
              value={customerName}
              onChange={(e) => {
                onCustomerNameChange(e.target.value);
                if (!isDropdownOpen) setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Type customer name or select..."
              className={`h-9 text-xs pr-8 bg-background ${
                error ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            />
            {customerName ? (
              <button
                type="button"
                onClick={() => {
                  onCustomerNameChange("");
                  onCustomerGstinChange("");
                  onCustomerPhoneChange("");
                  onCustomerEmailChange("");
                  inputRef.current?.focus();
                }}
                className="absolute right-2.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search className="w-3.5 h-3.5 absolute right-2.5 text-muted-foreground pointer-events-none opacity-50" />
            )}
          </div>

          {error && (
            <p className="text-destructive text-[11px] mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {error}
            </p>
          )}

          {/* Autocomplete Dropdown Menu */}
          {isDropdownOpen && (
            <CustomerAutocompleteDropdown
              filteredParties={filteredParties}
              matchedParty={matchedParty}
              customerName={customerName}
              highlightedIndex={highlightedIndex}
              onMouseEnterIndex={setHighlightedIndex}
              onSelectParty={handleSelectParty}
              onOpenNewPartyDialog={() => {
                setIsDropdownOpen(false);
                setIsPartyDialogOpen(true);
              }}
            />
          )}
        </div>

        <CustomerTaxSupplyFields
          customerGstin={customerGstin}
          placeOfSupply={placeOfSupply}
          isValidGstin={isValidGstin}
          onCustomerGstinChange={onCustomerGstinChange}
          onPlaceOfSupplyChange={onPlaceOfSupplyChange}
        />
      </div>

      <CustomerContactFields
        customerPhone={customerPhone}
        customerEmail={customerEmail}
        onCustomerPhoneChange={onCustomerPhoneChange}
        onCustomerEmailChange={onCustomerEmailChange}
      />

      {/* Quick Party Creation Dialog Modal */}
      {isPartyDialogOpen && (
        <PartyDialog
          open={isPartyDialogOpen}
          onOpenChange={setIsPartyDialogOpen}
          onSave={handleQuickAddParty}
          isSaving={isSavingParty}
        />
      )}
    </div>
  );
};

export default CustomerSection;
