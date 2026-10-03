import {
  LayoutDashboard,
  ReceiptIndianRupee,
  Users,
  HandCoins,
  Clock,
  Settings,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Package,
  FileBarChart,
  Printer,
  Globe,
  Sparkles,
  Landmark,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  ShoppingBag,
  Store,
  Barcode,
} from "lucide-react";
import { SidebarMenuItem } from "./types";

export const personalMenuItems: SidebarMenuItem[] = [
  {
    title: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    description: "Overview & stats",
  },
  {
    title: "All Expenses",
    path: "/expenses",
    icon: ReceiptIndianRupee,
    description: "View all transactions",
  },
  {
    title: "Groups",
    path: "/groups",
    icon: Users,
    description: "Shared expenses",
  },
  {
    title: "Lent Money",
    path: "/lent-money",
    icon: HandCoins,
    description: "Track loans",
  },
  {
    title: "Borrowed Money",
    path: "/borrowed-money",
    icon: HandCoins,
    description: "Track debts",
  },
  {
    title: "Reports",
    path: "/personal-reports",
    icon: FileBarChart,
    description: "Analytics & summaries",
  },
  {
    title: "Recently Deleted",
    path: "/recently-deleted",
    icon: Clock,
    description: "Recover expenses",
  },
  {
    title: "Settings",
    path: "/settings",
    icon: Settings,
    description: "Preferences",
  },
];

export const menuItems = personalMenuItems;

export const businessMenuItems: SidebarMenuItem[] = [
  {
    title: "Dashboard",
    path: "/business-dashboard",
    icon: BarChart3,
    description: "Business Analytics",
  },
  {
    title: "Retail POS",
    path: "/pos",
    icon: Store,
    description: "Counter Billing & Barcode",
    badge: "New",
  },
  {
    title: "Sales & Invoices",
    path: "/sales",
    icon: TrendingUp,
    description: "Invoices & Receipts",
    children: [
      {
        title: "Sales",
        path: "/sales",
        icon: FileText,
      },
      {
        title: "Payment In",
        path: "/sales?tab=payment-in",
        icon: ArrowDownLeft,
      },
      {
        title: "Sales Order",
        path: "/sales?tab=sales-order",
        icon: ShoppingBag,
      },
    ],
  },
  {
    title: "Inventory",
    path: "/inventory",
    icon: Package,
    description: "Manage Products",
    children: [
      {
        title: "Products & Stock",
        path: "/inventory",
        icon: Package,
      },
      {
        title: "Barcode Management",
        path: "/inventory/barcodes",
        icon: Barcode,
      },
    ],
  },
  {
    title: "Purchases",
    path: "/purchases",
    icon: ShoppingCart,
    description: "Bills & Payments",
    children: [
      {
        title: "Purchases",
        path: "/purchases",
        icon: FileText,
      },
      {
        title: "Payment Out",
        path: "/purchases?tab=payment-out",
        icon: ArrowUpRight,
      },
      {
        title: "Purchase Order",
        path: "/purchases?tab=purchase-order",
        icon: ShoppingBag,
      },
    ],
  },
  {
    title: "Parties",
    path: "/parties",
    icon: Users,
    description: "Customers & Vendors",
  },
  {
    title: "Print Studio",
    path: "/print-studio",
    icon: Printer,
    description: "Invoice Designs",
  },
  {
    title: "Reports",
    path: "/reports",
    icon: FileBarChart,
    description: "Financial & Tax Reports",
  },
  {
    title: "Online Store",
    path: "/online-store",
    icon: Globe,
    description: "Manage storefront",
  },
  {
    title: "All Expenses",
    path: "/expenses",
    icon: ReceiptIndianRupee,
    description: "Other Expenses",
  },
  {
    title: "Settings",
    path: "/settings",
    icon: Settings,
    description: "Preferences",
  },
  {
    title: "Banking & Treasury",
    path: "/bank-details",
    icon: Landmark,
    description: "Accounts, Passbook & BRS",
  },
  {
    title: "Loyalty & Campaigns",
    path: "/loyalty",
    icon: Sparkles,
    description: "Reward & Marketing Hub",
  },
  {
    title: "Recycle Bin",
    path: "/recently-deleted",
    icon: Trash2,
    description: "Recover deleted items",
  },
];

// Lazy route chunk preloaders for instantaneous 0ms client-side transitions
const routePreloaders: Record<string, () => Promise<any>> = {
  "/sales": () => import("@/features/sales/pages/SalesPage"),
  "/purchases": () => import("@/features/purchases/pages/PurchasesPage"),
  "/business-dashboard": () => import("@/features/dashboard/BusinessDashboard"),
  "/inventory": () => import("@/features/inventory/pages/InventoryPage"),
  "/inventory/barcodes": () => import("@/features/pos/pages/BarcodeManagement"),
  "/parties": () => import("@/features/parties/pages/PartiesPage"),
  "/pos": () => import("@/features/pos/pages/POSPage"),
  "/print-studio": () => import("@/features/print-studio/pages/PrintStudioPage"),
  "/reports": () => import("@/features/reports/pages/ReportsPage"),
  "/online-store": () => import("@/features/storefront/pages/OnlineStorePage"),
  "/bank-details": () => import("@/features/banking/pages/BankDetails"),
  "/loyalty": () => import("@/features/loyalty/pages/LoyaltyCampaignsPage"),
  "/expenses": () => import("@/features/expenses/pages/AllExpenses"),
  "/groups": () => import("@/features/groups/Groups"),
  "/lent-money": () => import("@/features/loans/pages/LentMoney"),
  "/borrowed-money": () => import("@/features/loans/pages/BorrowedMoney"),
  "/personal-reports": () => import("@/features/reports/pages/PersonalReports"),
  "/recently-deleted": () => import("@/features/trash/pages/RecentlyDeletedPage"),
  "/settings": () => import("@/features/settings/pages/Settings"),
};

export const prefetchRoute = (path: string) => {
  const cleanPath = path.split("?")[0];
  const loader = routePreloaders[cleanPath];
  if (loader) {
    loader().catch(() => {});
  }
};
