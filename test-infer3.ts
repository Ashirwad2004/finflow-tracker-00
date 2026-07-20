import type { Database } from './frontend/src/core/integrations/supabase/types';

type K = keyof Database['public']['Tables'];

const check: K = "event_queue";
