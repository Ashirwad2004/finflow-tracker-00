import React from "react";

interface ShekharSignatureProps {
  className?: string;
}

export const ShekharSignature: React.FC<ShekharSignatureProps> = ({
  className = "h-10 w-28 text-slate-900",
}) => (
  <svg
    viewBox="0 0 140 45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Shekhar Authorized Signatory"
  >
    {/* Initial S curve with vertical flourish */}
    <path
      d="M 14 36 C 11 26, 15 8, 23 6 C 29 4, 29 16, 27 26 C 25 34, 23 41, 18 43"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* h and e flow */}
    <path
      d="M 26 18 C 33 16, 41 13, 44 20 C 46 25, 41 36, 46 36 C 49 36, 51 27, 55 25"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* k and h ascent */}
    <path
      d="M 55 25 C 59 23, 63 30, 67 30 C 71 30, 73 24, 77 24 C 81 24, 83 29, 87 29"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* a and r finish */}
    <path
      d="M 87 13 C 89 19, 89 31, 91 33 C 93 35, 98 22, 102 26 C 104 28, 102 35, 107 33"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M 107 33 C 111 31, 115 26, 119 26 C 122 26, 121 33, 126 33 C 130 33, 134 28, 138 28"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Underline flourish */}
    <path
      d="M 20 41 C 48 40, 85 41, 135 39"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);
