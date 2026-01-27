import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Dashboard } from "@/components/Dashboard";
import { Button } from "@/components/ui/button";
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
  AlertCircle
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";

// --- Components for the Landing Page ---

const FeatureCard = ({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5 }}
      className="p-6 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 group"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
};

const StatCounter = ({ value, label }: { value: string, label: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="text-center"
    >
      <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-br from-primary to-violet-600 bg-clip-text text-transparent mb-2">
        {value}
      </div>
      <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
    </motion.div>
  );
};

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const targetRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    // Optional: Redirect logic
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  return (
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
            <span className="font-bold text-xl tracking-tight">ExpenseTracker</span>
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

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[1.1]">
              Know where every <br />
              <span className="bg-gradient-to-r from-primary via-violet-500 to-blue-500 bg-clip-text text-transparent pb-2">
                rupee goes.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-light">
              Stop guessing. Start growing. The financial operating system designed for modern freelancers and businesses to scale with confidence.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Button onClick={() => navigate("/auth")} size="lg" className="h-14 px-8 text-lg rounded-full shadow-2xl shadow-primary/40 hover:shadow-primary/50 transition-all hover:scale-105 bg-gradient-to-r from-primary to-violet-600 border-0">
                Start for Free <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-muted/50 backdrop-blur-sm">
                View Live Demo
              </Button>
            </div>
          </motion.div>

          {/* --- 3D MOVING DASHBOARD MOCKUP --- */}
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
                      <h2 className="text-2xl font-bold">Good Morning, Ashirwad 🔥</h2>
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
                      { label: "Total Revenue", val: "$45,231.89", trend: "+20.1%", color: "text-green-600", bg: "bg-green-500/10" },
                      { label: "Expenses", val: "$12,056.00", trend: "+4.5%", color: "text-rose-600", bg: "bg-rose-500/10" },
                      { label: "Net Profit", val: "$33,175.89", trend: "+25.3%", color: "text-blue-600", bg: "bg-blue-500/10" },
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
                              ${h}k
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-card rounded-xl border shadow-sm p-6">
                      <h3 className="font-semibold mb-6">Recent Activity</h3>
                      <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                              TX
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="h-2 w-20 bg-muted rounded-full" />
                              <div className="h-1.5 w-12 bg-muted/50 rounded-full" />
                            </div>
                            <div className="h-2 w-8 bg-muted rounded-full" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
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
                        <div className="font-bold text-2xl text-primary">$2,450.00</div>
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
                        <div className="font-semibold">$1,200</div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                            <Zap className="w-4 h-4" />
                          </div>
                          <div className="text-sm font-medium">SEO Optimization</div>
                        </div>
                        <div className="font-semibold">$850</div>
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
              <h3 className="text-Primary font-bold text-sm tracking-widest uppercase mb-4">Invoicing</h3>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Get paid 3x faster.</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Create professional invoices in seconds. Send them via email or WhatsApp, and track exactly when they're viewed and paid.
              </p>
              <ul className="space-y-4 mb-8">
                {["Custom Branding", "Auto-reminders", "Multi-currency support", "PDF Export"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-lg">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="rounded-full">Learn more <MoveRight className="ml-2 w-4 h-4" /></Button>
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
                              $4,250
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
                            { icon: Home, label: "Housing", amt: "$1,200", pct: 65, color: "bg-blue-500" },
                            { icon: Utensils, label: "Food & Dining", amt: "$450", pct: 35, color: "bg-orange-500" },
                            { icon: Car, label: "Transport", amt: "$200", pct: 15, color: "bg-green-500" },
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
        </div>
      </section>



      {/* --- CTA SECTION --- */}
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
              <p className="text-sm text-muted-foreground mt-4 sm:mt-0 sm:ml-4">No credit card required.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- NEW TRUST / WALL OF LOVE SECTION --- */}
      <section className="py-24 border-t relative overflow-hidden">
        <div className="container mx-auto px-4 mb-12 text-center">
          <h2 className="text-3xl font-bold mb-12">Join the <span className="text-primary">fastest growing</span> finance community.</h2>

          {/* Infinite Marquee of Logos */}
          <div className="relative flex overflow-x-hidden group">
            <div className="animate-marquee whitespace-nowrap flex items-center gap-16 pr-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {/* Duplicate logos for infinite loop */}
              {[1, 2, 3, 4, 5, 1, 2, 3, 4, 5].map((i, index) => (
                <div key={index} className="inline-flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20" />
                  <span className="font-bold text-xl text-muted-foreground">COMPANY {index + 1}</span>
                </div>
              ))}
            </div>
            <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex items-center gap-16 pr-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {[1, 2, 3, 4, 5, 1, 2, 3, 4, 5].map((i, index) => (
                <div key={index} className="inline-flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20" />
                  <span className="font-bold text-xl text-muted-foreground">COMPANY {index + 1}</span>
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
              <span className="font-bold text-lg">ExpenseTracker</span>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Product</a>
              <a href="#" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#" className="hover:text-foreground transition-colors">Security</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2025 ExpenseTracker Inc.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;