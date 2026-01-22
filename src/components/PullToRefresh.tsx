import React, { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export const PullToRefresh = ({ onRefresh, children, className }: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isDragging = useRef(false);
  
  const y = useMotionValue(0);
  const pullProgress = useTransform(y, [0, PULL_THRESHOLD], [0, 1]);
  const rotation = useTransform(y, [0, PULL_THRESHOLD], [0, 180]);
  const opacity = useTransform(y, [0, 30, PULL_THRESHOLD], [0, 0.5, 1]);
  const scale = useTransform(y, [0, PULL_THRESHOLD], [0.5, 1]);

  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false;
    // Check if we're at the top of the scrollable area
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    return scrollTop <= 0;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing || !isAtTop()) return;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, [isRefreshing, isAtTop]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || isRefreshing || !isAtTop()) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Apply resistance to make it feel more natural
      const resistance = Math.min(diff * 0.5, MAX_PULL);
      y.set(resistance);
    }
  }, [isRefreshing, y, isAtTop]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const currentY = y.get();
    
    if (currentY >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(y, 0, { type: "spring", stiffness: 400, damping: 30 });
      }
    } else {
      animate(y, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  }, [y, onRefresh, isRefreshing]);

  return (
    <div 
      ref={containerRef}
      className={cn("relative touch-pan-y", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center justify-center"
        style={{ 
          y: useTransform(y, (value) => Math.max(value - 40, -40)),
          opacity 
        }}
      >
        <motion.div 
          className={cn(
            "p-3 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 shadow-lg",
            isRefreshing && "bg-primary/20"
          )}
          style={{ scale }}
        >
          <motion.div
            style={{ rotate: isRefreshing ? undefined : rotation }}
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
          >
            <RefreshCw className="w-5 h-5 text-primary" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div style={{ y: isRefreshing ? 50 : y }}>
        {children}
      </motion.div>
    </div>
  );
};
