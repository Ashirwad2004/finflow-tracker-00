import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Wallet, ArrowLeft, Shield, Lock, Eye, Server, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  const sections = [
    {
      icon: Eye,
      title: "1. Information We Collect",
      content:
        "We collect information you provide directly when setting up your business profile (e.g., business name, phone number, currency preferences) and when recording financial transactions, customer orders, or inventory items."
    },
    {
      icon: Lock,
      title: "2. Offline-First Storage & Security",
      content:
        "FinFlow is designed to run 100% offline. Transactions and customer data are stored locally on your device in secure database files. We employ encryption standards to protect your local data from unauthorized local access."
    },
    {
      icon: RefreshCw,
      title: "3. Cloud Synchronization",
      content:
        "Once an active internet connection is detected, your locally stored data is automatically backed up and synced to our secure cloud servers hosted on Supabase. This guarantees your data is never lost if your device is damaged."
    },
    {
      icon: Server,
      title: "4. Third-Party Integrations & Sharing",
      content:
        "We do not sell your personal or financial data to third parties. We integrate with external services to facilitate sending automated invoices to your clients at your explicit trigger."
    },
    {
      icon: Shield,
      title: "5. User Controls & Data Deletion",
      content:
        "You have full ownership of your data. You can delete transactions, close your online storefront, or request permanent deletion of your business profile directly from the Settings panel in the dashboard."
    }
  ];

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 text-foreground overflow-x-hidden relative">
      {/* Background Glows */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-[100%] blur-[120px] opacity-40 pointer-events-none" />

      {/* Simplified Navigation */}
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/25">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">FinFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button onClick={() => navigate("/")} variant="ghost" className="rounded-full px-5">
              <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-16 max-w-4xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4 text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" /> Privacy & Protection
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Last Updated: July 16, 2026. Learn how we secure your financial and business data offline and online.
          </p>
        </motion.div>

        {/* Policy Content Cards */}
        <div className="space-y-8">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8 hover:shadow-lg hover:border-border transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {section.title}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                      {section.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer info inside Privacy Page */}
        <div className="mt-16 text-center text-xs text-muted-foreground pt-8 border-t border-border/40">
          <p className="mb-2">If you have any questions regarding your data security or need to request custom backup options, reach out to support@finflow.io</p>
          <p>© 2026 FinFlow. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}