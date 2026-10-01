import { z } from "zod";

export const partySchema = z.object({
  name: z.string().min(1, "Party name is required"),
  type: z.enum(["customer", "vendor", "both"]).default("customer"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  opening_balance: z.number().default(0),
  opening_balance_type: z.enum(["to_receive", "to_pay"]).default("to_receive"),
  credit_limit: z.number().min(0).optional(),
  payment_terms_days: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export type PartySchema = z.infer<typeof partySchema>;
