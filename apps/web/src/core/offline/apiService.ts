import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "./sqliteService";
import { queueService } from "./queueService";

const TABLES_WITHOUT_UPDATED_AT = new Set([
  'parties',
  'categories',
  'purchases',
  'sales',
  'split_bill_participants',
  'group_expenses',
  'groups',
  'group_members',
  'online_orders',
  'sale_order_invoices',
  'sale_order_purchase_orders',
  'purchase_order_bills',
  'pos_return_items',
  'invoice_items',
  'order_status_events',
  'online_order_items',
  'bank_statement_lines',
  'whatsapp_messages',
]);

// Tables whose schema does NOT have a top-level `user_id` column
const TABLES_WITHOUT_USER_ID = new Set(['groups', 'online_orders']);

const PRODUCT_ALLOWED_COLUMNS = new Set([
  'id',
  'user_id',
  'name',
  'description',
  'price',
  'cost_price',
  'stock_quantity',
  'unit',
  'created_at',
  'updated_at',
  'min_stock_level',
  'is_listed_online',
  'online_description',
  'image_url',
  'rack_location',
  'hsn_code',
  'barcode',
  'barcode_type',
  'barcode_source',
  'sku',
  'category',
  'mrp',
  'tax_rate'
]);

export const sanitizePayload = (table: string, action: string, payload: any) => {
  if (!payload || typeof payload !== 'object') return payload;

  const clean = { ...payload };

  if (TABLES_WITHOUT_UPDATED_AT.has(table)) {
    delete clean.updated_at;
  }

  // Prevent PGRST204 errors: sales and purchases tables do not have address columns in schema cache
  if (table === 'sales' || table === 'purchases') {
    delete clean.billing_address;
    delete clean.shipping_address;
  }

  if (table === 'products') {
    const sanitizedProduct: Record<string, any> = {};

    for (const key of Object.keys(clean)) {
      if (PRODUCT_ALLOWED_COLUMNS.has(key)) {
        sanitizedProduct[key] = clean[key];
      }
    }

    const parseNumOrNull = (val: any) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    const parseNumOrDefault = (val: any, def: number) => {
      if (val === undefined || val === null || val === '') return def;
      const num = Number(val);
      return isNaN(num) ? def : num;
    };

    if ('price' in sanitizedProduct) {
      sanitizedProduct.price = parseNumOrDefault(sanitizedProduct.price, 0);
    }
    if ('cost_price' in sanitizedProduct) {
      sanitizedProduct.cost_price = parseNumOrNull(sanitizedProduct.cost_price);
    }
    if ('stock_quantity' in sanitizedProduct) {
      sanitizedProduct.stock_quantity = parseNumOrDefault(sanitizedProduct.stock_quantity, 0);
    }
    if ('mrp' in sanitizedProduct) {
      sanitizedProduct.mrp = parseNumOrNull(sanitizedProduct.mrp);
    }
    if ('tax_rate' in sanitizedProduct) {
      sanitizedProduct.tax_rate = parseNumOrDefault(sanitizedProduct.tax_rate, 0);
    }
    if ('min_stock_level' in sanitizedProduct) {
      sanitizedProduct.min_stock_level = parseNumOrDefault(sanitizedProduct.min_stock_level, 10);
    }
    if ('is_listed_online' in sanitizedProduct) {
      sanitizedProduct.is_listed_online = Boolean(sanitizedProduct.is_listed_online);
    }

    // Convert empty strings to null for nullable text columns
    const textColumns = ['online_description', 'image_url', 'rack_location', 'hsn_code', 'barcode', 'sku', 'category', 'description'];
    for (const col of textColumns) {
      if (col in sanitizedProduct && typeof sanitizedProduct[col] === 'string' && sanitizedProduct[col].trim() === '') {
        sanitizedProduct[col] = null;
      }
    }

    return sanitizedProduct;
  }

  return clean;
};

export interface OfflineMutateParams {
  table: string;
  action: 'insert' | 'update' | 'delete' | 'INSERT' | 'UPDATE' | 'DELETE';
  recordId?: string;
  payload?: any;
  data?: any;
  userId?: string;
}

export interface OfflineMutateResult {
  data: any;
  error: any;
  offline: boolean;
}

/**
 * An Offline-First wrapper around Supabase mutations.
 * Reads and writes update local storage immediately, queue offline tasks,
 * and synchronize with Supabase asynchronously.
 */
export const offlineMutate = async ({ table, action, recordId, payload, data, userId }: OfflineMutateParams): Promise<OfflineMutateResult> => {
  const normAction = action.toLowerCase() as 'insert' | 'update' | 'delete';
  const resolvedPayload = payload || data || {};
  const resolvedRecordId = recordId || resolvedPayload.id || '';
  const resolvedUserId = userId || resolvedPayload.user_id || '';

  const basePayload = {
    id: resolvedRecordId,
    // Only inject user_id for tables that actually have the column
    ...(!TABLES_WITHOUT_USER_ID.has(table) ? { user_id: resolvedUserId } : {}),
    ...(resolvedPayload || {})
  };

  if (!TABLES_WITHOUT_UPDATED_AT.has(table) && !basePayload.updated_at) {
    basePayload.updated_at = new Date().toISOString();
  }

  const cleanPayload = sanitizePayload(table, normAction, basePayload);

  // 1. Instant local SQLite/IndexedDB write
  if (normAction === 'delete') {
    await sqliteService.delete(resolvedRecordId);
  } else {
    await sqliteService.upsert(table, resolvedUserId, cleanPayload);
  }

  // 2. Perform live call if network is online
  const performLiveCall = async () => {
    const keyColumn = table === 'profiles' ? 'user_id' : 'id';
    if (normAction === 'insert') {
      const { data: resData, error } = await (supabase as any)
        .from(table)
        .upsert({ ...cleanPayload, [keyColumn]: resolvedRecordId })
        .select()
        .maybeSingle();
      if (error) throw error;
      return resData || cleanPayload;
    } else if (normAction === 'update') {
      const { data: resData, error } = await (supabase as any)
        .from(table)
        .update(cleanPayload)
        .eq(keyColumn, resolvedRecordId)
        .select()
        .maybeSingle();
      if (error) throw error;
      return resData || cleanPayload;
    } else if (normAction === 'delete') {
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq(keyColumn, resolvedRecordId);
      if (error) throw error;
      return { [keyColumn]: resolvedRecordId, deleted: true };
    }
  };

  if (navigator.onLine) {
    try {
      const result = await performLiveCall();
      if (result && normAction !== 'delete') {
        await sqliteService.upsert(table, resolvedUserId, result);
      }
      return { data: result || cleanPayload, error: null, offline: false };
    } catch (error: any) {
      console.error(`[offlineMutate] ${normAction} on ${table} failed:`, error?.message || error);
      // Postgrest schema errors (non-network drops)
      if (error && error.code) {
        throw error;
      }
      console.warn(`[Offline Sync] Live call failed, enqueueing to offline Queue:`, error?.message || error);
    }
  }

  // 3. Queue for offline background sync
  await queueService.enqueue(resolvedUserId, table, normAction, resolvedRecordId, cleanPayload);
  return { data: cleanPayload, error: null, offline: true };
};