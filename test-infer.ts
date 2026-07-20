import type { Database } from './frontend/src/core/integrations/supabase/types';
type T = Database['public']['Tables']['event_queue']['Insert'];
const x: T = { event_type: 'a', payload: {} };
