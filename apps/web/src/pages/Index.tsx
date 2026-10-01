import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { useSubscription } from "@/core/hooks/useSubscription";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { toast } from "@/core/hooks/use-toast";
import { BookDemoModal } from "@/features/demo/BookDemoModal";
import { RealSubscriptionCheckout } from "@/features/landing/components/RealSubscriptionCheckout";

// Modular landing page sections in exact required sequence
import { Navbar } from "@/features/landing/components/Navbar";
import { Hero } from "@/features/landing/components/Hero";
import { VyaparFeatures } from "@/features/landing/components/VyaparFeatures";
import { InvoiceThemesShowcase } from "@/features/landing/components/InvoiceThemesShowcase";
import { ComparisonTable } from "@/features/landing/components/ComparisonTable";
import { BusinessTypes } from "@/features/landing/components/BusinessTypes";
import { HowItWorks } from "@/features/landing/components/HowItWorks";
import { MerchantTestimonials } from "@/features/landing/components/MerchantTestimonials";
import { PricingPreview } from "@/features/landing/components/PricingPreview";
import { FAQ } from "@/features/landing/components/FAQ";
import { FinalCTA } from "@/features/landing/components/FinalCTA";
import { Footer } from "@/features/landing/components/Footer";

const Index = () => {
  const { user, loading } = useAuth();
  const { isSalesman } = useBusiness();
  const { canAccessApp, isLoading: subLoading, isTrialExpired } = useSubscription();

  // Modals state
  const [demoOpen, setDemoOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<"starter" | "pro" | "business">("pro");

  // Dynamic SEO metadata
  useEffect(() => {
    document.title = "RupeeBill — All-in-One Invoicing, Inventory & Business Management";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "All-in-one business software: professional invoicing, fast POS counter checkout, real-time inventory tracking, customer ledgers, and online storefront."
      );
    }
  }, []);

  // Auto-resume pending subscription after login
  useEffect(() => {
    const pendingPlan = localStorage.getItem("pending_subscription_plan") as "starter" | "pro" | "business" | null;
    const urlParams = new URLSearchParams(window.location.search);
    const shouldOpenCheckout = urlParams.get("open_checkout") === "true";

    if (user && (pendingPlan || shouldOpenCheckout)) {
      if (pendingPlan) setSelectedPlanId(pendingPlan);
      setSubscriptionOpen(true);
      localStorage.removeItem("pending_subscription_plan");
      localStorage.removeItem("pending_subscription_cycle");
      toast({
        title: "Welcome Back!",
        description: "Please complete your subscription payment to unlock all premium features.",
      });
    }
  }, [user]);

  if (loading || subLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isRecovery = window.location.hash.includes("type=recovery");

  if (user && !isRecovery) {
    if (isSalesman) {
      return <Navigate to="/salesman-dashboard" replace />;
    }
    if (!canAccessApp) {
      return <Navigate to="/pricing" replace state={{ trialExpired: isTrialExpired }} />;
    }
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 flex flex-col">
      {/* 1. Navbar */}
      <Navbar onBookDemo={() => setDemoOpen(true)} />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* 2. Hero (Windows Desktop POS & Mobile WhatsApp Dual Mockup) */}
        <Hero onBookDemo={() => setDemoOpen(true)} />

        {/* 3. Vyapar-Style 5-Tab Business Toolkit (Invoicing, Stock, Khata, Daybook, CA Reports) */}
        <VyaparFeatures />

        {/* 4. Professional Invoice & Thermal Receipt Formats Gallery */}
        <InvoiceThemesShowcase />

        {/* 5. Paper Khata vs Excel vs RupeeBill Comparison Table */}
        <ComparisonTable />

        {/* 6. Built for Your Trade (Retail, Wholesale, Garments, Electronics, Cafes, Services) */}
        <BusinessTypes />

        {/* 7. How It Works (3-Minute Setup Roadmap) */}
        <HowItWorks />

        {/* 8. Real Indian Retailer Testimonials */}
        <MerchantTestimonials />

        {/* 9. Pricing Preview (100% Free Everything Forever) */}
        <PricingPreview
          onBookDemo={() => setDemoOpen(true)}
        />

        {/* 10. Merchant FAQ */}
        <FAQ onBookDemo={() => setDemoOpen(true)} />

        {/* 11. Final CTA */}
        <FinalCTA onBookDemo={() => setDemoOpen(true)} />
      </main>

      {/* 14. Footer */}
      <Footer />

      {/* Book a Demo Modal */}
      <BookDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />

      {/* Real Subscription & Payment Checkout Modal */}
      <RealSubscriptionCheckout
        open={subscriptionOpen}
        onOpenChange={setSubscriptionOpen}
        initialPlanId={selectedPlanId}
        initialBillingCycle="annual"
      />
    </div>
  );
};

export default Index;