import { callGemini } from "./gemini";

/**
 * Backward-compatible AI interface.
 * Existing components still call callOpenAI, but requests now go through the
 * secure Gemini Edge Function proxy so API keys never ship to the browser.
 */
export async function callOpenAI(messages: any[], model: string = "gpt-4o-mini", responseFormat?: any) {
    const geminiModel = "gemini-2.5-flash";
    return callGemini(messages, {
        model: geminiModel,
        temperature: 0.1,
        responseFormat,
    });
}
