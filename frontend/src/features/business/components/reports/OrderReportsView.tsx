import React, { useState } from "react";
import { useAccountingData } from "../../hooks/useAccountingData";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Truck, ClipboardList } from "lucide-react";
import { SalesOrderRegister } from "../orders/SalesOrderRegister";
import { PurchaseOrderRegister } from "../orders/PurchaseOrderRegister";
import { useAuth } from "@/core/lib/auth";

export const OrderReportsView: React.FC<{ accounting: ReturnType<typeof useAccountingData> }> = ({
  accounting,
}) => {
  const { user } = useAuth();
  const userId = user?.id || "";
  const [activeTab, setActiveTab] = useState<"sales_orders" | "purchase_orders">("sales_orders");
  const { allParties, allProducts } = accounting;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Selector Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "sales_orders" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("sales_orders")}
            className="text-xs h-8 gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Sales Orders Register
          </Button>
          <Button
            variant={activeTab === "purchase_orders" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("purchase_orders")}
            className="text-xs h-8 gap-1.5"
          >
            <Truck className="w-3.5 h-3.5" />
            Purchase Orders Register
          </Button>
        </div>
      </div>

      {activeTab === "sales_orders" && (
        <SalesOrderRegister userId={userId} parties={allParties} products={allProducts} />
      )}

      {activeTab === "purchase_orders" && (
        <PurchaseOrderRegister userId={userId} parties={allParties} products={allProducts} />
      )}
    </div>
  );
};
