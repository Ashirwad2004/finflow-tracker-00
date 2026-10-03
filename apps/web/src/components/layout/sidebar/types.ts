import { LucideIcon } from "lucide-react";

export interface SidebarSubmenuItem {
  title: string;
  path: string;
  icon?: LucideIcon;
  badge?: string;
}

export interface SidebarMenuItem {
  title: string;
  path: string;
  icon: LucideIcon;
  description: string;
  badge?: string;
  children?: SidebarSubmenuItem[];
}

export interface AppSidebarProps {
  onNavigate?: () => void;
}
