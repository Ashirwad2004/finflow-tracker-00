import { Database } from '@/core/integrations/supabase/types';
import { GenericSchema } from '@supabase/supabase-js/dist/module/lib/types';
// Actually wait, GenericSchema is in @supabase/supabase-js but not exported directly sometimes.
import { SupabaseClient } from '@supabase/supabase-js';

// The second generic of SupabaseClient requires SchemaName extends string & keyof Database.
type S = SupabaseClient<Database, "public">;
