import React from "react";
import { Link } from "react-router-dom";

export const PricingFooter: React.FC = () => {
  return (
    <footer className="border-t border-border bg-card/50 py-6 text-center text-xs text-muted-foreground transition-colors duration-200">
      <div className="container mx-auto px-6 space-y-1">
        <p>© 2026 RupeeBill. Official Software License &amp; Payment Portal.</p>
        <div className="flex flex-wrap justify-center items-center gap-3 text-muted-foreground text-[11px] pt-1">
          <span>
            Support:{" "}
            <a href="mailto:supportrupeebill@gmail.com" className="text-foreground hover:underline">
              supportrupeebill@gmail.com
            </a>
          </span>
          <span>•</span>
          <span>
            Helpline:{" "}
            <a href="tel:8102545007" className="text-foreground hover:underline">
              +91 8102545007
            </a>
          </span>
          <span>•</span>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link to="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
};
