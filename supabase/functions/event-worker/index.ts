import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    // The payload comes from pg_net in the shape: { "record": { "id": "...", "event_type": "...", "payload": {...} } }
    const event = payload?.record;
    
    if (!event || !event.id) {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase Client (Service Role for updating queue status)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Mark as processing
    await supabase
      .from('event_queue')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', event.id);

    // 2. Process Event Router
    let result = null;
    try {
      if (event.event_type === 'generate_pdf') {
        // Mock heavy PDF generation
        console.log(`Generating PDF for payload:`, event.payload);
        await new Promise(resolve => setTimeout(resolve, 2000));
        result = { url: `https://dummy/pdf/${event.id}.pdf` };
      } 
      else if (event.event_type === 'send_bulk_email') {
        console.log(`Sending bulk emails for payload:`, event.payload);
        const { invoices, subject, template } = event.payload;
        
        // We use Resend API for sending emails
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured in Edge Function Vault");
        
        let sentCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        // Loop and send emails in parallel (capped at a reasonable batch size)
        const emailPromises = invoices.map(async (inv: any) => {
           if (!inv.customer_email) return;
           try {
             const res = await fetch('https://api.resend.com/emails', {
               method: 'POST',
               headers: {
                 'Authorization': `Bearer ${resendApiKey}`,
                 'Content-Type': 'application/json'
               },
               body: JSON.stringify({
                 from: 'FinFlow Billing <billing@finflow.com>', // Assuming verified domain
                 to: inv.customer_email,
                 subject: subject || `Invoice Reminder: ${inv.invoice_number}`,
                 html: template || `<p>Hi ${inv.customer_name},</p><p>This is a reminder for Invoice ${inv.invoice_number} for amount ${inv.total_amount}.</p>`
               })
             });
             
             if (!res.ok) {
               const errText = await res.text();
               throw new Error(`Resend API Error: ${errText}`);
             }
             sentCount++;
           } catch (err: any) {
             console.error(`Failed to email ${inv.customer_email}:`, err);
             errors.push(`${inv.customer_email}: ${err.message || err}`);
             failedCount++;
           }
        });
        
        await Promise.allSettled(emailPromises);
        result = { sent: sentCount, failed: failedCount, total: invoices.length, errors };
      }
      else {
        throw new Error(`Unknown event_type: ${event.event_type}`);
      }

      // 3. Mark as completed
      await supabase
        .from('event_queue')
        .update({ 
          status: 'completed', 
          updated_at: new Date().toISOString(),
          error_log: JSON.stringify(result) // Storing result in error_log for simplicity
        })
        .eq('id', event.id);
        
      return new Response(JSON.stringify({ success: true, event_id: event.id }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (processError) {
      // 4. Mark as failed
      await supabase
        .from('event_queue')
        .update({ 
          status: 'failed', 
          error_log: processError instanceof Error ? processError.message : 'Unknown error',
          updated_at: new Date().toISOString() 
        })
        .eq('id', event.id);
        
      throw processError;
    }

  } catch (error) {
    console.error("Worker error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});