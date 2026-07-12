import { callGemini } from "./gemini";

/**
 * Backward-compatible AI interface.
 * Existing components still call callOpenAI, but requests now go through the
 * production FastAPI AI service so Gemini keys never ship to the browser.
 */
export async function callOpenAI(messages: any[], model: string = "gpt-4o-mini", responseFormat?: any) {
    return callGemini(messages, {
        model: "gemini-2.5-flash",
        temperature: 0.1,
        responseFormat,
    });
}
