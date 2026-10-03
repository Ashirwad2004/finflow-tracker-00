import { z } from "zod";

export const reportPeriodPresetSchema = z.enum([
  "today",
  "yesterday",
  "this_week",
  "this_month",
  "last_month",
  "q1",
  "q2",
  "q3",
  "q4",
  "this_fy",
  "last_fy",
  "all",
  "custom",
]);

export const reportFilterSchema = z.object({
  preset: reportPeriodPresetSchema.default("this_month"),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  partyId: z.string().optional(),
  searchQuery: z.string().optional().default(""),
});

export type ReportFilterFormData = z.infer<typeof reportFilterSchema>;

export const exportReportSchema = z.object({
  reportId: z.string().min(1, "Report ID is required"),
  format: z.enum(["csv", "pdf", "print", "excel"]),
  title: z.string().min(1, "Report title is required"),
  includeSummary: z.boolean().default(true),
});

export type ExportReportFormData = z.infer<typeof exportReportSchema>;
