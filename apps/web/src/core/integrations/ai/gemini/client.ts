import { supabase } from "@/core/integrations/supabase/client";

export type AiMessage = {
    role: "system" | "user" | "assistant";
    content: any;
};

export type GeminiOptions = {
    model?: string;
    temperature?: number;
    responseFormat?: any;
    maxOutputTokens?: number;
};

export async function callGemini(messages: AiMessage[], options: GeminiOptions = {}) {
    // 1. Try FastAPI Backend Microservice first
    try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch("/api/v1/ai/completions", {
            method: "POST",
            headers,
            body: JSON.stringify({
                messages,
                model: options.model || "gemini-2.5-flash",
                temperature: options.temperature ?? 0.2,
                maxOutputTokens: options.maxOutputTokens,
                response_format: options.responseFormat,
                stream: false,
            }),
        });

        if (res.ok) {
            const data = await res.json();
            return data?.text || data?.choices?.[0]?.message?.content || "";
        }
        const errorText = await res.text().catch(() => "");
        console.warn(`FastAPI backend AI returned ${res.status}: ${errorText}. Falling back to edge proxy.`);
    } catch (err) {
        // Backend not reached or offline; gracefully fallback to Edge function
        console.warn("FastAPI backend AI unreachable, falling back to edge proxy:", err);
    }

    // 2. Fallback to Supabase Edge Function
    const { data, error } = await supabase.functions.invoke("gemini-proxy", {
        body: {
            messages,
            model: options.model || "gemini-2.5-flash",
            temperature: options.temperature ?? 0.2,
            response_format: options.responseFormat,
            maxOutputTokens: options.maxOutputTokens,
        },
    });

    if (error) {
        console.error("Gemini Proxy Error:", error);
        let details = "";
        const context = (error as any).context;
        if (context?.json) {
            try {
                const body = await context.json();
                details = body?.details || body?.error || body?.message || "";
            } catch {
                details = "";
            }
        }
        throw new Error(details || error.message || "Failed to communicate with Gemini.");
    }

    if (data?.error) {
        throw new Error(data.error);
    }

    return data?.text || data?.choices?.[0]?.message?.content || "";
}

export async function callGeminiStream(messages: AiMessage[], options: GeminiOptions = {}) {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    // 1. Try FastAPI Backend Microservice first
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch("/api/v1/ai/completions", {
            method: "POST",
            headers,
            body: JSON.stringify({
                messages,
                model: options.model || "gemini-2.5-flash",
                temperature: options.temperature ?? 0.25,
                maxOutputTokens: options.maxOutputTokens,
                response_format: options.responseFormat,
                stream: true,
            }),
        });

        if (res.ok) {
            return res;
        }
        const errorText = await res.text().catch(() => "");
        console.warn(`FastAPI stream returned ${res.status}: ${errorText}. Falling back to edge proxy.`);
    } catch (err) {
        console.warn("FastAPI stream unreachable, falling back to edge proxy:", err);
    }

    // 2. Fallback to Supabase Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/gemini-proxy`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
            messages,
            model: options.model || "gemini-2.5-flash",
            temperature: options.temperature ?? 0.25,
            response_format: options.responseFormat,
            maxOutputTokens: options.maxOutputTokens,
            stream: true
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini stream connection error:", errorText);
        throw new Error(errorText || "Failed to connect to Gemini stream");
    }

    return response;
}

export async function callGeminiJson<T>(messages: AiMessage[], schema: any, options: GeminiOptions = {}): Promise<T> {
    const response = await callGemini(messages, {
        ...options,
        responseFormat: {
            type: "json_schema",
            json_schema: {
                name: "gemini_response",
                strict: true,
                schema,
            },
        },
    });

    return JSON.parse(response) as T;
}
