import React from "react";
import { Link } from "react-router-dom";
import {
  Scale,
  Info,
  ShieldAlert,
  CreditCard,
  AlertTriangle,
  Receipt,
  ExternalLink,
  Phone,
  MessageCircle,
  Mail,
} from "lucide-react";

export const PricingTermsSection: React.FC = () => {
  return (
    <section id="terms-section" className="w-full max-w-5xl mx-auto mt-20 pt-12 border-t border-border/70 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
          <Scale className="w-3.5 h-3.5" /> Legal Terms &amp; Conditions
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Terms of Service &amp; Commercial Conditions
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Important guidelines regarding your software license, offline device responsibilities, subscriptions, and verified purchase bills.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 1: Acceptance of Terms */}
        <div className="bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-sm hover:border-primary/40 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">1. Acceptance of Terms</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                By accessing, purchasing, or using RupeeBill, you agree to be bound by these Terms of Service. If you do not agree, you may not use our services.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Offline-First Device Responsibility */}
        <div className="bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-sm hover:border-primary/40 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">2. Offline-First Device Responsibility</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Because RupeeBill operates offline-first, your transactions and customer logs are stored directly on your local device (OPFS). You are solely responsible for ensuring you do not clear your browser cache or app storage before data is backed up to the cloud. You retain 100% data ownership and may export to Excel anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Subscriptions & Billing */}
        <div className="bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-sm hover:border-primary/40 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">3. Subscriptions &amp; Commercial Licensing</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                All core billing and inventory features are free. The Business License is billed at a flat ₹299 for 6 Months with zero tax surcharge and zero transaction commission. Subscriptions grant non-transferable single-tenant commercial software rights and can be renewed or cancelled at any time.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Limitation of Liability */}
        <div className="bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-sm hover:border-primary/40 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">4. Limitation of Liability</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                RupeeBill is provided &apos;as-is&apos; without warranties of any kind. We are not liable for any financial inaccuracies, business disruptions, or data loss occurring due to hardware failures or local device issues.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Official Software Purchase Bill */}
        <div className="bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-sm hover:border-primary/40 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">5. Official Software Purchase Bill (PDF)</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                An official verifiable Software Purchase Bill containing your unique Bill ID, transaction timestamp, Razorpay verification reference, and valid license duration is generated and downloadable immediately upon verified payment.
              </p>
            </div>
          </div>
        </div>

        {/* Section 6: Cancellation & Refund Guidelines */}
        <div className="bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-sm hover:border-primary/40 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">6. Cancellation &amp; Refund Guidelines</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Licenses can be cancelled at any time prior to renewal. Because instant digital access and verified software purchase bills are granted immediately upon checkout, fees for active license terms are non-refundable once activated.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/terms"
          className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline underline-offset-4"
        >
          <span>View Full Standalone Terms of Service Document</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Support Helpline & Query Resolution Box */}
      <div className="mt-12 p-6 rounded-2xl bg-card border border-border/80 shadow-sm max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
        <div>
          <h4 className="font-bold text-foreground text-sm sm:text-base">
            Questions About Commercial Licensing or Payment?
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Our support team is available Mon–Sun (9 AM – 9 PM) for any payment query or custom setup.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
          <a
            href="tel:8102545007"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground border border-border text-xs font-bold hover:bg-muted/80"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-500" />
            <span>+91 8102545007</span>
          </a>
          <a
            href="https://wa.me/918102545007?text=Hi%20RupeeBill%20Support,%20I%20have%20a%20query%20regarding%20licensing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 text-xs font-bold hover:bg-[#25D366]/20"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
          <a
            href="mailto:supportrupeebill@gmail.com"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>supportrupeebill@gmail.com</span>
          </a>
        </div>
      </div>
    </section>
  );
};
