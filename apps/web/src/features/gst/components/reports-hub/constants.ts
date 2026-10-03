import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { GstStateOption, GstPeriod } from "./types";

// Indian States with 2-digit GST codes
export const INDIAN_GST_STATES: GstStateOption[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
];

export const getDynamicGstPeriods = (refDate: Date = new Date()): GstPeriod[] => {
  const m0 = refDate;
  const m1 = subMonths(refDate, 1);
  const m2 = subMonths(refDate, 2);
  const m3 = subMonths(refDate, 3);

  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const fyStartYear = month >= 3 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;

  return [
    { label: `${format(m0, "MMMM yyyy")} (Current)`, from: startOfMonth(m0), to: endOfMonth(m0) },
    { label: format(m1, "MMMM yyyy"), from: startOfMonth(m1), to: endOfMonth(m1) },
    { label: format(m2, "MMMM yyyy"), from: startOfMonth(m2), to: endOfMonth(m2) },
    { label: format(m3, "MMMM yyyy"), from: startOfMonth(m3), to: endOfMonth(m3) },
    {
      label: `Q2 FY ${fyStartYear}-${String(fyEndYear).slice(-2)} (Jul–Sep)`,
      from: new Date(fyStartYear, 6, 1),
      to: new Date(fyStartYear, 8, 30),
    },
    {
      label: `Q1 FY ${fyStartYear}-${String(fyEndYear).slice(-2)} (Apr–Jun)`,
      from: new Date(fyStartYear, 3, 1),
      to: new Date(fyStartYear, 5, 30),
    },
    {
      label: `Full FY ${fyStartYear}-${String(fyEndYear).slice(-2)}`,
      from: new Date(fyStartYear, 3, 1),
      to: new Date(fyEndYear, 2, 31),
    },
    {
      label: `Full FY ${fyStartYear - 1}-${String(fyStartYear).slice(-2)} (Previous)`,
      from: new Date(fyStartYear - 1, 3, 1),
      to: new Date(fyStartYear, 2, 31),
    },
  ];
};
