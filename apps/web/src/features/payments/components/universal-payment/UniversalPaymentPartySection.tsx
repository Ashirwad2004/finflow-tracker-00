import { UserCheck } from "lucide-react";

interface UniversalPaymentPartySectionProps {
  isReceipt: boolean;
  activeParty: any;
  partyBalance: number;
  selectedPartyId: string;
  eligibleParties: any[];
  formatCurrency: (amount: number) => string;
  onPartySelect: (partyId: string) => void;
}

export function UniversalPaymentPartySection({
  isReceipt,
  activeParty,
  partyBalance,
  selectedPartyId,
  eligibleParties,
  formatCurrency,
  onPartySelect,
}: UniversalPaymentPartySectionProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-primary" />
          Select {isReceipt ? "Customer" : "Vendor"}
        </label>
        {activeParty && (
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Current Outstanding:{" "}
            <strong
              className={
                partyBalance > 0
                  ? isReceipt
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600"
              }
            >
              {formatCurrency(partyBalance)} {partyBalance > 0 ? (isReceipt ? "Dr" : "Cr") : ""}
            </strong>
          </span>
        )}
      </div>

      <select
        value={selectedPartyId}
        onChange={(e) => onPartySelect(e.target.value)}
        className="w-full h-10 px-3 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
      >
        <option value="">
          -- Choose {isReceipt ? "Customer" : "Vendor"} ({eligibleParties.length} available) --
        </option>
        {eligibleParties.map((p: any) => (
          <option key={p.id} value={p.id}>
            {p.name} {p.phone ? `(${p.phone})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
