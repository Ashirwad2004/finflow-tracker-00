import { supabase } from '@/core/integrations/supabase/client';

async function test() {
    const x = await supabase.from('event_queue').insert({ event_type: "generate_pdf", payload: {} }).select('id').single();
}