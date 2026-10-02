import { Activity, ShoppingBag, BarChart3, MapPin } from "lucide-react";

interface StoreMetricsCardsProps {
  filteredSales: number;
  filteredOrdersCount: number;
  avgOrderValue: number;
  filteredDeliveryFee: number;
  formatCurrency: (amount: number) => string;
}

export function StoreMetricsCards({
  filteredSales,
  filteredOrdersCount,
  avgOrderValue,
  filteredDeliveryFee,
  formatCurrency,
}: StoreMetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col justify-between transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue</span>
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
        </div>
        <span className="text-2xl font-black text-foreground">{formatCurrency(filteredSales)}</span>
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col justify-between transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Orders</span>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
        </div>
        <span className="text-2xl font-black text-foreground">{filteredOrdersCount}</span>
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col justify-between transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg. Order Value</span>
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-violet-600" />
          </div>
        </div>
        <span className="text-2xl font-black text-foreground">{formatCurrency(avgOrderValue)}</span>
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col justify-between transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery Fees</span>
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-amber-600" />
          </div>
        </div>
        <span className="text-2xl font-black text-foreground">{formatCurrency(filteredDeliveryFee)}</span>
      </div>
    </div>
  );
}
