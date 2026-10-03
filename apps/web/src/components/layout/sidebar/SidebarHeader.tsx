import { Logo } from "@/components/shared/Logo";
import { BRAND } from "@/core/constants/brand";
import { cn } from "@/core/lib/utils";

interface SidebarHeaderProps {
  collapsed: boolean;
  isBusinessMode: boolean;
  isSalesman: boolean;
  profile: any;
  isPaidSubscriber: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
}

export const SidebarHeader = ({
  collapsed,
  isBusinessMode,
  isSalesman,
  profile,
  isPaidSubscriber,
  isTrialActive,
  trialDaysLeft,
}: SidebarHeaderProps) => {
  return (
    <div className="flex flex-col gap-2.5 p-4 border-b">
      <div className="flex items-center">
        {collapsed ? (
          <div className="mx-auto">
            <Logo size={40} showText={false} />
          </div>
        ) : (
          <Logo size={36} showText={true} />
        )}
      </div>
      {!collapsed && (
        <div className="mt-1 px-2.5 py-1.5 bg-muted/40 rounded-xl border border-border/40 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {isBusinessMode ? BRAND.businessLabel : BRAND.name}
            </p>
            <p className="text-xs font-semibold text-foreground truncate mt-0.5">
              {isSalesman
                ? "Salesman Session"
                : profile?.display_name ?? profile?.business_name ?? "Welcome"}
            </p>
          </div>
          {!isSalesman && (
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                isPaidSubscriber
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : isTrialActive
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              )}
            >
              {isPaidSubscriber ? "PRO" : isTrialActive ? `${trialDaysLeft}d Trial` : "Expired"}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
