const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type ExtractedBillData = {
  merchant_name: string | null;
  total_amount: number | null;
  bill_date: string | null;
  tax_amount: number | null;
  category_suggestion:
    | "Food"
    | "Transport"
    | "Shopping"
    | "Entertainment"
    | "Bills"
    | "Health"
    | "Other"
    | null;
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

export default {
  async fetch(req: Request): Promise<Response> {
    // Handle browser CORS preflight request
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Only allow POST requests
    if (req.method !== "POST") {
      return jsonResponse(
        {
          error: "Method not allowed. Use POST.",
        },
        405,
      );
    }

    try {
      // ---------------------------------------------------------
      // 1. Read request body
      // ---------------------------------------------------------

      const body = await req.json();

      const imageBase64 =
        typeof body?.imageBase64 === "string"
          ? body.imageBase64.trim()
          : "";

      const mimeType =
        typeof body?.mimeType === "string" && body.mimeType.trim()
          ? body.mimeType.trim()
          : "image/jpeg";

      if (!imageBase64) {
        return jsonResponse(
          {
            error: "No image provided.",
          },
          400,
        );
      }

      // ---------------------------------------------------------
      // 2. Get Gemini API key
      // ---------------------------------------------------------

      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

      if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not configured.");

        return jsonResponse(
          {
            error:
              "Gemini API key is not configured in the Edge Function environment.",
          },
          500,
        );
      }

      console.log("Processing bill image for OCR...");

      // ---------------------------------------------------------
      // 3. Gemini prompt
      // ---------------------------------------------------------

      const prompt = `
You are an OCR assistant for expense bills and receipts.

Extract the following information from the provided bill/receipt image.

Return ONLY valid JSON.

Required JSON structure:

{
  "merchant_name": string | null,
  "total_amount": number | null,
  "bill_date": "YYYY-MM-DD" | null,
  "tax_amount": number | null,
  "category_suggestion": "Food" | "Transport" | "Shopping" | "Entertainment" | "Bills" | "Health" | "Other" | null
}

Rules:

1. merchant_name:
   Extract the store, shop, restaurant, company, or merchant name.

2. total_amount:
   Extract the final payable/total amount.
   Return only a number.
   Do not include currency symbols.

3. bill_date:
   Convert the bill date to YYYY-MM-DD.
   If the date cannot be determined, return null.

4. tax_amount:
   Extract the total tax amount if visible.
   Return only a number.
   If tax is not shown, return null.

5. category_suggestion:
   Choose exactly one:
   Food
   Transport
   Shopping
   Entertainment
   Bills
   Health
   Other

6. If a value cannot be determined, return null.

7. Do not return markdown.
8. Do not return code fences.
9. Do not add explanations.
10. Return ONLY the JSON object.
`;

      // ---------------------------------------------------------
      // 4. Gemini request
      // ---------------------------------------------------------

      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      };

      const geminiUrl =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        "gemini-2.5-flash:generateContent" +
        `?key=${encodeURIComponent(GEMINI_API_KEY)}`;

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // ---------------------------------------------------------
      // 5. Handle Gemini errors
      // ---------------------------------------------------------

      if (!response.ok) {
        const errorText = await response.text();

        console.error(
          `Gemini API error (${response.status}):`,
          errorText,
        );

        return jsonResponse(
          {
            error: "Failed to communicate with Gemini API.",
            status: response.status,
          },
          502,
        );
      }

      // ---------------------------------------------------------
      // 6. Parse Gemini response
      // ---------------------------------------------------------

      const data: GeminiResponse = await response.json();

      const content =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      if (!content) {
        console.error("Gemini returned an empty response:", data);

        return jsonResponse(
          {
            error:
              "Gemini returned an empty response. Please try another image.",
          },
          422,
        );
      }

      console.log("Gemini OCR response:", content);

      // ---------------------------------------------------------
      // 7. Parse extracted JSON
      // ---------------------------------------------------------

      let extractedData: ExtractedBillData;

      try {
        extractedData = JSON.parse(content);
      } catch (parseError) {
        console.error("Failed to parse Gemini JSON:", parseError);
        console.error("Raw Gemini response:", content);

        return jsonResponse(
          {
            error:
              "Could not extract bill data. Please try a clearer image or enter the details manually.",
            raw_response: content,
          },
          422,
        );
      }

      // ---------------------------------------------------------
      // 8. Normalize the response
      // ---------------------------------------------------------

      const normalizedData: ExtractedBillData = {
        merchant_name:
          typeof extractedData?.merchant_name === "string"
            ? extractedData.merchant_name.trim()
            : null,

        total_amount:
          typeof extractedData?.total_amount === "number" &&
          Number.isFinite(extractedData.total_amount)
            ? extractedData.total_amount
            : null,

        bill_date:
          typeof extractedData?.bill_date === "string"
            ? extractedData.bill_date
            : null,

        tax_amount:
          typeof extractedData?.tax_amount === "number" &&
          Number.isFinite(extractedData.tax_amount)
            ? extractedData.tax_amount
            : null,

        category_suggestion:
          extractedData?.category_suggestion ?? null,
      };

      // ---------------------------------------------------------
      // 9. Return successful response
      // ---------------------------------------------------------

      return jsonResponse({
        success: true,
        data: normalizedData,
      });
    } catch (error: unknown) {
      console.error("Error in scan-bill Edge Function:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unknown error occurred.";

      return jsonResponse(
        {
          error: message,
        },
        500,
      );
    }
  },
};