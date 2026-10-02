import { FileCheck } from "lucide-react";

interface TermsConditionsCardProps {
  customTerms: string;
  onTermsChange: (text: string) => void;
}

export function TermsConditionsCard({ customTerms, onTermsChange }: TermsConditionsCardProps) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
      <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2">
        <FileCheck className="w-3.5 h-3.5 text-primary" />
        8. Terms & Conditions
      </h2>
      <textarea
        value={customTerms}
        onChange={(e) => onTermsChange(e.target.value)}
        placeholder="Type custom payment terms or legal declaration here..."
        className="w-full text-xs p-2 rounded-lg border border-input bg-background min-h-[50px] max-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all resize-none"
      />
    </div>
  );
}
