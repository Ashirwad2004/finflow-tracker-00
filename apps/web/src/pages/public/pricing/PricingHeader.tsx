import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { ArrowLeft } from "lucide-react";

interface PricingHeaderProps {
  user: User | null;
}

export const PricingHeader: React.FC<PricingHeaderProps> = ({ user }) => {
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50 transition-colors duration-200">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Logo size={32} showText />
          </Link>
          <Badge
            variant="outline"
            className="hidden sm:inline-flex bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full"
          >
            RupeeBill Pro
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {user ? (
            <Button
              onClick={() => navigate("/business-dashboard")}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Back to</span> Dashboard
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/auth")}
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-muted rounded-xl"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
