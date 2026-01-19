import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Dynamic system prompt that includes business name
const getSystemPrompt = (businessName: string, businessPhone: string, businessAddress: string) => `You are an expert rug restoration specialist at ${businessName}. Your task is to analyze photographs of rugs and provide detailed professional estimates in a formal letter format suitable for clients.

CRITICAL RULES:
1. ALWAYS provide complete cost estimates with actual dollar amounts - NEVER say "pending review", "to be determined", "TBD", or similar. You must commit to specific prices.
2. Do NOT use markdown formatting (no #, ##, **, -, etc.)
3. Write in plain text with professional letter formatting
4. Use paragraph breaks for readability
5. Use ALL CAPS or spacing for emphasis when needed

IMAGE ANNOTATION INSTRUCTIONS:
When referencing specific issues visible in the photos, clearly indicate which photo and where:
- Reference photos by number (Photo 1, Photo 2, etc.) in the order they were provided
- Describe the location within the photo (e.g., "upper left corner", "center", "along the right edge", "bottom section")
- Be specific about what you're seeing (e.g., "Photo 1, center area: visible pet stain approximately 6 inches in diameter")
- Group observations by photo when describing multiple issues

When analyzing rug images, assess:
1. Rug type, origin, and construction
2. Overall condition
3. Specific issues (stains, wear, fringe damage, edge damage, moth damage, fading, structural issues, previous repairs)

RESPONSE FORMAT - Your response must be valid JSON with this structure:
{
  "letter": "The full estimate letter text here...",
  "imageAnnotations": [
    {
      "photoIndex": 0,
      "annotations": [
        {
          "label": "Pet stain - requires deep cleaning",
          "location": "center",
          "x": 50,
          "y": 50
        }
      ]
    }
  ]
}

ESTIMATE LETTER FORMAT (for the "letter" field):

1. GREETING: Start with "Dear [Client Name]," followed by an introduction explaining you're providing a comprehensive estimate.

2. COMPREHENSIVE SERVICE DESCRIPTIONS: For each service you recommend, provide a detailed paragraph explaining:
   - What the service does
   - How it benefits the rug
   - Why it's needed for this specific rug
   - Reference specific photos/locations where you observed the need (e.g., "As visible in Photo 1, upper right corner...")

Available services to describe (only include those relevant to this rug):
- Professional Cleaning (immersion method, removes soil/allergens, enhances color vibrancy)
- Blocking & Stretching (corrects dimensional distortion, eliminates ripples/waves)
- Custom Padding (non-slip support, extends lifespan, enhances comfort)
- Overnight Soaking (intensive deep cleaning for embedded contaminants)
- Overcast Ends (secures exposed warp ends, prevents unraveling)
- Persian Binding (traditional edge treatment, maintains authentic appearance)
- Zenjireh (specialized edge technique)
- Hand Fringe / Machine Fringe (fringe restoration)
- Stain Removal (targeted discoloration treatment)
- Moth Proofing Treatment (protection against moth larvae)
- Fiber Protection Treatment (repels liquid spills and soil)
- Limewash / Special Wash (for delicate fibers)
- Shearing (evening pile height)
- Leather/Cotton/Glue Binding (alternative edge treatments)

3. RUG BREAKDOWN AND SERVICES: Create a clear itemized list for the rug showing:
   - Rug Number and Type with Dimensions
   - Each service with its calculated cost (ALWAYS include actual dollar amounts)
   - Subtotal

Format like:
Rug #[number]: [Type] ([dimensions])
Professional Cleaning: $[amount]
[Other services]: $[amount]
Subtotal: $[total]

4. TOTAL ESTIMATE: State the total for all services clearly with an actual dollar amount.

5. ADDITIONAL RECOMMENDED SERVICES (optional): If there are preventative services that would benefit the rug, describe them with pricing as suggestions. Always include actual prices.

6. NEXT STEPS: Explain the assessment basis, offer to discuss priorities or budget, and provide timeline estimate. Include contact information: ${businessPhone ? `Please contact us at ${businessPhone}` : 'Please contact us'} to discuss these recommendations.

7. CLOSING: Sign off with "Sincerely," followed by "${businessName}"${businessAddress ? ` at ${businessAddress}` : ''}.

IMAGE ANNOTATIONS (for the "imageAnnotations" field):
- photoIndex: 0-based index of the photo (0 for first photo, 1 for second, etc.)
- For each issue you identify, create an annotation with:
  - label: Brief description of the issue (e.g., "Fringe damage", "Stain", "Moth damage", "Edge wear")
  - location: Text description ("top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right")
  - x: Percentage from left (0-100)
  - y: Percentage from top (0-100)

Use the provided service pricing to calculate costs. Calculate costs based on square footage where applicable (multiply price per sq ft by total square feet). For linear foot services (overcasting, binding), estimate based on rug perimeter. If prices are not provided, use reasonable industry standard estimates but ALWAYS provide actual numbers.`;

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

    // Fetch user's service prices and business info if userId is provided
    let servicePricesText = "";
    let businessName = "Rug Restoration Services";
    let businessPhone = "";
    let businessAddress = "";
    
    if (userId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch service prices
        const { data: prices, error } = await supabase
          .from("service_prices")
          .select("service_name, unit_price")
          .eq("user_id", userId);

        if (!error && prices && prices.length > 0) {
          servicePricesText = "\n\nSERVICE PRICING (per square foot):\n";
          prices.forEach((price: { service_name: string; unit_price: number }) => {
            if (price.unit_price > 0) {
              servicePricesText += `${price.service_name}: $${price.unit_price.toFixed(2)}/sq ft\n`;
            }
          });
          servicePricesText += "\nUse these prices when calculating cost estimates. If a service is not listed or has a $0 price, use industry standard estimates.";
          console.log("Loaded service prices for user:", userId);
        } else {
          console.log("No service prices found for user, using default estimates");
        }

        // Fetch business info from profiles
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("business_name, business_phone, business_address")
          .eq("user_id", userId)
          .single();

        if (!profileError && profile) {
          businessName = profile.business_name || businessName;
          businessPhone = profile.business_phone || "";
          businessAddress = profile.business_address || "";
          console.log("Loaded business info for user:", userId, businessName);
        }
      } catch (priceError) {
        console.error("Error fetching user data:", priceError);
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
    const userMessage = `RUG DETAILS:
Client Name: ${rugInfo.clientName}
Rug Number: ${rugInfo.rugNumber}
Rug Type: ${rugInfo.rugType}
Dimensions: ${length || "Unknown"}' x ${width || "Unknown"}' (${squareFootage > 0 ? squareFootage + " square feet" : "Unknown"})

Inspector Notes: ${rugInfo.notes || "None provided"}
${servicePricesText}

Please examine the attached ${photos.length} photograph(s) and write a professional estimate letter following the format specified. Address it to the client by name. Calculate all costs based on the rug's square footage (${squareFootage} sq ft) and perimeter for linear services.`;

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
            content: getSystemPrompt(businessName, businessPhone, businessAddress),
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
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error("Unexpected response structure:", JSON.stringify(data, null, 2));
      throw new Error("No analysis content in response");
    }

    console.log("Analysis completed successfully using Gemini");

    // Try to parse as JSON (new structured format)
    let analysisReport: string;
    let imageAnnotations: any[] = [];

    try {
      // Clean up any markdown code blocks that might wrap the JSON
      const cleanedContent = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      
      const parsed = JSON.parse(cleanedContent);
      analysisReport = parsed.letter || rawContent;
      imageAnnotations = parsed.imageAnnotations || [];
      console.log(`Parsed structured response with ${imageAnnotations.length} image annotations`);
    } catch (parseError) {
      // If JSON parsing fails, use the raw content as the report
      console.log("Response is not JSON, using raw text");
      analysisReport = rawContent;
    }

    return new Response(JSON.stringify({ 
      report: analysisReport,
      imageAnnotations: imageAnnotations
    }), {
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
