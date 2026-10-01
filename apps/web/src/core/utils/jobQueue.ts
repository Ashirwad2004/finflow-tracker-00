import { supabase } from "@/core/integrations/supabase/client";

export type EventType = "generate_pdf" | "send_bulk_email";
export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface JobEvent {
    id: string;
    event_type: EventType;
    payload: any;
    status: JobStatus;
    error_log?: string;
    created_at: string;
}

/**
 * Dispatches a background job to the event_queue.
 * This triggers the pg_net database webhook which invokes the event-worker Edge Function.
 */
export const dispatchJob = async (eventType: EventType, payload: any): Promise<string> => {
    const { data: user } = await supabase.auth.getUser();
    
    // Inject user_id for RLS policies
    const enrichedPayload = {
        ...payload,
        user_id: user?.user?.id
    };

    const { data, error } = await (supabase as any)
        .from('event_queue')
        .insert({
            event_type: eventType,
            payload: enrichedPayload
        })
        .select('id')
        .single();

    if (error) {
        console.error("Failed to dispatch job:", error);
        throw new Error("Failed to start background task");
    }

    return data.id;
};

/**
 * Subscribes to realtime updates for a specific background job.
 * Useful for showing a progress bar or spinner in the UI while the Edge Function processes.
 */
export const subscribeToJob = (jobId: string, onUpdate: (job: JobEvent) => void) => {
    return supabase
        .channel(`job-${jobId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'event_queue',
                filter: `id=eq.${jobId}`
            },
            (payload) => {
                onUpdate(payload.new as JobEvent);
            }
        )
        .subscribe();
};