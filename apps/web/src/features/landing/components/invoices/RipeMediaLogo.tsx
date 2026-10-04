import React from "react";

interface RipeMediaLogoProps {
  className?: string;
}

export const RipeMediaLogo: React.FC<RipeMediaLogoProps> = ({ className = "w-14 h-14" }) => (
  <div className={`bg-white rounded-lg p-1 shadow-xs flex flex-col items-center justify-center shrink-0 border border-slate-200/60 ${className}`}>
    <svg viewBox="0 0 44 32" className="w-10 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Yellow base circle */}
      <circle cx="22" cy="16" r="14" fill="#FACC15" />
      {/* Light green dynamic leaf swoosh */}
      <path
        d="M10 26C12 14 20 8 32 10C24 16 20 23 10 26Z"
        fill="#84CC16"
      />
      {/* Darker green accent swoop */}
      <path
        d="M13 27C15 18 21 13 29 14C23 20 19 25 13 27Z"
        fill="#4D7C0F"
      />
    </svg>
    <span className="text-[7.5px] font-black text-lime-700 tracking-tight leading-none mt-0.5 select-none font-sans">
      Ripe Media
    </span>
  </div>
);
