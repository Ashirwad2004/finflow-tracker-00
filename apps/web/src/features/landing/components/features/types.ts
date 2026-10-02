import { LucideIcon } from "lucide-react";

export type FeatureTabId = "billing" | "inventory" | "khata" | "daybook" | "reports";

export interface TabItem {
  id: FeatureTabId;
  icon: LucideIcon;
  title: string;
  badge: string;
  desc: string;
}
