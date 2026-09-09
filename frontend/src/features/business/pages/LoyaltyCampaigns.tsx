import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Gift,
  MessageSquare,
  Send,
  Users,
  Settings2,
  TrendingUp,
  Coins,
  Search,
  Award,
  PlusCircle,
  MinusCircle,
  Filter,
  Check,
  ChevronRight,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Interfaces
interface Party {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}

interface Sale {
  id: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  date: string;
}

interface LoyaltyConfig {
  enabled: boolean;
  pointsPerUnit: number; // e.g. 1 point per 100 currency units spent
  pointValue: number;    // e.g. 1 point = ₹1 discount
  vipThreshold: number;  // e.g. ₹5,000 spent for VIP tier
}

export default function LoyaltyCampaigns() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overview" | "ledger" | "campaigns" | "settings">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<"all" | "slipping" | "vip" | "new">("all");
  
  // Loyalty Point Manual Adjustment Dialog State
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; currentPoints: number } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<"add" | "deduct">("add");

  // WhatsApp Campaign Template Selection
  const [selectedTemplate, setSelectedTemplate] = useState<number>(0);
  const [customPromoCode, setCustomPromoCode] = useState("RUPEEBILL10");

  // Load configuration from local storage or defaults
  const [config, setConfig] = useState<LoyaltyConfig>(() => {
    const saved = localStorage.getItem(`loyalty_config_${user?.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      enabled: true,
      pointsPerUnit: 100, // 1 point per ₹100
      pointValue: 1,      // 1 point = ₹1
      vipThreshold: 5000  // ₹5k for VIP
    };
  });

  // Save configuration
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`loyalty_config_${user?.id}`, JSON.stringify(config));
    }
  }, [config, user?.id]);

  // Load manual points adjustments from local storage to persist offline
  const [pointsAdjustments, setPointsAdjustments] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`loyalty_points_adjustments_${user?.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {};
  });

  // Save adjustments
  const saveAdjustments = (newAdjustments: Record<string, number>) => {
    setPointsAdjustments(newAdjustments);
    if (user?.id) {
      localStorage.setItem(`loyalty_points_adjustments_${user?.id}`, JSON.stringify(newAdjustments));
    }
  };

  // Queries
  const { data: parties = [], isLoading: loadingParties } = useQuery({
    queryKey: ["parties", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("parties")
        .select("*")
        .eq("user_id", user?.id || "");
      if (error) throw error;
      return data as Party[];
    },
    enabled: !!user
  });

  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["sales", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales")
        .select("id, customer_name, customer_phone, total_amount, date")
        .eq("user_id", user?.id || "");
      if (error) throw error;
      return data as Sale[];
    },
    enabled: !!user
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id || "")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Filter parties to find customers
  const customers = parties.filter(p => p.type === "customer" || p.type === "both");

  // Calculate customer financial & loyalty metrics
  const customerLoyaltyData = customers.map(customer => {
    // Find all sales matching this customer by name or phone
    const matches = sales.filter(s => 
      s.customer_name?.toLowerCase() === customer.name.toLowerCase() ||
      (customer.phone && s.customer_phone === customer.phone)
    );

    const totalSpent = matches.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const visitCount = matches.length;

    // Earning calculation
    let calculatedPoints = 0;
    if (config.enabled && config.pointsPerUnit > 0) {
      calculatedPoints = Math.floor(totalSpent / config.pointsPerUnit);
    }

    // Apply manual adjustment overrides
    const adjustment = pointsAdjustments[customer.id] || 0;
    const finalPoints = Math.max(0, calculatedPoints + adjustment);

    // Get last purchase date
    let lastPurchaseDate: Date | null = null;
    if (matches.length > 0) {
      const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      lastPurchaseDate = new Date(sorted[0].date);
    }

    // Determine tier
    let tier: "Bronze" | "Silver" | "Gold" = "Bronze";
    if (totalSpent >= config.vipThreshold) {
      tier = "Gold";
    } else if (totalSpent >= config.vipThreshold / 2) {
      tier = "Silver";
    }

    return {
      ...customer,
      totalSpent,
      visitCount,
      points: finalPoints,
      lastPurchaseDate,
      tier
    };
  });

  // Analytics Aggregation
  const totalPointsIssued = customerLoyaltyData.reduce((sum, c) => sum + c.points, 0);
  const totalCustomerSpend = customerLoyaltyData.reduce((sum, c) => sum + c.totalSpent, 0);
  const vipCount = customerLoyaltyData.filter(c => c.tier === "Gold").length;
  const returningCustomerRate = customerLoyaltyData.length > 0 
    ? ((customerLoyaltyData.filter(c => c.visitCount > 1).length / customerLoyaltyData.length) * 100).toFixed(1)
    : "0.0";

  // Segment Filtering logic
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const filteredCustomers = customerLoyaltyData.filter(c => {
    // Search filter
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.phone && c.phone.includes(searchTerm));

    if (!matchesSearch) return false;

    // Segment filter
    if (selectedSegment === "vip") {
      return c.tier === "Gold";
    }
    if (selectedSegment === "slipping") {
      // Inactive > 30 days or never purchased but created > 30 days ago
      if (c.lastPurchaseDate) {
        return c.lastPurchaseDate < thirtyDaysAgo;
      }
      return new Date(c.created_at) < thirtyDaysAgo;
    }
    if (selectedSegment === "new") {
      return new Date(c.created_at) >= sevenDaysAgo;
    }
    return true;
  });

  // Handle Adjustment Submit
  const handleApplyAdjustment = () => {
    if (!selectedCustomer || adjustAmount <= 0) return;

    const amount = adjustType === "add" ? adjustAmount : -adjustAmount;
    const newAdjustments = {
      ...pointsAdjustments,
      [selectedCustomer.id]: (pointsAdjustments[selectedCustomer.id] || 0) + amount
    };
    
    saveAdjustments(newAdjustments);
    toast.success(`Successfully adjusted points for ${selectedCustomer.name}`);
    setAdjustmentDialogOpen(false);
    setSelectedCustomer(null);
    setAdjustAmount(0);
  };

  // WhatsApp Campaign Templates
  const storeLink = profile?.business_name 
    ? `${window.location.origin}/store/${profile.business_name.toLowerCase().replace(/\s+/g, "-")}`
    : `${window.location.origin}/storefront`;

  const campaignTemplates = [
    {
      title: "🎁 Reward Point Balance Reminder",
      getBody: (name: string, points: number, value: number) => 
        `Hey ${name}! You have accumulated ${points} reward points (valued at ${formatCurrency(value)}) in your RupeeBill loyalty wallet at ${profile?.business_name || 'our shop'}. 🌟 Redeem them on your next visit or check our storefront: ${storeLink}`
    },
    {
      title: "🔥 'We Miss You' Retention Offer",
      getBody: (name: string) => 
        `Hello ${name}! We haven't seen you in a while at ${profile?.business_name || 'our shop'}. We miss you! Enjoy 10% off your next purchase using promo code *${customPromoCode}*. Browse our catalog online: ${storeLink}`
    },
    {
      title: "👑 Exclusive VIP Reward Invite",
      getBody: (name: string, points: number, value: number) => 
        `Dear ${name}, as one of our valued VIP Gold members at ${profile?.business_name || 'our shop'}, enjoy early access to our premium items! You have ${points} points (${formatCurrency(value)}) ready to redeem. Order here: ${storeLink}`
    }
  ];

  const handleSendWhatsApp = (customerName: string, phone: string, points: number) => {
    if (!phone) {
      toast.error("This customer doesn't have a phone number configured.");
      return;
    }

    const value = points * config.pointValue;
    const message = campaignTemplates[selectedTemplate].getBody(customerName, points, value);
    
    // Clean up phone number (remove spaces, symbols)
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    // If phone doesn't have country code, prepend "91" (assuming India by default, or let it slide)
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    toast.success(`WhatsApp compose opened for ${customerName}`);
  };

  return (
    <AppLayout>
      <div className="px-4 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto animate-fade-in font-display">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-primary font-semibold text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-violet-500 fill-violet-500/20" /> Loyalty & Retention Hub
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Customer Campaigns</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Increase customer repeat visits with loyalty reward points and WhatsApp marketing.</p>
          </div>
          
          {/* Tabs Navigation */}
          <div className="flex items-center p-1 bg-white border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            {(["overview", "ledger", "campaigns", "settings"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                  activeTab === tab
                    ? "bg-primary text-white shadow"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200"
                }`}
              >
                {tab === "ledger" ? "Rewards Ledger" : tab}
              </button>
            ))}
          </div>
        </div>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Metric Indicator Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 rounded-lg">
                    <Coins className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">Point Pool</Badge>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Points Issued</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{totalPointsIssued.toLocaleString()} pts</h3>
                <p className="text-xs text-slate-400 mt-1.5">Active currency circulating in rewards wallet</p>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <Gift className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Liability</Badge>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Redeemable Discount</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(totalPointsIssued * config.pointValue)}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5">Based on point value rate of {formatCurrency(config.pointValue)}/pt</p>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Retention</Badge>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Returning Customer Rate</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{returningCustomerRate}%</h3>
                <p className="text-xs text-slate-400 mt-1.5">Customers with more than 1 transaction</p>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border rounded-xl shadow-sm border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg">
                    <Award className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Tiers</Badge>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">VIP Gold Customers</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{vipCount}</h3>
                <p className="text-xs text-slate-400 mt-1.5">Spent more than {formatCurrency(config.vipThreshold)}</p>
              </div>
            </div>

            {/* Loyalty Quick Walkthrough */}
            <div className="bg-gradient-to-r from-primary/10 to-violet-500/10 p-6 rounded-2xl border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1.5">
                <h4 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary fill-primary/20" /> How RupeeBill Rewards Boost Your Business
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  Loyalty rewards incentive customers to select your counter over competitors. Earning 1 point per {formatCurrency(config.pointsPerUnit)} creates a gamified return habit. Combined with WhatsApp campaigns, you can proactively re-engage idle customer profiles.
                </p>
              </div>
              <Button onClick={() => setActiveTab("campaigns")} className="rounded-full shadow-lg h-9 px-4 text-sm hover:scale-105 transition-all">
                Launch WhatsApp Campaign <ChevronRight className="ml-1 w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Top Customer Loyalty Standings */}
            <div className="bg-white dark:bg-slate-900 border rounded-xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h4 className="text-sm font-semibold">Top Customer Loyalty Wallets</h4>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveTab("ledger")}>Manage All</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-xs font-semibold uppercase tracking-wide bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Reward Tier</th>
                      <th className="px-4 py-3">Points Balance</th>
                      <th className="px-4 py-3 text-right">Total Business Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {customerLoyaltyData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">Add customers in "Parties" to track loyalty!</td>
                      </tr>
                    ) : (
                      customerLoyaltyData
                        .sort((a, b) => b.points - a.points)
                        .slice(0, 5)
                        .map(c => (
                          <tr key={c.id}>
                            <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                            <td className="px-4 py-3">
                              <Badge className={
                                "text-xs " + (c.tier === "Gold" 
                                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 border-amber-300"
                                  : c.tier === "Silver"
                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-700 border-slate-350"
                                    : "bg-orange-100 dark:bg-orange-950/20 text-orange-700 border-orange-200")
                              } variant="outline">
                                {c.tier}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-violet-600 dark:text-violet-400">{c.points} pts</td>
                            <td className="px-4 py-3 text-sm font-semibold text-right">{formatCurrency(c.totalSpent)}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- REWARDS LEDGER TAB --- */}
        {activeTab === "ledger" && (
          <div className="space-y-4">
            {/* Search & Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm rounded-lg"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSegment("all");
                    setSearchTerm("");
                  }}
                  className="rounded-lg text-xs flex-1 sm:flex-initial"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Main Ledger Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-xs font-semibold uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 tracking-wide">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Tier</th>
                      <th className="px-4 py-3">Points</th>
                      <th className="px-4 py-3">Value</th>
                      <th className="px-4 py-3">Last Visit</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingParties || loadingSales ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">Loading ledger data...</td>
                      </tr>
                    ) : filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">No matching customers found.</td>
                      </tr>
                    ) : (
                      filteredCustomers.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{c.name}</td>
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">{c.phone || "No Phone"}</td>
                          <td className="px-4 py-3">
                            <Badge className={
                              "text-xs " + (c.tier === "Gold" 
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 border-amber-300"
                                : c.tier === "Silver"
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 border-slate-350"
                                  : "bg-orange-100 dark:bg-orange-950/20 text-orange-700 border-orange-200")
                            } variant="outline">
                              {c.tier}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-violet-600 dark:text-violet-400">{c.points} pts</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                            {formatCurrency(c.points * config.pointValue)}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {c.lastPurchaseDate ? c.lastPurchaseDate.toLocaleDateString() : "Never"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 rounded-md border-primary/30 text-primary hover:bg-primary/5 text-xs"
                                onClick={() => {
                                  setSelectedCustomer({ id: c.id, name: c.name, currentPoints: c.points });
                                  setAdjustType("add");
                                  setAdjustmentDialogOpen(true);
                                }}
                              >
                                Adjust
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-xs font-semibold"
                                onClick={() => {
                                  if (c.points <= 0) {
                                    toast.error("Customer has 0 points to redeem!");
                                    return;
                                  }
                                  setSelectedCustomer({ id: c.id, name: c.name, currentPoints: c.points });
                                  setAdjustType("deduct");
                                  setAdjustAmount(c.points);
                                  setAdjustmentDialogOpen(true);
                                }}
                              >
                                Redeem
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* --- CAMPAIGNS TAB --- */}
        {activeTab === "campaigns" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campaign Template Builder Panel */}
            <div className="space-y-4 lg:col-span-1">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm space-y-5">
                <h3 className="text-sm font-semibold">1. Select Campaign</h3>

                <div className="space-y-2.5">
                  {campaignTemplates.map((tpl, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedTemplate(i)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        selectedTemplate === i
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-slate-200 hover:border-slate-400 bg-card"
                      }`}
                    >
                      <div className="font-semibold text-xs text-foreground mb-1">
                        {tpl.title}
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {tpl.getBody("Customer Name", 150, 150)}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="pt-3 border-t space-y-3">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Campaign Variables
                  </h3>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-xs text-slate-500 font-medium mb-1 block">
                        Custom Promo Code (Optional)
                      </label>

                      <Input
                        value={customPromoCode}
                        onChange={(e) =>
                          setCustomPromoCode(e.target.value)
                        }
                        className="h-9 text-sm rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-violet-500/5 p-3 rounded-lg border border-violet-500/10 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Messages open directly in WhatsApp web/app. RupeeBill
                    generates secure, compliant direct links to send to
                    customers based on their recorded contact card.
                  </p>
                </div>
              </div>
            </div>

            {/* Campaign Target Segment & Send Panel */}
            <div className="space-y-4 lg:col-span-2">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">
                    2. Target Audience
                  </h3>

                  {/* Segment Buttons */}
                  <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border gap-1">
                    {[
                      { id: "all", label: "All Customers" },
                      { id: "vip", label: "VIP Gold" },
                      { id: "slipping", label: "Inactive (30d+)" },
                      { id: "new", label: "New (7d)" },
                    ].map((seg) => (
                      <button
                        key={seg.id}
                        onClick={() =>
                          setSelectedSegment(seg.id as any)
                        }
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                          selectedSegment === seg.id
                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        {seg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 rounded-xl">
                  <span className="text-xs uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide">
                    Live Template Message Preview
                  </span>

                  <p className="mt-2 text-xs md:text-sm text-slate-700 dark:text-slate-300 font-sans italic whitespace-pre-line leading-relaxed">
                    "
                    {campaignTemplates[selectedTemplate].getBody(
                      "Amit Kumar",
                      350,
                      350 * config.pointValue
                    )}
                    "
                  </p>
                </div>

                {/* Segment Target List */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-[300px] overscroll-contain">
                    <table className="w-full text-left">
                      <thead className="text-xs font-semibold uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 tracking-wide sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5">Recipient</th>
                          <th className="px-4 py-2.5">Phone</th>
                          <th className="px-4 py-2.5">Wallet</th>
                          <th className="px-4 py-2.5 text-right">
                            Dispatch
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredCustomers.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-8 text-center text-xs text-slate-500"
                            >
                              No customers match this target segment.
                            </td>
                          </tr>
                        ) : (
                          filteredCustomers.map((c) => (
                            <tr key={c.id}>
                              <td className="px-4 py-2.5 font-medium text-xs">
                                {c.name}
                              </td>

                              <td className="px-4 py-2.5 text-xs text-slate-500">
                                {c.phone || "No Phone"}
                              </td>

                              <td className="px-4 py-2.5 font-semibold text-violet-600 dark:text-violet-400 text-xs">
                                {c.points} pts
                              </td>

                              <td className="px-4 py-2.5 text-right">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleSendWhatsApp(
                                      c.name,
                                      c.phone || "",
                                      c.points
                                    )
                                  }
                                  className="h-7 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                                >
                                  <Send className="w-3.5 h-3.5 mr-1" />
                                  Send
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === "settings" && (
          <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Settings2 className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-base font-semibold">
                  Reward Program Configuration
                </h3>

                <p className="text-xs text-slate-500">
                  Define how customers earn and redeem points in your store.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Program Switch */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border">
                <div className="space-y-0.5">
                  <label className="font-semibold text-sm text-foreground">
                    Enable Loyalty Points
                  </label>

                  <p className="text-xs text-slate-500">
                    Allow customers to accumulate reward points on
                    transactions.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      enabled: e.target.checked,
                    })
                  }
                  className="w-10 h-6 bg-slate-200 rounded-full appearance-none cursor-pointer checked:bg-primary relative before:content-[''] before:absolute before:w-5 before:h-5 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-all checked:before:translate-x-4"
                />
              </div>

              {/* Point Earning Multiplier */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Point Earning Multiplier
                </label>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1.5">
                      Award 1 point for every spent currency unit:
                    </p>

                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={config.pointsPerUnit}
                      disabled={!config.enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          pointsPerUnit: Number(e.target.value),
                        })
                      }
                      className="w-full accent-primary disabled:opacity-50"
                    />
                  </div>

                  <div className="w-24 text-center p-2 bg-slate-100 dark:bg-slate-800 border rounded-lg text-sm font-semibold">
                    {formatCurrency(config.pointsPerUnit)}
                  </div>
                </div>
              </div>

              {/* Point Monetary Value */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Point Value (Exchange Rate)
                </label>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1.5">
                      Monetary value of 1 Reward Point when redeeming:
                    </p>

                    <input
                      type="range"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={config.pointValue}
                      disabled={!config.enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          pointValue: Number(e.target.value),
                        })
                      }
                      className="w-full accent-primary disabled:opacity-50"
                    />
                  </div>

                  <div className="w-24 text-center p-2 bg-slate-100 dark:bg-slate-800 border rounded-lg text-sm font-semibold">
                    {formatCurrency(config.pointValue)}/pt
                  </div>
                </div>
              </div>

              {/* VIP Gold Threshold */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  VIP Gold Spend Threshold
                </label>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1.5">
                      Total spend requirement for VIP membership perks:
                    </p>

                    <input
                      type="range"
                      min="1000"
                      max="50000"
                      step="1000"
                      value={config.vipThreshold}
                      disabled={!config.enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          vipThreshold: Number(e.target.value),
                        })
                      }
                      className="w-full accent-primary disabled:opacity-50"
                    />
                  </div>

                  <div className="w-24 text-center p-2 bg-slate-100 dark:bg-slate-800 border rounded-lg text-sm font-semibold">
                    {formatCurrency(config.vipThreshold)}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <Button
                size="sm"
                onClick={() =>
                  toast.success(
                    "Loyalty settings updated successfully!"
                  )
                }
                className="rounded-lg shadow-sm text-sm"
              >
                Save Rule Configurations
              </Button>
            </div>
          </div>
        )}

        {/* Manual Adjustment Dialog */}
        <Dialog
          open={adjustmentDialogOpen}
          onOpenChange={setAdjustmentDialogOpen}
        >
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base">Adjust Reward Points</DialogTitle>

              <DialogDescription className="text-xs">
                Adjust points balance manually for{" "}
                <strong>{selectedCustomer?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="flex gap-3">
                <button
                  onClick={() => setAdjustType("add")}
                  className={`flex-1 p-2.5 rounded-lg border text-center font-semibold text-xs flex items-center justify-center gap-1.5 ${
                    adjustType === "add"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600"
                      : "border-slate-200 hover:border-slate-400 bg-card"
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Points
                </button>

                <button
                  onClick={() => setAdjustType("deduct")}
                  className={`flex-1 p-2.5 rounded-lg border text-center font-semibold text-xs flex items-center justify-center gap-1.5 ${
                    adjustType === "deduct"
                      ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-600"
                      : "border-slate-200 hover:border-slate-400 bg-card"
                  }`}
                >
                  <MinusCircle className="w-4 h-4" />
                  Deduct Points
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-medium">
                  Current Wallet Balance
                </label>

                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-semibold font-mono">
                  {selectedCustomer?.currentPoints || 0} pts
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-medium">
                  Adjustment Value (points)
                </label>

                <Input
                  type="number"
                  min="1"
                  placeholder="Enter points value..."
                  value={adjustAmount || ""}
                  onChange={(e) =>
                    setAdjustAmount(
                      Math.max(0, Number(e.target.value))
                    )
                  }
                  className="h-9 text-sm rounded-lg"
                />
              </div>

              {adjustType === "deduct" && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Redeeming {adjustAmount || 0} points will grant a
                    checkout discount of{" "}
                    <strong>
                      {formatCurrency(
                        (adjustAmount || 0) * config.pointValue
                      )}
                    </strong>{" "}
                    on their invoice billing.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="sm:justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAdjustmentDialogOpen(false)}
                className="rounded-lg text-xs"
              >
                Cancel
              </Button>

              <Button
                size="sm"
                onClick={handleApplyAdjustment}
                className="rounded-lg text-xs"
              >
                Apply Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

    </AppLayout>
  );
}