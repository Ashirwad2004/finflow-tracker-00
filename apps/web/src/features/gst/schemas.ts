import { z } from "zod";

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((val) => val === "" || GSTIN_REGEX.test(val), {
    message: "Invalid GSTIN format. Expected 15 characters (e.g., 27ABCDE1234F1Z5)",
  });

export const gstPeriodSchema = z.object({
  year: z.number().int().min(2020).max(2050),
  month: z.number().int().min(1).max(12),
  filingType: z.enum(["gstr1", "gstr2b", "gstr3b", "gstr9"]).default("gstr1"),
});

export type GstPeriodFormData = z.infer<typeof gstPeriodSchema>;
