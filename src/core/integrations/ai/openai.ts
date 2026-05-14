import { supabase } from "@/core/integrations/supabase/client";

/**
 * Basic raw fetch interface to OpenAI chat completions via Supabase Edge Functions.
 * This avoids pulling in the massive Node.js SDK and secures the API Key.
 */
export async function callOpenAI(messages: any[], model: string = "gpt-4o-mini", responseFormat?: any) {
    const payload: any = {
        model,
        messages,
        temperature: 0.1, // Low temperature for deterministic financial data parsing
    };

    if (responseFormat) {
        payload.response_format = responseFormat;
    }

    // Call the secure Supabase Edge Function proxy
    const { data, error } = await supabase.functions.invoke('openai-proxy', {
        body: payload
    });

    if (error) {
        console.error("OpenAI Proxy Error:", error);
        throw new Error(error.message || "Failed to communicate with AI proxy.");
    }

    if (data?.error) {
        throw new Error(data.error);
    }

    return data.choices[0].message.content;
}
