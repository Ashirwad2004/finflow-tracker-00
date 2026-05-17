import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { TrendingUp, Home, Utensils, Zap } from "lucide-react";

interface DashboardMockupProps {
  opacity: any;
  scale: any;
  mouseX: any;
  mouseY: any;
}

export const DashboardMockup = ({ opacity, scale, mouseX, mouseY }: DashboardMockupProps) => {
  return (
    <motion.div
      style={{
        opacity,
        scale,
        rotateX: mouseY,
        rotateY: mouseX,
        perspective: 1000
      }}
      className="relative max-w-6xl mx-auto transform-gpu"
    >
      <div className="rounded-2xl border border-white/20 bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden p-2 md:p-4 ring-1 ring-black/5 dark:ring-white/10">
        <div className="rounded-xl bg-background border shadow-inner overflow-hidden relative min-h-[400px] md:min-h-[600px] flex flex-col">
          {/* Fake Browser Bar */}
          <div className="h-10 bg-muted/50 border-b flex items-center px-4 gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
            </div>
            <div className="mx-auto w-1/3 h-5 bg-muted rounded-md opacity-50" />
          </div>

          <div className="flex-1 p-6 md:p-8 bg-slate-50/50 dark:bg-slate-950/50">
            {/* Mock Dashboard Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold">Good morning — your business at a glance</h2>
                <p className="text-muted-foreground">Here's what's happening with your store today.</p>
              </div>
              <div className="flex gap-3">
                <Button size="sm" variant="outline">Oct 24, 2025</Button>
                <Button size="sm" className="bg-primary text-white">Add Expense</Button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Revenue", val: "₹45,231.89", trend: "+20.1%", color: "text-green-600", bg: "bg-green-500/10" },
                { label: "Expenses", val: "₹12,056.00", trend: "+4.5%", color: "text-rose-600", bg: "bg-rose-500/10" },
                { label: "Net Profit", val: "₹33,175.89", trend: "+25.3%", color: "text-blue-600", bg: "bg-blue-500/10" },
                { label: "Pending Invoices", val: "4", trend: "Action Needed", color: "text-orange-600", bg: "bg-orange-500/10" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  className="p-5 bg-card rounded-xl border shadow-sm"
                >
                  <div className="text-sm text-muted-foreground font-medium mb-2">{stat.label}</div>
                  <div className="text-2xl font-bold mb-2">{stat.val}</div>
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full w-fit ${stat.bg} ${stat.color}`}>{stat.trend}</div>
                </motion.div>
              ))}
            </div>

            {/* Main Chart Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-64 md:h-80">
              <div className="lg:col-span-2 bg-card rounded-xl border shadow-sm p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold">Revenue Analytics</h3>
                  <div className="flex gap-2">
                    <div className="w-20 h-2 bg-primary rounded-full opacity-20" />
                    <div className="w-12 h-2 bg-primary rounded-full opacity-20" />
                  </div>
                </div>
                <div className="flex-1 flex items-end gap-2 px-2 pb-2">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      transition={{ duration: 1, delay: i * 0.05 }}
                      className="flex-1 bg-primary/80 rounded-t-sm hover:bg-primary transition-colors cursor-pointer relative group"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        ₹{h}k
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col gap-3 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Recent Activity</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    <span className="text-[10px] font-medium text-green-600">Live</span>
                  </div>
                </div>

                {/* Activity Items */}
                <div className="space-y-2.5">
                  {[
                    { icon: TrendingUp, label: "Revenue Received", sub: "Acme Corp · just now", amt: "+₹2,450", color: "bg-emerald-500/15 text-emerald-600", amtColor: "text-emerald-600", delay: 0 },
                    { icon: Home, label: "Office Rent", sub: "Monthly · 2 min ago", amt: "-₹1,200", color: "bg-blue-500/15 text-blue-600", amtColor: "text-rose-500", delay: 0.08 },
                    { icon: Utensils, label: "Team Lunch", sub: "Food · 47 min ago", amt: "-₹186", color: "bg-orange-500/15 text-orange-600", amtColor: "text-rose-500", delay: 0.16 },
                    { icon: Zap, label: "SaaS Subscription", sub: "Software · 3h ago", amt: "-₹99", color: "bg-violet-500/15 text-violet-600", amtColor: "text-rose-500", delay: 0.24 },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: item.delay }}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors group cursor-default"
                    >
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${item.color}`}>
                        <item.icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{item.label}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{item.sub}</div>
                      </div>
                      <div className={`text-xs font-bold flex-shrink-0 ${item.amtColor} tabular-nums`}>
                        {item.amt}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Footer sparkline */}
                <div className="pt-1 border-t border-border/50 flex items-end gap-0.5 h-8">
                  {[3,5,4,7,6,9,8,10,7,9,8,11].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                      style={{ height: `${h * 8}%`, transformOrigin: "bottom" }}
                      className="flex-1 bg-primary/30 rounded-sm hover:bg-primary/60 transition-colors"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
