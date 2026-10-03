// Standard statutory GST slabs in India
export const GST_SLABS = [
  { rate: 0, label: "0% (Exempt)", description: "Unbranded essentials, fresh food" },
  { rate: 5, label: "5% (Essential)", description: "Household items, packaged food, coal" },
  { rate: 12, label: "12% (Standard I)", description: "Processed food, apparel > ₹1k, computers" },
  { rate: 18, label: "18% (Standard II)", description: "Services, electronics, industrial (Default)" },
  { rate: 28, label: "28% (Demerit/Luxury)", description: "Luxury cars, tobacco, cement, gaming" },
];

export const SPECIAL_SLABS = [
  { rate: 0.25, label: "0.25% (Diamonds)", description: "Cut & polished diamonds" },
  { rate: 3, label: "3% (Precious Metals)", description: "Gold, silver, platinum jewellery" },
];

// Helper to format currency in Indian system (en-IN)
export const formatINR = (amount: number): string => {
  if (isNaN(amount) || !isFinite(amount)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Convert number to Indian words (Lakhs / Crores)
export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return "Zero Rupees";

  const absAmount = Math.abs(Math.round(amount));
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const convertTwoDigits = (num: number): string => {
    if (num === 0) return "";
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  };

  const convertThreeDigits = (num: number): string => {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    let res = "";
    if (hundred > 0) res += ones[hundred] + " Hundred";
    if (rest > 0) res += (res ? " " : "") + convertTwoDigits(rest);
    return res;
  };

  const crore = Math.floor(absAmount / 10000000);
  let remainder = absAmount % 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  const hundredAndBelow = remainder;

  const parts: string[] = [];
  if (crore > 0) parts.push(convertThreeDigits(crore) + " Crore");
  if (lakh > 0) parts.push(convertThreeDigits(lakh) + " Lakh");
  if (thousand > 0) parts.push(convertThreeDigits(thousand) + " Thousand");
  if (hundredAndBelow > 0) parts.push(convertThreeDigits(hundredAndBelow));

  return (parts.join(" ") || "Zero") + " Rupees Only";
}

export interface GSTCalculationHistory {
  id: string;
  timestamp: string;
  type: "exclusive" | "inclusive";
  baseAmount: number;
  rate: number;
  cess: number;
  totalTax: number;
  grossAmount: number;
  supplyType: "intra" | "inter";
}
