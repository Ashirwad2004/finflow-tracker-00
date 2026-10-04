import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CustomHeroProps {
  onStartFree: () => void;
  onBookDemo: () => void;
  onSeeFeatures: () => void;
}

export const CustomHero: React.FC<CustomHeroProps> = ({
  onStartFree,
  onBookDemo,
  onSeeFeatures,
}) => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-background pt-16 pb-20 flex items-center">
      {/* Custom Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient orbs that follow cursor */}
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 transition-all duration-200 ease-out"
          style={{
            background: "linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)",
            left: `${mousePosition.x / 50 - 384 / 2}px`,
            top: `${mousePosition.y / 50 - 384 / 2}px`,
          }}
        />
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-15 transition-all duration-200 ease-out"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            right: `${-mousePosition.x / 60}px`,
            bottom: `${-mousePosition.y / 60}px`,
          }}
        />

        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,107,53,.05) 25%, rgba(255,107,53,.05) 26%, transparent 27%, transparent 74%, rgba(255,107,53,.05) 75%, rgba(255,107,53,.05) 76%, transparent 77%, transparent),
                            linear-gradient(90deg, transparent 24%, rgba(255,107,53,.05) 25%, rgba(255,107,53,.05) 26%, transparent 27%, transparent 74%, rgba(255,107,53,.05) 75%, rgba(255,107,53,.05) 76%, transparent 77%, transparent)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Content */}
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
            {/* Badge */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-orange-500/30 bg-orange-500/10 backdrop-blur-xl w-fit">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500 animate-pulse" />
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                  Fastest Growing Billing Platform
                </span>
              </div>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black leading-[1.05] tracking-tighter">
                <span className="block text-foreground">Stop Wasting Time</span>
                <span className="block bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
                  on Billing
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground/90 leading-relaxed font-medium max-w-lg">
                Create professional invoices in <span className="text-orange-500 font-bold">5 seconds</span>. Manage entire business in one place. <span className="text-foreground font-bold">100% free forever.</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                size="lg"
                onClick={onStartFree}
                className="group h-14 px-10 text-base font-bold bg-gradient-to-r from-orange-500 via-orange-550 to-orange-600 hover:from-orange-600 hover:via-orange-650 hover:to-orange-700 text-white border-0 shadow-2xl shadow-orange-500/40 hover:shadow-3xl hover:shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all duration-300 rounded-lg relative overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center gap-2">
                  Start Free Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={onBookDemo}
                className="h-14 px-8 text-base font-bold border-2 border-foreground/20 hover:border-orange-500/50 bg-background/50 hover:bg-orange-500/5 text-foreground transition-all duration-300 rounded-lg"
              >
                <TrendingUp className="w-5 h-5 mr-2 text-orange-500" />
                Live Demo
              </Button>
            </div>

            {/* Trust Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-border/20">
              <div>
                <p className="text-3xl font-black text-transparent bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text">15K+</p>
                <p className="text-xs text-muted-foreground mt-1">Active Businesses</p>
              </div>
              <div>
                <p className="text-3xl font-black text-emerald-500">4.8★</p>
                <p className="text-xs text-muted-foreground mt-1">User Rating</p>
              </div>
              <div>
                <p className="text-3xl font-black text-blue-500">0</p>
                <p className="text-xs text-muted-foreground mt-1">Cost Forever</p>
              </div>
            </div>
          </div>

          {/* Right Side - Interactive Demo */}
          <div className="relative h-96 lg:h-full animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
            {/* Animated Invoice Preview */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full max-w-sm h-96 perspective">
                {/* Floating card with rotation effect */}
                <div
                  className="absolute inset-0 rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/50 shadow-2xl overflow-hidden backdrop-blur-xl transition-transform duration-300 ease-out"
                  style={{
                    transform: `rotateY(${(mousePosition.x - window.innerWidth / 2) / 100}deg) rotateX(${-(mousePosition.y - window.innerHeight / 2) / 100}deg)`,
                    perspective: "1000px",
                  }}
                >
                  {/* Invoice Content Simulation */}
                  <div className="p-6 space-y-4 h-full flex flex-col">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-black text-orange-500">RupeeBill</h3>
                        <p className="text-xs text-muted-foreground">Invoice #001</p>
                      </div>
                      <div className="bg-gradient-to-r from-orange-500 to-red-500 h-12 w-12 rounded-lg animate-pulse" />
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Premium Package</span>
                        <span className="font-bold">₹5,000</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Support (1 year)</span>
                        <span className="font-bold">₹1,000</span>
                      </div>
                      <div className="h-px bg-border my-3" />
                      <div className="flex justify-between text-base font-black">
                        <span>Total</span>
                        <span className="text-orange-500">₹6,000</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button className="w-full py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold rounded-lg hover:shadow-lg transition-shadow">
                        Pay Now
                      </button>
                      <button className="w-full py-2 border border-border text-muted-foreground text-sm font-semibold rounded-lg hover:bg-muted/50 transition-colors">
                        Share via WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <p className="text-xs text-muted-foreground font-semibold">Scroll to explore</p>
          <div className="w-5 h-8 border-2 border-muted-foreground/30 rounded-full flex justify-center">
            <div className="w-1 h-2 bg-muted-foreground/30 rounded-full mt-1.5 animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  );
};
