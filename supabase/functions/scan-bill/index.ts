import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to get GEMINI_API_KEY first, fallback to LOVABLE_API_KEY
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error('Neither GEMINI_API_KEY nor LOVABLE_API_KEY is configured in the Edge Function environment');
    }

    console.log('Processing bill image for OCR...');

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an OCR assistant that extracts data from bill/receipt images. 
Extract the following fields if available and return them as JSON:
- merchant_name: The name of the store/shop/merchant
- total_amount: The total amount (number only, no currency symbols)
- bill_date: The date of the bill in YYYY-MM-DD format
- tax_amount: Tax amount if shown (number only, optional)
- category_suggestion: Suggest one of these categories based on the merchant type: Food, Transport, Shopping, Entertainment, Bills, Health, Other

IMPORTANT: Return ONLY valid JSON with these exact keys. If a field cannot be determined, use null.
Example: {"merchant_name": "Cafe Coffee Day", "total_amount": 250, "bill_date": "2024-01-15", "tax_amount": 12.50, "category_suggestion": "Food"}`
            },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: imageBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error('Failed to communicate with Gemini API');
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    console.log('AI response:', content);

    // Parse the JSON response from the AI
    let extractedData;
    try {
      extractedData = JSON.parse(content.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Could not extract bill data. Please try a clearer image or enter details manually.',
          raw_response: content 
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: extractedData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in scan-bill function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
