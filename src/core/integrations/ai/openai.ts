export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.warn("Missing VITE_OPENAI_API_KEY. AI features will fail.");
}

/**
 * Basic raw fetch interface to OpenAI chat completions to avoid
 * pulling in the massive Node.js based SDK on the client bundle.
 */
export async function callOpenAI(messages: any[], model: string = "gpt-4o-mini", responseFormat?: any) {
    if (!OPENAI_API_KEY) {
        throw new Error("OpenAI API key is missing. Please add VITE_OPENAI_API_KEY to your .env file.");
    }

    const payload: any = {
        model,
        messages,
        temperature: 0.1, // Low temperature for deterministic financial data parsing
    };

    if (responseFormat) {
        payload.response_format = responseFormat;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.json();
        console.error("OpenAI API Error:", err);
        throw new Error(err.error?.message || "Failed to communicate with OpenAI.");
    }

    const data = await response.json();
    return data.choices[0].message.content;
}
