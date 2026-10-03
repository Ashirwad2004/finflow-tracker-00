import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarCollapseToggleProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const SidebarCollapseToggle = ({ collapsed, onToggle }: SidebarCollapseToggleProps) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className="hidden md:flex absolute -right-3 top-6 z-50 h-6 w-6 rounded-full border bg-background shadow-md"
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
    </Button>
  );
};
