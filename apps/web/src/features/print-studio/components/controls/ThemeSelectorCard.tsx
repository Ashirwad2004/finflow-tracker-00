import { LayoutTemplate } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/core/lib/utils";
import { InvoiceTheme, invoiceThemes, themeMeta } from "../../types";

interface ThemeSelectorCardProps {
  selectedTheme: InvoiceTheme;
  onThemeSelect: (theme: InvoiceTheme) => void;
}

export function ThemeSelectorCard({ selectedTheme, onThemeSelect }: ThemeSelectorCardProps) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
      <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2">
        <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
        1. Choose Template
      </h2>
      <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
        {invoiceThemes.map((theme) => {
          const meta = themeMeta[theme];
          const isSelected = selectedTheme === theme;
          return (
            <button
              key={theme}
              onClick={() => onThemeSelect(theme)}
              className={cn(
                "w-full text-left p-2.5 rounded-xl border-2 transition-all flex items-start gap-2.5",
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/15"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <div className={cn("w-5 h-5 rounded-md flex-shrink-0 mt-0.5 shadow-sm", meta.color)} />
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  {meta.name}
                  {isSelected && <Badge className="text-[8px] px-1 bg-primary text-white h-3.5">Default</Badge>}
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1 leading-tight">{meta.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
