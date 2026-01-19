import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert rug inspector and restoration specialist with decades of experience evaluating antique, handmade, and specialty rugs. Your task is to analyze photographs of rugs and provide detailed professional assessments.

When analyzing rug images, you should:
1. Identify the rug type, origin, and approximate age if possible
2. Assess the overall condition (excellent, good, fair, poor)
3. Identify specific issues such as:
   - Stains and discoloration
   - Wear patterns and thinning
   - Fringe damage or loss
   - Edge/selvedge damage
   - Moth damage or pest issues
   - Color fading or bleeding
   - Structural issues (holes, tears, delamination)
   - Previous repairs (good or poor quality)

4. Recommend specific services with priority levels (High, Medium, Low):
   - Standard wash
   - Special fiber/antique wash
   - Limewash (moth wash)
   - Overnight soaking
   - Blocking
   - Shearing
   - Overcasting
   - Zenjireh
   - Persian Binding
   - Hand Fringe
   - Machine Fringe
   - Leather binding
   - Cotton Binding
   - Glue binding
   - Padding

5. Provide cost estimates based on the rug's square footage and the service pricing provided

Format your response clearly with sections for:
- Overall Condition Assessment
- Issues Identified
- Recommended Services (with priority and estimated costs)
- Total Estimated Cost Range
- Recommended Timeline`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photos, rugInfo, userId } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Analyzing rug inspection for ${rugInfo.rugNumber} with ${photos.length} photos using Gemini`);

    // Fetch user's service prices if userId is provided
    let servicePricesText = "";
    if (userId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: prices, error } = await supabase
          .from("service_prices")
          .select("service_name, unit_price")
          .eq("user_id", userId);

        if (!error && prices && prices.length > 0) {
          servicePricesText = "\n\n**Service Pricing (per square foot):**\n";
          prices.forEach((price: { service_name: string; unit_price: number }) => {
            if (price.unit_price > 0) {
              servicePricesText += `- ${price.service_name}: $${price.unit_price.toFixed(2)}/sq ft\n`;
            }
          });
          servicePricesText += "\nUse these prices when calculating cost estimates. If a service is not listed or has a $0 price, use industry standard estimates.";
          console.log("Loaded service prices for user:", userId);
        } else {
          console.log("No service prices found for user, using default estimates");
        }
      } catch (priceError) {
        console.error("Error fetching service prices:", priceError);
      }
    }

    // Calculate square footage
    const length = rugInfo.length || 0;
    const width = rugInfo.width || 0;
    const squareFootage = length * width;

    // Build the image content array for Gemini vision
    const imageContent = photos.map((photoUrl: string) => ({
      type: "image_url",
      image_url: {
        url: photoUrl,
        detail: "high",
      },
    }));

    // Build the user message with rug details and images
    const userMessage = `**Rug Details:**
- Client: ${rugInfo.clientName}
- Rug Number: ${rugInfo.rugNumber}
- Type: ${rugInfo.rugType}
- Dimensions: ${length || "Unknown"}' × ${width || "Unknown"}' (${squareFootage > 0 ? squareFootage + " sq ft" : "Unknown sq ft"})

**Additional Notes from Inspector:** ${rugInfo.notes || "None provided"}${servicePricesText}

Please examine the attached ${photos.length} photograph(s) and provide:
1. Overall condition assessment
2. Specific issues identified
3. Recommended services with priority levels
4. Estimated costs for each service (use the provided pricing if available, calculate based on square footage)
5. Total estimated cost range
6. Recommended timeline for restoration`;

    // Use Lovable AI Gateway with Gemini
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              { type: "text", text: userMessage },
              ...imageContent,
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("AI usage limit reached. Please add credits to your workspace.");
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Gemini response received successfully");

    // Extract the text content from the response
    const analysisReport = data.choices?.[0]?.message?.content;

    if (!analysisReport) {
      console.error("Unexpected response structure:", JSON.stringify(data, null, 2));
      throw new Error("No analysis content in response");
    }

    console.log("Analysis completed successfully using Gemini");

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
