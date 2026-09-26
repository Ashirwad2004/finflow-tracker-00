import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Phone, Mail, MessageCircle, Clock, Headphones } from "lucide-react";
import { Logo } from "@/components/shared/Logo";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-muted/30 border-t border-border/60 py-14 text-xs text-muted-foreground">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* Support Banner Card */}
        <div className="mb-12 p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-foreground">
                Need Help or Have Any Query?
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Our support team is ready to assist you with onboarding, data import, hardware setup, or billing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
            <a
              href="tel:8102545007"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted/80 hover:bg-muted text-foreground border border-border text-xs font-bold transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-500" />
              <span>+91 8102545007</span>
            </a>
            <a
              href="https://wa.me/918102545007?text=Hi%20RupeeBill%20Support,%20I%20have%20a%20query%20about%20the%20application"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 text-xs font-bold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Us</span>
            </a>
            <a
              href="mailto:supportrupeebill@gmail.com"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>supportrupeebill@gmail.com</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Company Column */}
          <div className="col-span-2">
            <Logo size={28} showText={true} />
            <p className="text-xs text-muted-foreground mt-3 max-w-sm leading-relaxed">
              Complete invoicing, POS, inventory, and business management software. Built for retail storefronts, wholesale distributors, service agencies, and growing modern businesses.
            </p>
            <div className="flex items-center gap-2 mt-4 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Safe &amp; Encrypted · All Data Saved on Your Device</span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground mb-3">Product</h4>
            <ul className="space-y-2">
              <li><a href="#billing" className="hover:text-foreground transition-colors">Invoicing &amp; POS</a></li>
              <li><a href="#inventory" className="hover:text-foreground transition-colors">Inventory &amp; Barcodes</a></li>
              <li><a href="#parties" className="hover:text-foreground transition-colors">Customer Ledgers</a></li>
              <li><a href="#reports" className="hover:text-foreground transition-colors">Financial Reports</a></li>
              <li><a href="#preview" className="hover:text-foreground transition-colors">Online Storefront</a></li>
            </ul>
          </div>

          {/* Legal & Account */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground mb-3">Legal &amp; Terms</h4>
            <ul className="space-y-2">
              <li><Link to="/pricing" className="hover:text-foreground transition-colors">Commercial Licensing</Link></li>
              <li><a href="#faq" className="hover:text-foreground transition-colors">Questions &amp; Answers</a></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Direct Support Column */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground mb-3">Customer Support</h4>
            <ul className="space-y-2.5 text-[11px]">
              <li>
                <span className="text-muted-foreground block text-[10px]">Helpline &amp; WhatsApp:</span>
                <a href="tel:8102545007" className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3 h-3 text-emerald-500" /> +91 8102545007
                </a>
              </li>
              <li>
                <span className="text-muted-foreground block text-[10px]">Email Queries:</span>
                <a href="mailto:supportrupeebill@gmail.com" className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5 mt-0.5 break-all">
                  <Mail className="w-3 h-3 text-primary" /> supportrupeebill@gmail.com
                </a>
              </li>
              <li className="pt-1 flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3 h-3 text-amber-500" />
                <span>Mon – Sun, 9 AM – 9 PM IST</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div>
            &copy; {new Date().getFullYear()} RupeeBill Technologies. Built with pride for modern business owners.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">Support: <a href="mailto:supportrupeebill@gmail.com" className="text-foreground hover:underline">supportrupeebill@gmail.com</a></span>
            <span>·</span>
            <span className="text-muted-foreground">Helpline: <a href="tel:8102545007" className="text-foreground hover:underline">+91 8102545007</a></span>
          </div>
        </div>
      </div>
    </footer>
  );
};

