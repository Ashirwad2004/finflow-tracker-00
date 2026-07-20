import { createClient } from '@supabase/supabase-js';
import type { Database } from './frontend/src/core/integrations/supabase/types';

const supabase = createClient<Database>('https://xyz.supabase.co', 'xyz');

async function test() {
    const x = await supabase.from('event_queue').insert({ event_type: "generate_pdf", payload: {} }).select('id').single();
}
