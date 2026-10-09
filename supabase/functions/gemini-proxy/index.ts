
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "http://localhost:5173",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

type ChatMessagePart =
  | string
  | {
      type?: string;
      text?: string;
      image_url?: { url?: string };
      [key: string]: unknown;
    };

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ChatMessagePart[];
};

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

type GeminiSafetySetting = {
  category: string;
  threshold: string;
};

type GeminiGenerationConfig = {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  responseSchema?: unknown;
};

type GeminiPayload = {
  contents: GeminiContent[];
  generationConfig: GeminiGenerationConfig;
  safetySettings: GeminiSafetySetting[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
};

type GeminiCandidatePart = {
  text?: string;
  [key: string]: unknown;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiCandidatePart[];
  };
  [key: string]: unknown;
};

type GeminiResponseData = {
  candidates?: GeminiCandidate[];
  [key: string]: unknown;
};

type RequestBody = {
  messages?: ChatMessage[];
  model?: string;
  response_format?: unknown;
  temperature?: number;
  maxOutputTokens?: number;
  stream?: boolean;
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function normalizePart(part: unknown): GeminiPart {
  if (typeof part === "string") return { text: part };
  if (typeof part === "object" && part !== null) {
    const p = part as {
      type?: string;
      text?: unknown;
      image_url?: { url?: unknown };
    };
    if (p.type === "text") return { text: String(p.text ?? "") };
    if (p.type === "image_url") {
      const url = String(p.image_url?.url ?? "");
      const match = url.match(/^data:(.+);base64,(.+)$/);
      if (!match) return { text: "[Unsupported image URL omitted]" };
      return {
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      };
    }
  }
  return { text: JSON.stringify(part) };
}

function normalizeMessage(message: ChatMessage): GeminiContent {
  const parts: GeminiPart[] = Array.isArray(message.content)
    ? message.content.map(normalizePart)
    : [{ text: String(message.content ?? "") }];

  return {
    role: message.role === "assistant" ? "model" : "user",
    parts,
  };
}

function extractJsonSchema(responseFormat: unknown): unknown {
  if (typeof responseFormat === "object" && responseFormat !== null) {
    const format = responseFormat as {
      json_schema?: { schema?: unknown };
      schema?: unknown;
    };
    return format.json_schema?.schema ?? format.schema ?? undefined;
  }
  return undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model, response_format, temperature, maxOutputTokens, stream } =
      ((await req.json()) as RequestBody) ?? {};

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

    const payload: GeminiPayload = {
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

    if (stream) {
      const response = await fetch(
        `${GEMINI_API_URL}/${model || "gemini-2.5-flash"}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error (stream):", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to communicate with Gemini stream" }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const headers = new Headers(corsHeaders);
      headers.set("Content-Type", "text/event-stream");
      headers.set("Cache-Control", "no-cache");
      headers.set("Connection", "keep-alive");

      return new Response(response.body, { headers });
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
        JSON.stringify({ error: "Failed to communicate with Gemini" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = (await response.json()) as GeminiResponseData;
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part: GeminiCandidatePart) => part.text ?? "")
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
