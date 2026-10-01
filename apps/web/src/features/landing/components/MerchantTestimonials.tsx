import React from "react";
import { Star, Building2, Quote, CheckCircle2 } from "lucide-react";

export const MerchantTestimonials: React.FC = () => {
  const testimonials = [
    {
      name: "Kailash Agarwal",
      shop: "Agarwal Provisions & Kirana",
      city: "Jaipur, Rajasthan",
      quote:
        "Earlier, evening rush at our kirana store was a nightmare with handwriting bills. With RupeeBill's thermal 3-inch printing and barcode scanner, our billing speed doubled. Customers love the instant WhatsApp receipts!",
      highlight: "Billing speed doubled · Zero customer queues",
      rating: 5,
    },
    {
      name: "Harpreet Singh",
      shop: "Singh Auto Spares & Bearings",
      city: "Ludhiana, Punjab",
      quote:
        "Managing credit (udhar) was our biggest headache. The 1-click WhatsApp payment reminders with UPI QR codes helped us recover over ₹1.8 Lakhs in overdue customer payments in the first month alone.",
      highlight: "Recovered ₹1.8L in overdue customer credit",
      rating: 5,
    },
    {
      name: "Deepak Patel",
      shop: "Patel Electricals & Hardware",
      city: "Ahmedabad, Gujarat",
      quote:
        "My accountant used to take 3 days every month to file GSTR-1. Now I simply click 'Export Excel' and send him the exact slab breakdown. The 100% offline feature gives complete peace of mind.",
      highlight: "1-Click GSTR-1 Excel export for CA",
      rating: 5,
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-muted/15 border-b border-border/60">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 mb-3">
            <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
            <span>Real Merchant Stories</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground mb-3">
            Trusted by Businesses of All Types Across India
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            From retail stores and wholesale distributors to factories and service agencies, see how Indian businesses run with RupeeBill.
          </p>
        </div>


        {/* 3 Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-7 rounded-3xl border border-border bg-card shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all text-left group"
            >
              <div>
                {/* 5 Stars */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-xs font-bold text-muted-foreground ml-2">5.0 Verified</span>
                </div>

                <Quote className="w-8 h-8 text-primary/20 mb-2" />

                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed mb-4">
                  "{t.quote}"
                </p>
              </div>

              <div className="pt-4 border-t border-border/70 space-y-2">
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>{t.highlight}</span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {t.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-foreground">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      <span>{t.shop}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{t.city}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
