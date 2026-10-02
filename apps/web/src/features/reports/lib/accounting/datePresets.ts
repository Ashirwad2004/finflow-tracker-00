import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";

export type DatePeriodPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "this_fy"
  | "last_fy"
  | "all"
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  preset: DatePeriodPreset;
}

export function getDateRangeFromPreset(
  preset: DatePeriodPreset,
  customFrom?: Date,
  customTo?: Date
): { from: Date; to: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr

  // Indian Financial Year calculation (1st April to 31st March)
  const fyStartYear = month >= 3 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;

  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    }
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "this_month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "last_month": {
      const prevMonth = subMonths(now, 1);
      return { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
    }
    case "q1":
      return { from: startOfDay(new Date(fyStartYear, 3, 1)), to: endOfDay(new Date(fyStartYear, 5, 30)) };
    case "q2":
      return { from: startOfDay(new Date(fyStartYear, 6, 1)), to: endOfDay(new Date(fyStartYear, 8, 30)) };
    case "q3":
      return { from: startOfDay(new Date(fyStartYear, 9, 1)), to: endOfDay(new Date(fyStartYear, 11, 31)) };
    case "q4":
      return { from: startOfDay(new Date(fyEndYear, 0, 1)), to: endOfDay(new Date(fyEndYear, 2, 31)) };
    case "this_fy":
      return { from: startOfDay(new Date(fyStartYear, 3, 1)), to: endOfDay(new Date(fyEndYear, 2, 31)) };
    case "last_fy":
      return { from: startOfDay(new Date(fyStartYear - 1, 3, 1)), to: endOfDay(new Date(fyStartYear, 2, 31)) };
    case "custom":
      return {
        from: customFrom ? startOfDay(customFrom) : startOfMonth(now),
        to: customTo ? endOfDay(customTo) : endOfDay(now),
      };
    case "all":
    default:
      return { from: new Date(2020, 0, 1), to: endOfDay(now) };
  }
}
