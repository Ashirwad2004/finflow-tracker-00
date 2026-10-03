import { Switch } from "@/components/ui/switch";
import { cn } from "@/core/lib/utils";

interface SidebarModeToggleProps {
  collapsed: boolean;
  isSalesman: boolean;
  isBusinessMode: boolean;
  onModeToggle: (checked: boolean) => void;
}

export const SidebarModeToggle = ({
  collapsed,
  isSalesman,
  isBusinessMode,
  onModeToggle,
}: SidebarModeToggleProps) => {
  return (
    <div
      className={cn(
        "px-4 py-3 border-b flex items-center transition-all duration-200",
        collapsed ? "justify-center" : "justify-between"
      )}
    >
      {isSalesman ? (
        <>
          {!collapsed && (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
              Salesman Session
            </span>
          )}
          <Switch checked={true} disabled={true} title="Salesman forced Business Mode" />
        </>
      ) : (
        <>
          {!collapsed && <span className="text-sm font-medium">Business Mode</span>}
          <Switch
            checked={isBusinessMode}
            onCheckedChange={onModeToggle}
            title={isBusinessMode ? "Switch to Personal Mode" : "Switch to Business Mode"}
          />
        </>
      )}
    </div>
  );
};
