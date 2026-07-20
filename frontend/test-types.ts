import { supabase } from './src/core/integrations/supabase/client';
const test = async () => {
    await supabase.from('event_queue').insert({ event_type: "generate_pdf", payload: {} });
};
