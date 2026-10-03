import React from "react";
import {
  Wallet,
  HandCoins,
  Users,
  Package,
  Receipt,
  ShoppingBag,
  AlertCircle,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/core/lib/utils";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { DeletedItem } from "../types";

interface DeletedItemRowProps {
  item: DeletedItem;
  currencyCode?: string;
  isSelected: boolean;
  isRestoring: boolean;
  onToggle: () => void;
  onRestore: () => void;
}

export const DeletedItemRow = ({
  item,
  isSelected,
  isRestoring,
  onToggle,
  onRestore,
}: DeletedItemRowProps) => {
  const { formatCurrency } = useCurrency();

  const getMetadata = (item: DeletedItem) => {
    switch (item.type) {
      case "expense":
        return {
          title: item.description,
          subtitle: `Expense • ${new Date(item.date).toLocaleDateString()}`,
          amount: item.amount,
          icon: <Wallet className="w-4 h-4" />,
          color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        };
      case "lent_money":
        return {
          title: item.person_name,
          subtitle: `Lent • ${item.description || "No desc"}`,
          amount: item.amount,
          icon: <HandCoins className="w-4 h-4" />,
          color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        };
      case "borrowed_money":
        return {
          title: item.person_name,
          subtitle: `Borrowed • ${item.description || "No desc"}`,
          amount: item.amount,
          icon: <HandCoins className="w-4 h-4" />,
          color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        };
      case "group":
        return {
          title: item.name,
          subtitle: "Group",
          amount: null,
          icon: <Users className="w-4 h-4" />,
          color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        };
      case "party":
        return {
          title: item.name,
          subtitle: `Party • ${item.party_type || "No details"}`,
          amount: null,
          icon: <Users className="w-4 h-4" />,
          color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
        };
      case "product":
        return {
          title: item.name,
          subtitle: `Product • Qty: ${item.stock_quantity} ${item.unit || "pc"}`,
          amount: item.price,
          icon: <Package className="w-4 h-4" />,
          color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
        };
      case "sale":
        return {
          title: `Invoice ${item.invoice_number}`,
          subtitle: `Sale • ${item.customer_name}`,
          amount: item.total_amount,
          icon: <Receipt className="w-4 h-4" />,
          color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        };
      case "purchase":
        return {
          title: `Bill ${item.bill_number || "N/A"}`,
          subtitle: `Purchase • ${item.vendor_name || "Vendor"}`,
          amount: item.total_amount,
          icon: <ShoppingBag className="w-4 h-4" />,
          color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        };
      default:
        return { title: "Item", subtitle: "", amount: 0, icon: <AlertCircle />, color: "bg-gray-100" };
    }
  };

  const { title, subtitle, amount, icon, color } = getMetadata(item);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
        isSelected
          ? "bg-primary/5 border-primary/50 shadow-sm"
          : "hover:bg-muted/60 bg-card border-border/60"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="mt-0.5"
        aria-label={`Select ${title}`}
      />

      <div className={cn("w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-md", color)}>
        {item.type === "expense" && item.categories?.icon ? (
          <CategoryIcon
            name={item.categories.icon}
            className="w-4 h-4"
            color={item.categories.color}
          />
        ) : (
          icon
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="font-medium text-sm truncate leading-tight">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4 capitalize font-normal tracking-wide"
          >
            {item.type.replace("_", " ")}
          </Badge>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline-block">
            {subtitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {amount !== null && (
          <div className="text-sm font-semibold whitespace-nowrap tabular-nums">
            {formatCurrency(amount)}
          </div>
        )}

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRestore();
          }}
          disabled={isRestoring}
          aria-label={`Restore ${title}`}
        >
          {isRestoring ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
