/**
 * @deprecated features/business has been decomposed into domain feature slices:
 * - @/features/sales
 * - @/features/purchases
 * - @/features/parties
 * - @/features/banking
 * - @/features/gst
 * - @/features/payments
 * - @/features/reports
 * - @/features/inventory
 * - @/features/loyalty
 * - @/features/print-studio
 * - @/features/storefront
 */

export { formatDateSafe } from "@/features/sales";
export { GSTIN_REGEX } from "@/features/parties";
export type { PaymentMode } from "@/features/banking";

export * from "@/features/sales";
export * from "@/features/purchases";
export * from "@/features/parties";
export * from "@/features/banking";
export * from "@/features/gst";
export * from "@/features/payments";
export * from "@/features/reports";
export * from "@/features/inventory";
