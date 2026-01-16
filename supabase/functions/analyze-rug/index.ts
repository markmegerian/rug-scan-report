import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photos, rugInfo } = await req.json();

    if (!openAIApiKey) {
      throw new Error("OpenAI API key is not configured");
    }

    console.log(`Analyzing rug inspection for ${rugInfo.rugNumber} with ${photos.length} photos`);

    // Build the image content array for vision API
    const imageContent = photos.map((photoUrl: string) => ({
      type: "image_url",
      image_url: {
        url: photoUrl,
        detail: "high",
      },
    }));

    const systemPrompt = `You are an expert rug restoration and repair specialist with decades of experience. You analyze photographs of rugs to identify:

1. **Condition Assessment**: Overall condition, signs of wear, damage, or deterioration
2. **Specific Issues**: Stains, tears, fraying, moth damage, color fading, foundation problems, pile wear, fringe damage
3. **Rug Characteristics**: Estimated age, quality indicators, construction type, materials
4. **Restoration Recommendations**: Prioritized list of needed repairs with estimated costs
5. **Cost Estimates**: Provide realistic price ranges based on industry standards

Always structure your response with clear sections and provide actionable recommendations. Include price estimates in USD. Be thorough but concise.`;

    const userPrompt = `Please analyze this ${rugInfo.rugType} rug for repair and restoration.

**Rug Details:**
- Client: ${rugInfo.clientName}
- Rug Number: ${rugInfo.rugNumber}
- Type: ${rugInfo.rugType}
- Dimensions: ${rugInfo.length || "Unknown"}' × ${rugInfo.width || "Unknown"}'

**Additional Notes from Inspector:** ${rugInfo.notes || "None provided"}

Please examine the attached ${photos.length} photograph(s) and provide:
1. Overall condition assessment
2. Specific issues identified
3. Recommended services with priority levels
4. Estimated costs for each service
5. Total estimated cost range
6. Recommended timeline for restoration`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [{ type: "text", text: userPrompt }, ...imageContent],
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisReport = data.choices[0].message.content;

    console.log("Analysis completed successfully");

    return new Response(JSON.stringify({ report: analysisReport }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in analyze-rug function:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
