import React, { useState, useEffect } from 'react';
import { supabase } from '@/core/integrations/supabase/client';
import { useAuth } from '@/core/lib/auth';
import { Button } from '@/components/ui/button';

export const EventWorkerDemo: React.FC = () => {
  const { user } = useAuth();
  const [queueId, setQueueId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!queueId) return;

    console.log(`Subscribing to event_queue id=${queueId}`);
    
    // Subscribe to realtime updates for this specific queue item
    const channel = supabase
      .channel(`queue_updates_${queueId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_queue',
          filter: `id=eq.${queueId}`
        },
        (payload) => {
          console.log("Realtime queue update received!", payload);
          const newStatus = payload.new.status;
          setStatus(newStatus);
          
          if (newStatus === 'completed' || newStatus === 'failed') {
            setResult(payload.new.error_log || 'Success');
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queueId]);

  const triggerTask = async () => {
    if (!user) return;
    
    setStatus('pending');
    setResult(null);
    setQueueId(null);
    
    const { data, error } = await supabase
      .from('event_queue')
      .insert({
        event_type: 'generate_pdf',
        payload: { user_id: user.id, timestamp: new Date().toISOString() },
        status: 'pending'
      })
      .select('id')
      .single();
      
    if (error) {
      console.error("Failed to insert event", error);
      setStatus('error: ' + error.message);
      return;
    }
    
    setQueueId(data.id);
  };

  return (
    <div className="p-4 border rounded-md bg-white/5 shadow-sm space-y-4">
      <h3 className="font-semibold text-lg">Background Task Queue Demo</h3>
      <p className="text-sm text-gray-500">
        Tests the asynchronous pg_net webhooks by enqueuing a PDF generation task.
      </p>
      
      <div className="flex items-center space-x-4">
        <Button 
          onClick={triggerTask} 
          disabled={status === 'pending' || status === 'processing'}
        >
          {status === 'pending' || status === 'processing' ? 'Running...' : 'Trigger Background Task'}
        </Button>
        
        <span className="font-mono text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">
          Status: <span className={`font-bold ${status === 'completed' ? 'text-green-500' : status === 'failed' ? 'text-red-500' : 'text-blue-500'}`}>{status}</span>
        </span>
      </div>
      
      {result && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded border font-mono text-xs overflow-auto max-h-32">
          {result}
        </div>
      )}
    </div>
  );
};