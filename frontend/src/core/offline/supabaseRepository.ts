/**
 * SupabaseRepository
 *
 * Direct interface to remote Supabase Database tables.
 * Used by OfflineRepository when online and by SyncService during background sync.
 */

import { supabase } from "@/core/integrations/supabase/client";

class SupabaseRepository {
  /**
   * Fetches all records for a given user from a Supabase table.
   */
  async fetch<T = any>(table: string, userId: string): Promise<T[]> {
    const keyColumn = table === 'profiles' ? 'user_id' : 'user_id';
    const { data, error } = await (supabase as any)
      .from(table)
      .select('*')
      .eq(keyColumn, userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Performs an upsert operation against a Supabase table.
   */
  async upsert(table: string, record: any): Promise<any> {
    const keyColumn = table === 'profiles' ? 'user_id' : 'id';
    const { data, error } = await (supabase as any)
      .from(table)
      .upsert({ ...record, [keyColumn]: record.id || record.user_id })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Updates an existing record in a Supabase table.
   */
  async update(table: string, recordId: string, payload: any): Promise<any> {
    const keyColumn = table === 'profiles' ? 'user_id' : 'id';
    const { data, error } = await (supabase as any)
      .from(table)
      .update(payload)
      .eq(keyColumn, recordId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Deletes a record from a Supabase table.
   */
  async delete(table: string, recordId: string): Promise<void> {
    const keyColumn = table === 'profiles' ? 'user_id' : 'id';
    const { error } = await (supabase as any)
      .from(table)
      .delete()
      .eq(keyColumn, recordId);

    if (error) throw error;
  }
}

export const supabaseRepository = new SupabaseRepository();
