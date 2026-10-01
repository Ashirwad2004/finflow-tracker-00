import React, { useId } from "react";

interface LogoProps {
  size?: number;
  showText?: boolean;
  theme?: "light" | "dark" | "default";
}

export function Logo({ size = 32, showText = false, theme = "default" }: LogoProps) {
  const id = useId().replace(/:/g, ""); // strip colons for valid SVG IDs
  
  // Icon portion of the logo
  const iconSvg = (
    <svg width={size} height={size} viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <defs>
        <linearGradient id={`tile-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a1f2e" />
          <stop offset="100%" stopColor="#111622" />
        </linearGradient>
        <linearGradient id={`gold-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f542e9ff" />
          <stop offset="100%" stopColor="#5d10c9ff" />
        </linearGradient>
        <linearGradient id={`bar1-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade9a" />
          <stop offset="100%" stopColor="#16a96b" />
        </linearGradient>
        <linearGradient id={`bar2-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id={`bar3-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f542daff" />
          <stop offset="100%" stopColor="#ba10c9ff" />
        </linearGradient>
        <filter id={`glow-${id}`}>
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Rounded square tile */}
      <rect width="280" height="280" rx="64" fill={`url(#tile-${id})`} />

      {/* Subtle inner ring */}
      <rect x="1" y="1" width="278" height="278" rx="63" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />

      {/* Rupee symbol */}
      <rect x="86" y="62" width="22" height="148" rx="4" fill={`url(#gold-${id})`} filter={`url(#glow-${id})`} />
      <rect x="86" y="62" width="108" height="22" rx="4" fill={`url(#gold-${id})`} />
      <rect x="86" y="100" width="90" height="18" rx="4" fill={`url(#gold-${id})`} />
      
      <line
        x1="176"
        y1="118"
        x2="212"
        y2="210"
        stroke={`url(#gold-${id})`}
        strokeWidth="22"
        strokeLinecap="round"
      />

      {/* Ascending bar-chart bars */}
      <rect x="128" y="172" width="20" height="38" rx="5" fill={`url(#bar1-${id})`} opacity="0.92" />
      <rect x="154" y="152" width="20" height="58" rx="5" fill={`url(#bar2-${id})`} opacity="0.92" />
      <rect x="180" y="128" width="20" height="82" rx="5" fill={`url(#bar3-${id})`} opacity="0.92" />

      {/* Baseline */}
      <rect x="122" y="210" width="84" height="3" rx="1.5" fill="rgba(255,255,255,0.15)" />

      {/* Labels inside bars (only visible at larger sizes) */}
      {size >= 64 && (
        <>
          <text x="138" y="205" fontSize="8" fontWeight="700" fill="rgba(0,0,0,0.6)" textAnchor="middle" fontFamily="system-ui">10</text>
          <text x="164" y="205" fontSize="8" fontWeight="700" fill="rgba(0,0,0,0.6)" textAnchor="middle" fontFamily="system-ui">50</text>
          <text x="190" y="205" fontSize="7.5" fontWeight="700" fill="rgba(0,0,0,0.6)" textAnchor="middle" fontFamily="system-ui">500</text>
        </>
      )}
    </svg>
  );

  if (!showText) {
    return iconSvg;
  }

  // Determine text colors based on theme
  const rupeeColor = "#9b42f5ff";
  const billColor = "#4ade9a";
  const textClassName = theme === "dark" 
    ? "text-white" 
    : theme === "light" 
      ? "text-slate-900" 
      : "text-foreground";

  return (
    <div className="flex items-center gap-2 select-none">
      {iconSvg}
      <div className="flex flex-col text-left leading-none">
        <div className="flex items-baseline font-black tracking-tight" style={{ fontSize: `${size * 0.75}px` }}>
          <span style={{ color: rupeeColor }}>₹</span>
          <span className={textClassName}>upee</span>
          <span style={{ color: billColor }} className="font-light">Bill</span>
        </div>
        <div 
          className="text-muted-foreground uppercase font-semibold"
          style={{ 
            fontSize: `${size * 0.22}px`, 
            letterSpacing: "0.28em",
            marginTop: `${size * 0.08}px`
          }}
        >
          Finance &amp; Billing
        </div>
      </div>
    </div>
  );
}
