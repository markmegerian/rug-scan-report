import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
const PROMPT_ID = "pmpt_696a8de58b648196aef26ad720ec3c720318d629e12dba15";

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

    console.log(`Analyzing rug inspection for ${rugInfo.rugNumber} with ${photos.length} photos using custom prompt`);

    // Build the image content array for the Responses API
    const imageContent = photos.map((photoUrl: string) => ({
      type: "input_image",
      image_url: photoUrl,
      detail: "high",
    }));

    // Build the user input with rug details and images
    const userInput = `**Rug Details:**
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

    // Use OpenAI Responses API with saved prompt ID
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5",
        prompt: {
          id: PROMPT_ID,
        },
        input: [
          {
            type: "message",
            role: "user",
            content: [
              { type: "input_text", text: userInput },
              ...imageContent,
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI Responses API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("OpenAI response structure:", JSON.stringify(data, null, 2));

    // Extract the text content from the response
    let analysisReport = "";
    if (data.output && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === "message" && item.content) {
          for (const content of item.content) {
            if (content.type === "output_text") {
              analysisReport += content.text;
            }
          }
        }
      }
    }

    if (!analysisReport) {
      throw new Error("No analysis content in response");
    }

    console.log("Analysis completed successfully using custom prompt");

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
