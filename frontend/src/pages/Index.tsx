import { useRef, useState, useEffect } from "react";
import { BookDemoModal } from "@/features/demo/BookDemoModal";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { Button } from "@/components/ui/button";
import { toast } from "@/core/hooks/use-toast";
import {
  Wallet,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  Building2,
  PieChart,
  Users,
  Globe,
  Lock,
  Smartphone,
  MoveRight,
  Star,
  MoreHorizontal,
  Download,
  Home,
  Utensils,
  Car,
  AlertCircle,
  Database,
  Store
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence } from "framer-motion";

import { FeatureCard, StatCounter } from "@/features/landing/components/LandingSubComponents";
import { DashboardMockup } from "@/features/landing/components/DashboardMockup";
import { CheckoutMockup } from "@/features/landing/components/CheckoutMockup";
import { InteractivePlayground } from "@/features/landing/components/InteractivePlayground";
import { RealSubscriptionCheckout, PLAN_CONFIGS } from "@/features/landing/components/RealSubscriptionCheckout";

const Index = () => {
  const { user, loading } = useAuth();
  const { isSalesman } = useBusiness();
  const navigate = useNavigate();
  const targetRef = useRef<HTMLDivElement>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [heroMode, setHeroMode] = useState<"pos" | "storefront">("pos");
  
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<"starter" | "pro" | "business">("pro");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

  // Auto-resume pending subscription after login
  useEffect(() => {
    const pendingPlan = localStorage.getItem("pending_subscription_plan") as "starter" | "pro" | "business" | null;
    const pendingCycle = localStorage.getItem("pending_subscription_cycle") as "monthly" | "annual" | null;
    const urlParams = new URLSearchParams(window.location.search);
    const shouldOpenCheckout = urlParams.get("open_checkout") === "true";

    if (user && (pendingPlan || shouldOpenCheckout)) {
      if (pendingPlan) setSelectedPlanId(pendingPlan);
      if (pendingCycle) setBillingCycle(pendingCycle);
      setSubscriptionOpen(true);
      localStorage.removeItem("pending_subscription_plan");
      localStorage.removeItem("pending_subscription_cycle");
      toast({
        title: "Welcome Back!",
        description: "Please complete your subscription payment to unlock all premium features.",
      });
    }
  }, [user]);

  const feedbacks = [
    { text: "Wi-Fi dropped but counter kept billing!", rating: 5, shop: "Aroma Roasters" },
    { text: "E-commerce storefront ready in 60s!", rating: 4.5, shop: "Style Studio" },
    { text: "Clean receipts and instant invoices are perfect!", rating: 5, shop: "Delhi Grocery" },
    { text: "Saved our business during a power blackout!", rating: 5, shop: "Baker's Hub" },
    { text: "Fast inventory sync, very easy to use", rating: 4, shop: "Electro World" },
    { text: "Automatic local backup is a lifesaver", rating: 5, shop: "Green Organic" },
    { text: "Our sales doubled after sharing store link!", rating: 4.5, shop: "Sweet Treat" }
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, idx) => {
      const isGold = idx < Math.floor(rating);
      const isHalf = idx === Math.floor(rating) && rating % 1 !== 0;
      if (isGold) {
        return (
          <Star
            key={idx}
            className="w-3.5 h-3.5 fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.65)]"
          />
        );
      }
      if (isHalf) {
        return (
          <div key={idx} className="relative w-3.5 h-3.5 inline-flex items-center justify-center">
            <Star className="absolute top-0 left-0 w-3.5 h-3.5 text-slate-350 dark:text-slate-650 fill-transparent" />
            <div className="absolute top-0 left-0 w-[50%] overflow-hidden h-full">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.65)]" />
            </div>
          </div>
        );
      }
      return (
        <Star
          key={idx}
          className="w-3.5 h-3.5 text-slate-350 dark:text-slate-650 fill-transparent"
        />
      );
    });
  };

  // Hero Parallax Logic
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);

  // Mouse Follow Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 50, damping: 20 });
  const mouseY = useSpring(y, { stiffness: 50, damping: 20 });

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const { clientX, clientY } = event;
    const { innerWidth, innerHeight } = window;
    x.set((clientX / innerWidth - 0.5) * 20); // Move range -20 to 20
    y.set((clientY / innerHeight - 0.5) * 20);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isRecovery = window.location.hash.includes("type=recovery");

  if (user && !isRecovery) {
    if (isSalesman) {
      return <Navigate to="/salesman-dashboard" replace />;
    }
    return <Dashboard />;
  }

  return (
    <>
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 overflow-x-hidden" onMouseMove={handleMouseMove}>
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/25">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">FinFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button onClick={() => navigate("/auth")} variant="ghost" className="hidden sm:flex font-medium">
              Log In
            </Button>
            <Button onClick={() => navigate("/auth")} className="shadow-lg shadow-primary/20 rounded-full px-6 transition-all hover:scale-105">
              Get Started
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* --- HERO SECTION --- */}
      <section ref={targetRef} className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden min-h-[90vh] flex flex-col justify-center">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 rounded-[100%] blur-[120px] opacity-50 animate-blob pointer-events-none" />

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-8 hover:bg-primary/20 transition-colors cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              V1.0 is Live: AI Receipt Scanning & More
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={heroMode}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                {heroMode === "pos" ? (
                  <>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[1.1]">
                      Run your counter <br />
                      <span className="bg-gradient-to-r from-violet-650 via-primary to-indigo-600 bg-clip-text text-transparent pb-2">
                        100% offline.
                      </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed font-light">
                      Keep billing customers, updating inventory, and printing receipts even when your store's Wi-Fi is completely down. Zero lag, zero downtime.
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[1.1]">
                      Add your local shop <br />
                      <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 bg-clip-text text-transparent pb-2">
                        into online mode.
                      </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed font-light">
                      Turn your local physical inventory into a live customer-facing e-commerce shop in 60 seconds. Accept online orders, manage stock levels, and sync everything.
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Mode Switcher */}
            <div className="inline-flex bg-slate-100 dark:bg-slate-900 rounded-full p-1.5 border border-slate-200/50 dark:border-slate-800 mb-12 shadow-xl relative z-20">
              <button
                onClick={() => setHeroMode("pos")}
                className={`flex items-center gap-2 py-2.5 px-6 rounded-full font-bold text-xs sm:text-sm transition-all ${
                  heroMode === "pos"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md scale-[1.03]"
                    : "text-slate-500 hover:text-slate-950 dark:hover:text-slate-200"
                }`}
              >
                <Store className="w-4 h-4 text-violet-500" />
                🏪 Billing Counter Mode
              </button>
              <button
                onClick={() => setHeroMode("storefront")}
                className={`flex items-center gap-2 py-2.5 px-6 rounded-full font-bold text-xs sm:text-sm transition-all ${
                  heroMode === "storefront"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md scale-[1.03]"
                    : "text-slate-500 hover:text-slate-950 dark:hover:text-slate-200"
                }`}
              >
                <Globe className="w-4 h-4 text-emerald-500" />
                🌐 Launch Online Store
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 relative z-20">
             <Button onClick={() => setDemoOpen(true)} size="lg" className="h-14 px-8 text-lg rounded-full bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white border-0 shadow-lg transition-all hover:scale-105">
  <Star className="mr-2 w-5 h-5" /> Book a Demo
</Button>
              <Button onClick={() => navigate("/auth")} size="lg" className="h-14 px-8 text-lg rounded-full shadow-2xl shadow-primary/40 hover:shadow-primary/50 transition-all hover:scale-105 bg-gradient-to-r from-primary to-violet-600 border-0">
                Start Free <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </motion.div>

          {/* --- 3D MOVING DASHBOARD MOCKUP --- */}
          <DashboardMockup opacity={opacity} scale={scale} mouseX={mouseX} mouseY={mouseY} heroMode={heroMode} />
        </div>
      </section>

      {/* --- PROBLEM / SOLUTION SECTION --- */}
      <section className="py-32 bg-slate-50 dark:bg-slate-950/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-24">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-bold mb-6"
            >
              Financial chaos is <span className="text-destructive">killing</span> your growth.
            </motion.h2>
            <p className="text-lg text-muted-foreground">
              Spreadsheets are prone to errors. Paper receipts get lost. And you have no idea if you're actually profitable until tax season comes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            {[
              { icon: Smartphone, title: "Lost Receipts", desc: "No more shoeboxes full of faded thermal paper. Snap a photo and let AI do the rest." },
              { icon: Lock, title: "Data Security", desc: "Stop emailing sensitive financial data. Keep everything encrypted and safe in one place." },
              { icon: PieChart, title: "Blind Spending", desc: "Don't wait for your accountant. See exactly where your money is going in real-time." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                className="bg-background p-8 rounded-3xl shadow-sm border text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <item.icon className="w-8 h-8 text-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- INTERACTIVE SYSTEM PLAYGROUND --- */}
      <InteractivePlayground />

      {/* --- IMMERSIVE FEATURES SECTION --- */}
      <section className="py-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-16 mb-32">
            <div className="w-full md:w-1/2">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-violet-500/20 rounded-[2rem] blur-2xl -z-10" />
                <div className="bg-card border rounded-[2rem] shadow-2xl overflow-hidden aspect-square md:aspect-[4/3] p-8 flex items-center justify-center">
                  {/* Detailed Invoice Mockup */}
                  <div className="w-full max-w-sm bg-background shadow-2xl rounded-2xl p-6 relative border border-border/50">
                    {/* Invoice Header */}
                    <div className="flex justify-between items-start border-b border-border/50 pb-4 mb-4">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Invoice To</div>
                        <div className="font-bold text-lg">Acme Corp Inc.</div>
                        <div className="text-sm text-muted-foreground">Oct 24, 2025</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Amount</div>
                        <div className="font-bold text-2xl text-primary">₹2,450.00</div>
                      </div>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                            <Globe className="w-4 h-4" />
                          </div>
                          <div className="text-sm font-medium">Website Redesign</div>
                        </div>
                        <div className="font-semibold">₹1,200</div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                            <Zap className="w-4 h-4" />
                          </div>
                          <div className="text-sm font-medium">SEO Optimization</div>
                        </div>
                        <div className="font-semibold">₹850</div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      <Button className="w-full h-12 text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                        <CheckCircle2 className="mr-2 w-5 h-5" /> Send Invoice
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            <div className="w-full md:w-1/2">
              <h3 className="text-primary font-bold text-sm tracking-widest uppercase mb-4">Invoicing</h3>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Get paid 3x faster.</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Create professional invoices in seconds. Send them instantly to clients, and track exactly when they're viewed and paid.
              </p>
              <ul className="space-y-4 mb-8">
                {["Custom Branding", "Auto-reminders", "Multi-currency support", "PDF Export"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-lg">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row-reverse items-center gap-16">
            <div className="w-full md:w-1/2">
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="relative w-full"
              >
                {/* --- SUPER DEV UPDATE: High-Fidelity Expense Dashboard Widget --- */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-cyan-500/20 rounded-[2rem] blur-2xl -z-10" />

                <div className="bg-card border rounded-[2rem] shadow-2xl overflow-hidden aspect-[4/3] md:aspect-[16/9] lg:aspect-[2/1] relative group">

                  {/* Background Decoration */}
                  <PieChart className="absolute -top-10 -right-10 w-64 h-64 text-blue-500/5 rotate-12 transition-transform duration-700 group-hover:rotate-45" />
                  <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-background to-transparent opacity-90" />

                  {/* Glassmorphism Widget Container */}
                  <div className="relative z-10 flex items-center justify-center h-full w-full p-6 md:p-8">
                    <div className="w-full max-w-2xl bg-background/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row overflow-hidden">

                      {/* Left Pane: Chart & Summary */}
                      <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-border/50">
                        <div className="flex justify-between items-center mb-6">
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Spent</div>
                            <div className="text-3xl font-bold flex items-center gap-2">
                              ₹4,250
                              <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full border border-green-500/20">-4.2%</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>

                        {/* Chart Visualization */}
                        <div className="h-32 flex items-end justify-between gap-1 mb-2">
                          {[40, 70, 45, 90, 60, 80, 55].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col justify-end group/bar h-full">
                              <div className="relative w-full bg-primary/10 rounded-sm overflow-hidden h-full">
                                <motion.div
                                  initial={{ height: 0 }}
                                  whileInView={{ height: `${h}%` }}
                                  transition={{ duration: 0.8, delay: i * 0.1 }}
                                  className="absolute bottom-0 w-full bg-gradient-to-t from-primary to-blue-400 rounded-sm group-hover/bar:opacity-80 transition-all"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground font-medium px-1">
                          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                        </div>
                      </div>

                      {/* Right Pane: Top Categories Breakdown */}
                      <div className="w-full md:w-56 bg-muted/30 p-5 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-bold text-muted-foreground uppercase">Top Categories</span>
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </div>

                        <div className="space-y-4">
                          {[
                            { icon: Home, label: "Housing", amt: "₹1,200", pct: 65, color: "bg-blue-500" },
                            { icon: Utensils, label: "Food & Dining", amt: "₹450", pct: 35, color: "bg-orange-500" },
                            { icon: Car, label: "Transport", amt: "₹200", pct: 15, color: "bg-green-500" },
                          ].map((cat, i) => (
                            <div key={i} className="group/item">
                              <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-2">
                                  <cat.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs font-medium">{cat.label}</span>
                                </div>
                                <span className="text-xs font-bold">{cat.amt}</span>
                              </div>
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  whileInView={{ width: `${cat.pct}%` }}
                                  transition={{ duration: 1, delay: 0.5 + (i * 0.2) }}
                                  className={`h-full ${cat.color} rounded-full`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Smart Insight Pill */}
                        <div className="mt-5 pt-4 border-t border-border/50 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-[10px] leading-tight text-muted-foreground">
                            <span className="font-semibold text-primary">Smart Insight:</span> You spent 15% less on dining out this week. Keep it up!
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
                {/* --- END SUPER DEV WIDGET --- */}

              </motion.div>
            </div>
            <div className="w-full md:w-1/2">
              <h3 className="text-blue-500 font-bold text-sm tracking-widest uppercase mb-4">Analytics</h3>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Profit is a habit.</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Visualize your cash flow with stunning clarity. Identify leaks, spot trends, and make decisions based on data, not gut feeling.
              </p>
              <Button variant="outline" className="rounded-full">Explore Analytics <MoveRight className="ml-2 w-4 h-4" /></Button>
            </div>
          </div>

          {/* --- DIGITAL STOREFRONT FEATURE DETAIL --- */}
          <div className="flex flex-col md:flex-row items-center gap-16 mt-32">
            <div className="w-full md:w-1/2">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 rounded-[2rem] blur-2xl -z-10" />
                <div className="bg-card border rounded-[2rem] shadow-2xl overflow-hidden p-6 md:p-8 flex items-center justify-center">
                  <div className="w-full max-w-sm bg-background border border-border/50 shadow-xl rounded-2xl p-5 relative">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center text-xs">☕</div>
                        <span className="font-bold text-xs">Storefront Live</span>
                      </div>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
                    </div>
                    {/* Customer Cart Item */}
                    <div className="p-3 bg-muted/30 rounded-xl flex items-center justify-between mb-3 border border-border/20">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-700/15 flex items-center justify-center text-sm">☕</div>
                        <div>
                          <div className="text-xs font-bold">Organic Coffee Beans</div>
                          <div className="text-[9px] text-slate-400">Qty: 2 · Subtotal: ₹1,198</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold">₹1,198</span>
                    </div>
                    {/* Customer Detail */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Customer Name:</span>
                        <span className="font-semibold text-foreground">Rahul S.</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Address:</span>
                        <span className="font-semibold text-foreground text-right truncate max-w-[150px]">Koramangala, Bangalore</span>
                      </div>
                    </div>
                    {/* Order Placement Action */}
                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-2 text-center text-[10px] text-violet-400 font-semibold mb-3">
                      ⚡ New storefront order placed!
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            <div className="w-full md:w-1/2">
              <h3 className="text-primary font-bold text-sm tracking-widest uppercase mb-4">E-Commerce Storefront</h3>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Launch your online store.</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Instantly publish a customer-facing e-commerce storefront linked directly to your inventory. Accept orders, calculate shipping, and manage stock levels in real-time.
              </p>
              <ul className="space-y-4 mb-8">
                {["Custom Store URLs", "Real-Time WebSocket Order Sync", "Self-Updating Inventory Levels", "Customer Order History Tracking"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-lg">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={() => navigate("/store/aroma-coffee")} variant="default" className="rounded-full">Explore Storefront <MoveRight className="ml-2 w-4 h-4" /></Button>
            </div>
          </div>

          {/* --- OFFLINE-FIRST SYNC ENGINE FEATURE DETAIL --- */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-16 mt-32">
            <div className="w-full md:w-1/2">
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 rounded-[2rem] blur-2xl -z-10" />
                <div className="bg-card border rounded-[2rem] shadow-2xl overflow-hidden p-6 md:p-8 flex items-center justify-center text-slate-800">
                  <div className="w-full max-w-sm bg-white border border-slate-200 shadow-xl rounded-2xl p-6 relative font-sans">
                    {/* Receipt Header */}
                    <div className="text-center border-b border-dashed border-slate-200 pb-4 mb-4">
                      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Database className="w-3.5 h-3.5 text-amber-500" />
                        Offline Transaction
                      </div>
                      <div className="text-2xl font-black text-slate-900 mt-1">₹2,497.00</div>
                    </div>
                    {/* Receipt Items */}
                    <div className="space-y-3.5 mb-6 text-left">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">2x Organic Coffee Beans</span>
                        <span className="font-bold text-slate-900">₹1,198</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">1x Premium Thermal Flask</span>
                        <span className="font-bold text-slate-900">₹1,299</span>
                      </div>
                    </div>
                    {/* Status Alert Badge */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center text-xs text-amber-700 font-bold flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      <span>Saved Securely · Ready to Backup</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            <div className="w-full md:w-1/2">
              <h3 className="text-amber-500 font-bold text-sm tracking-widest uppercase mb-4">Offline Protection</h3>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">No Internet? Keep Selling.</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Wi-Fi outages or power cuts shouldn't stop your sales. FinFlow securely saves all your transactions, invoices, and expense logs directly on your device. The instant your internet is back, your data automatically backs up to the cloud.
              </p>
              <ul className="space-y-4 mb-8">
                {["Uninterrupted sales billing during outages", "Automatic cloud backup when internet reconnects", "Encrypted device-level local storage", "Instant screen response times with zero loading"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-lg">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="rounded-full">See How It Works <MoveRight className="ml-2 w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      </section>

      {/* --- PRICING SECTION (id="pricing" for footer link) --- */}
      <section id="pricing" className="py-32 bg-slate-50 dark:bg-slate-950/50 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
              <Zap className="w-3.5 h-3.5" /> Simple, Transparent Pricing
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
              Invest in your <span className="bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">financial clarity</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-8">
              Start free. Upgrade when you're ready. No hidden fees, ever.
            </p>

            {/* Interactive Billing Cycle Toggle */}
            <div className="inline-flex items-center gap-2 bg-background border p-1.5 rounded-full shadow-sm">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                  billingCycle === "annual"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual Billing
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Save 20%
                </span>
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 max-w-5xl mx-auto">
            {PLAN_CONFIGS.map((plan, i) => {
              const price = billingCycle === "annual" ? plan.annualPricePerMonth : plan.monthlyPrice;
              const isHighlight = plan.recommended;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative rounded-3xl p-8 flex flex-col ${isHighlight
                    ? "bg-gradient-to-br from-primary to-violet-600 text-white shadow-2xl shadow-primary/40 scale-105"
                    : "bg-background border border-border/60 shadow-lg"
                  }`}
                >
                  {isHighlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-md tracking-wide uppercase">
                      Most Popular
                    </div>
                  )}
                  <div className={`text-sm font-semibold uppercase tracking-widest mb-3 ${isHighlight ? "text-white/70" : "text-muted-foreground"}`}>{plan.name}</div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className={`text-5xl font-extrabold ${isHighlight ? "text-white" : "text-foreground"}`}>
                      {price === 0 ? "Free" : `₹${price}`}
                    </span>
                    {price > 0 && (
                      <span className={`text-sm font-medium ${isHighlight ? "text-white/70" : "text-muted-foreground"}`}>/month</span>
                    )}
                  </div>
                  <p className={`text-xs mb-6 ${isHighlight ? "text-white/80" : "text-muted-foreground"}`}>{plan.description}</p>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${isHighlight ? "text-white/90" : "text-emerald-500"}`} />
                        <span className={isHighlight ? "text-white/90" : "text-foreground"}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setSubscriptionOpen(true);
                    }}
                    className={`w-full h-12 rounded-full font-semibold transition-all hover:scale-105 ${isHighlight
                      ? "bg-white text-primary hover:bg-white/90 shadow-lg"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {plan.id === "starter" ? "Get Started Free" : plan.id === "pro" ? "Upgrade to Pro" : "Subscribe to Business"}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* Interactive Live Subscription Preview & Payment Options Card */}
          <CheckoutMockup 
            onPayClick={(planId) => {
              setSelectedPlanId(planId || "pro");
              setSubscriptionOpen(true);
            }} 
          />
        </div>
      </section>


      <section className="py-32 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[100px] -z-10" />

        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            className="max-w-4xl mx-auto bg-card border rounded-[3rem] p-12 md:p-24 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-violet-500" />

            <h2 className="text-4xl md:text-6xl font-extrabold mb-8">Ready to dominate your market?</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join the platform that's powering the next generation of businesses. Setup takes less than 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => navigate("/auth")} className="h-16 px-10 text-xl rounded-full shadow-xl bg-primary hover:bg-primary/90">
                Get Started Now
              </Button>
              <Button
                size="lg"
                onClick={() => setDemoOpen(true)}
                className="h-16 px-10 text-xl rounded-full hover:scale-105 transition-all bg-red-500 hover:bg-red-600 text-white"
              >
                Book a Demo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">No credit card required.</p>
          </motion.div>
        </div>
      </section>

      {/* --- NEW TRUST / WALL OF LOVE SECTION --- */}
      <section className="py-24 border-t relative overflow-hidden">
        <div className="container mx-auto px-4 mb-12 text-center">
          <h2 className="text-3xl font-bold mb-12">Join the <span className="text-primary">fastest growing</span> finance community.</h2>

          {/* Infinite Marquee of Logos */}
          <div className="relative flex overflow-x-hidden group py-4">
            <div className="animate-marquee whitespace-nowrap flex items-center gap-6 pr-6 opacity-100 transition-all duration-500">
              {[...feedbacks, ...feedbacks].map((f, index) => (
                <div key={index} className="inline-flex items-center gap-3 bg-card/75 backdrop-blur-sm border border-border/80 rounded-full px-5 py-3 shadow-md hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex items-center gap-1">
                    {renderStars(f.rating)}
                  </div>
                  <span className="text-slate-350 dark:text-slate-650">|</span>
                  <span className="text-xs font-semibold text-foreground">"{f.text}"</span>
                  <span className="text-muted-foreground text-[9px] font-bold uppercase tracking-wider">— {f.shop}</span>
                </div>
              ))}
            </div>
            <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex items-center gap-6 pr-6 opacity-100 transition-all duration-500 py-4">
              {[...feedbacks, ...feedbacks].map((f, index) => (
                <div key={index} className="inline-flex items-center gap-3 bg-card/75 backdrop-blur-sm border border-border/80 rounded-full px-5 py-3 shadow-md hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex items-center gap-1">
                    {renderStars(f.rating)}
                  </div>
                  <span className="text-slate-350 dark:text-slate-650">|</span>
                  <span className="text-xs font-semibold text-foreground">"{f.text}"</span>
                  <span className="text-muted-foreground text-[9px] font-bold uppercase tracking-wider">— {f.shop}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Testimonial Cards Grid */}
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Sarah J.", role: "Freelance Designer", text: "Finally, an app that understands how creatives work. Invoicing used to be a nightmare." },
              { name: "Mike T.", role: "Agency Owner", text: "The metrics dashboard is a game changer. I check it every morning instead of Instagram." },
              { name: "Davina R.", role: "Consultant", text: "Clean, fast, and tax season is now actually stress-free. Worth every penny." }
            ].map((t, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="p-6 rounded-2xl bg-muted/30 border border-border/50"
              >
                <div className="flex gap-1 mb-4 text-yellow-500">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-muted-foreground mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">FinFlow</span>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Product</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#" className="hover:text-foreground transition-colors">Security</a>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2026 FinFlow
            </div>
          </div>
        </div>
      </footer>
    </div>

    {/* Book a Demo Modal */}
    <BookDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />

    {/* Real Subscription & Payment Checkout Modal */}
    <RealSubscriptionCheckout 
      open={subscriptionOpen} 
      onOpenChange={setSubscriptionOpen} 
      initialPlanId={selectedPlanId} 
      initialBillingCycle={billingCycle} 
    />
  </>);
};

export default Index;
