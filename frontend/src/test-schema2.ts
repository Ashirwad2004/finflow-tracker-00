import { Database } from '@/core/integrations/supabase/types';

type MyGenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: any[];
};

type x1 = Database['public']['Tables'] extends Record<string, MyGenericTable> ? true : false;
let res1: x1 = true;