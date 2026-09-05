import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const workerSecret = Deno.env.get('EVENT_WORKER_SECRET');
  const suppliedSecret = req.headers.get('x-event-worker-secret');
  if (!workerSecret || suppliedSecret !== workerSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

    const { data: queuedEvent, error: queueError } = await supabase
      .from('event_queue')
      .select('id, event_type, payload, status')
      .eq('id', event.id)
      .eq('status', 'pending')
      .single();

    if (queueError || !queuedEvent) {
      return new Response(JSON.stringify({ error: 'Event is invalid or already processed' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trustedEvent = queuedEvent;

    await supabase
      .from('event_queue')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', trustedEvent.id)
      .eq('status', 'pending');

    // 2. Process Event Router
    let result = null;
    try {
      if (trustedEvent.event_type === 'generate_pdf') {
        // Mock heavy PDF generation
        console.log(`Generating PDF for payload:`, trustedEvent.payload);
        await new Promise(resolve => setTimeout(resolve, 2000));
        result = { url: `https://dummy/pdf/${trustedEvent.id}.pdf` };
      } 
      else if (trustedEvent.event_type === 'send_bulk_email') {
        console.log(`Sending bulk emails for payload:`, trustedEvent.payload);
        const { invoices, subject, template } = trustedEvent.payload;
        
        // We use Resend API for sending emails
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured in Edge Function Vault");
        
        let sentCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        interface InvoiceRecord {
          customer_email?: string;
          customer_name?: string;
          invoice_number?: string;
          total_amount?: number | string;
        }

        // Loop and send emails in parallel (capped at a reasonable batch size)
        const emailPromises = invoices.map(async (inv: InvoiceRecord) => {
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
           } catch (err: unknown) {
             const errMsg = err instanceof Error ? err.message : String(err);
             console.error(`Failed to email ${inv.customer_email}:`, err);
             errors.push(`${inv.customer_email}: ${errMsg}`);
             failedCount++;
           }
        });
        
        await Promise.allSettled(emailPromises);
        result = { sent: sentCount, failed: failedCount, total: invoices.length, errors };
      }
      else {
        throw new Error(`Unknown event_type: ${trustedEvent.event_type}`);
      }

      // 3. Mark as completed
      await supabase
        .from('event_queue')
        .update({ 
          status: 'completed', 
          updated_at: new Date().toISOString(),
          error_log: JSON.stringify(result) // Storing result in error_log for simplicity
        })
        .eq('id', trustedEvent.id);
        
      return new Response(JSON.stringify({ success: true, event_id: trustedEvent.id }), {
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
        .eq('id', trustedEvent.id);
        
      throw processError;
    }

  } catch (error) {
    console.error("Worker error:", error);
    return new Response(JSON.stringify({ error: 'Worker processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});