import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<any>;
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function normalizePart(part: any) {
  if (typeof part === "string") return { text: part };
  if (part?.type === "text") return { text: String(part.text ?? "") };
  if (part?.type === "image_url") {
    const url = String(part.image_url?.url ?? "");
    const match = url.match(/^data:(.+);base64,(.+)$/);
    if (!match) return { text: "[Unsupported image URL omitted]" };
    return {
      inlineData: {
        mimeType: match[1],
        data: match[2],
      },
    };
  }
  return { text: JSON.stringify(part) };
}

function normalizeMessage(message: ChatMessage) {
  const parts = Array.isArray(message.content)
    ? message.content.map(normalizePart)
    : [{ text: String(message.content ?? "") }];

  return {
    role: message.role === "assistant" ? "model" : "user",
    parts,
  };
}

function extractJsonSchema(responseFormat: any) {
  return responseFormat?.json_schema?.schema ?? responseFormat?.schema ?? undefined;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model, response_format, temperature, maxOutputTokens } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in the Edge Function environment");
    }

    const systemMessages = messages
      .filter((message: ChatMessage) => message.role === "system")
      .map((message: ChatMessage) => String(message.content ?? ""))
      .filter(Boolean);

    const schema = extractJsonSchema(response_format);
    const contents = messages
      .filter((message: ChatMessage) => message.role !== "system")
      .map(normalizeMessage);

    const payload: any = {
      contents,
      generationConfig: {
        temperature: temperature ?? 0.2,
        maxOutputTokens: maxOutputTokens ?? 2048,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };

    if (systemMessages.length) {
      payload.systemInstruction = {
        parts: [{ text: systemMessages.join("\n\n") }],
      };
    }

    if (schema) {
      payload.generationConfig.responseMimeType = "application/json";
      payload.generationConfig.responseSchema = schema;
    }

    const response = await fetch(
      `${GEMINI_API_URL}/${model || "gemini-2.5-flash"}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to communicate with Gemini", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part.text ?? "")
      .join("")
      .trim() ?? "";

    return new Response(
      JSON.stringify({
        text,
        raw: data,
        choices: [{ message: { content: text } }],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Error in gemini-proxy function:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
