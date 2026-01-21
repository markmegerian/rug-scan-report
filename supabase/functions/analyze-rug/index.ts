import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 requests per minute per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clean up old rate limit entries periodically
function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Check rate limit for a user
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  cleanupRateLimits();
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: userLimit.resetTime - now };
  }
  
  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - userLimit.count, resetIn: userLimit.resetTime - now };
}

// Sanitize string input - remove potential injection characters
function sanitizeString(input: string): string {
  return input
    .replace(/[<>{}[\]\\]/g, '') // Remove potentially dangerous characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

// Validate URL is from allowed domains (Supabase storage)
function isValidPhotoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedHosts = [
      'tviommdnpvfceuprrwzf.supabase.co',
      'supabase.co',
      'supabase.in'
    ];
    return allowedHosts.some(host => parsed.hostname.endsWith(host));
  } catch {
    return false;
  }
}

// CORS headers - allow all origins for mobile browser compatibility
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Supported AI models for rug analysis
const SUPPORTED_MODELS = ["google/gemini-2.5-pro", "google/gemini-2.5-flash"] as const;
type SupportedModel = typeof SUPPORTED_MODELS[number];

// Input validation schema with stricter constraints
const RequestSchema = z.object({
  photos: z.array(z.string().url().refine(isValidPhotoUrl, { message: "Invalid photo URL domain" })).min(1).max(20),
  rugInfo: z.object({
    clientName: z.string().min(1).max(200).transform(sanitizeString),
    rugNumber: z.string().min(1).max(100).transform(sanitizeString),
    rugType: z.string().min(1).max(100).transform(sanitizeString),
    length: z.union([z.string().max(20), z.number().min(0).max(1000)]).optional(),
    width: z.union([z.string().max(20), z.number().min(0).max(1000)]).optional(),
    notes: z.string().max(5000).optional().nullable().transform(val => val ? sanitizeString(val) : val)
  }),
  userId: z.string().uuid().optional(),
  model: z.enum(SUPPORTED_MODELS).optional().default("google/gemini-2.5-pro")
});

// Dynamic system prompt that includes business name
const getSystemPrompt = (businessName: string, businessPhone: string, businessAddress: string) => `You are an expert rug restoration specialist at ${businessName} with decades of experience identifying rug origins, construction methods, and restoration needs. Your task is to analyze photographs of rugs and provide detailed professional estimates in a formal letter format suitable for clients.

CRITICAL RULES:
1. INCLUDE ALL SERVICES you identify as needed - never skip or omit services you're uncertain about.
2. ALWAYS provide your best cost estimate with actual dollar amounts for EVERY service - NEVER say "pending review", "to be determined", "TBD", "price upon inspection", or similar phrases. Even if you're uncertain, provide your best professional estimate based on the information available.
3. If exact pricing isn't provided, use industry standard rates and your professional judgment to calculate reasonable costs.
4. Do NOT use markdown formatting (no #, ##, **, -, etc.)
5. Write in plain text with professional letter formatting
6. Use paragraph breaks for readability
7. Use ALL CAPS or spacing for emphasis when needed

PHOTO SEQUENCE - Photos are captured in a structured order for complete rug coverage:
- Photo 1: OVERALL FRONT - Full rug from above showing the front/top surface
- Photo 2: OVERALL BACK - Full back side of the rug (construction and hidden damage)
- Photo 3: FRINGE END A - Close-up of fringe on one end
- Photo 4: FRINGE END B - Close-up of fringe on the opposite end
- Photo 5: EDGE/BINDING SIDE A - Close-up of one side edge/binding
- Photo 6: EDGE/BINDING SIDE B - Close-up of the opposite side edge/binding
- Photos 7+ (if provided): ISSUE CLOSE-UPS - Client-identified problem areas (stains, damage, wear)

Use this photo sequence knowledge when referencing photos in your analysis and annotations.

RUG IDENTIFICATION EXPERTISE - Analyze carefully for:
1. ORIGIN: Persian (Iranian), Turkish (Anatolian), Afghan, Indian, Pakistani, Chinese, Tibetan, Moroccan, Caucasian, Central Asian, European (Aubusson, Savonnerie), Native American (Navajo)
2. CONSTRUCTION TYPE:
   - Hand-knotted (look for knot density on back, irregular patterns, natural fiber variations)
   - Hand-tufted (check for latex/fabric backing, more uniform appearance)
   - Hand-woven/Flatweave (Kilim, Dhurrie, Soumak - no pile, reversible design)
   - Machine-made (perfectly uniform patterns, synthetic backing, identical repeat patterns)
3. FIBER CONTENT: Wool, silk, cotton, synthetic (polyester, nylon, polypropylene), blends
4. AGE INDICATORS: Patina, wear patterns, dye characteristics (natural vs synthetic dyes), repair history
5. KNOT TYPE: Persian/Senneh (asymmetric) vs Turkish/Ghiordes (symmetric) - visible on back
6. DESIGN FAMILY: Medallion, all-over, pictorial, geometric, curvilinear, tribal

DAMAGE IDENTIFICATION EXPERTISE - Be thorough and specific:
1. STAINS - Identify type when possible:
   - Pet stains (urine, vomit) - look for discoloration halos, odor indicators
   - Food/beverage stains - coffee, wine, grease
   - Water damage/water staining - tide lines, mineral deposits
   - Mold/mildew - dark spots, musty appearance
   - Ink, dye transfer, rust stains
2. STRUCTURAL DAMAGE:
   - Foundation damage (warp/weft visible or broken)
   - Holes, tears, cuts, punctures - measure approximate size
   - Moth damage (irregular holes with silk remaining, larvae casings)
   - Dry rot (brittle fibers, crumbling foundation)
   - Delamination (backing separating from face)
3. FRINGE ISSUES:
   - Fringe loss/missing fringe - percentage and length affected
   - Frayed/unraveling fringe - severity
   - Discolored/stained fringe
   - Knots unraveling into rug body
4. EDGE/SELVEDGE DAMAGE:
   - Worn/frayed edges - linear measurement
   - Missing selvedge/overcasting
   - Separated/loose binding
   - Curling edges
5. SURFACE ISSUES:
   - Pile wear/traffic patterns - light, moderate, severe
   - Crushing/matting
   - Color fading (sun damage) - note affected areas
   - Color run/bleeding
   - Sprouting/loose pile tufts
6. PREVIOUS REPAIRS:
   - Visible patches or reweaving
   - Overcasting repairs
   - Fringe replacements
   - Quality of previous work

IMAGE ANNOTATION INSTRUCTIONS - CRITICAL:
- ONLY place markers ON THE RUG ITSELF - never on the floor, wall, background, or any surrounding surfaces
- If the rug only occupies part of the photo, your x/y coordinates MUST be within the rug's boundaries
- Before placing a marker, confirm the location is actually on the rug surface
- Reference photos by their purpose AND number (e.g., "Photo 1 (Overall Front): visible pet stain in center")
- Be specific about what you're seeing (e.g., "Photo 3 (Fringe End A): fringe loss approximately 2 inches, discoloration")
- If a photo shows no rug issues (only general condition), you may have zero annotations for that photo - that's acceptable
- Pay special attention to Photos 7+ as the client specifically captured these to highlight concerns
- Mark ALL issues found, not just the obvious ones

ANALYSIS APPROACH:
1. Photo 1-2 (Front/Back): Identify rug origin, construction, fiber, approximate age, overall condition
2. Photos 3-4 (Fringes): Assess fringe condition at both ends, note any active unraveling
3. Photos 5-6 (Edges): Check binding/selvedge integrity, edge wear
4. Photos 7+ (Issues): Focus on client-identified problems, confirm issue type, assess severity

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

5. NEXT STEPS: Explain the assessment basis, offer to discuss priorities or budget, and provide timeline estimate. Include contact information: ${businessPhone ? `Please contact us at ${businessPhone}` : 'Please contact us'} to discuss these recommendations.

6. CLOSING: Sign off with "Sincerely," followed by "${businessName}"${businessAddress ? ` at ${businessAddress}` : ''}.
IMAGE ANNOTATIONS (for the "imageAnnotations" field):
- photoIndex: 0-based index of the photo (0 for first photo, 1 for second, etc.)
- CRITICAL: Only annotate issues that are PHYSICALLY ON THE RUG - never mark floors, walls, or background
- For each issue ON THE RUG, create an annotation with:
  - label: Brief description of the issue (e.g., "Fringe damage", "Stain", "Moth damage", "Edge wear")
  - location: Text description relative to the RUG's position ("top-left of rug", "center of rug", "rug edge", etc.)
  - x: Percentage from left (0-100) - must be within the rug's visible area in the photo
  - y: Percentage from top (0-100) - must be within the rug's visible area in the photo
- If a photo is a general overview with no specific issues to mark, return an empty annotations array for that photo

Use the provided service pricing to calculate costs. Calculate costs based on square footage where applicable (multiply price per sq ft by total square feet). For linear foot services (overcasting, binding), estimate based on rug perimeter. If prices are not provided, use reasonable industry standard estimates but ALWAYS provide actual numbers.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authenticatedUserId = claimsData.claims.sub as string;
    console.log("Authenticated user:", authenticatedUserId);

    // Check rate limit
    const rateLimit = checkRateLimit(authenticatedUserId);
    if (!rateLimit.allowed) {
      console.warn("Rate limit exceeded for user:", authenticatedUserId);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          resetIn: Math.ceil(rateLimit.resetIn / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetIn / 1000))
          } 
        }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validationResult = RequestSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.issues);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request data', 
          details: validationResult.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { photos, rugInfo, userId, model } = validationResult.data;

    // Ensure the userId matches the authenticated user (if provided)
    const effectiveUserId = userId || authenticatedUserId;
    if (userId && userId !== authenticatedUserId) {
      console.warn("UserId mismatch - using authenticated user:", authenticatedUserId);
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Analyzing rug inspection for ${rugInfo.rugNumber} with ${photos.length} photos using ${model}`);

    // Fetch user's service prices and business info using service role key
    let servicePricesText = "";
    let businessName = "Rug Restoration Services";
    let businessPhone = "";
    let businessAddress = "";
    
    try {
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Fetch service prices
      const { data: prices, error } = await supabase
        .from("service_prices")
        .select("service_name, unit_price")
        .eq("user_id", effectiveUserId);

      if (!error && prices && prices.length > 0) {
        servicePricesText = "\n\nSERVICE PRICING (per square foot):\n";
        prices.forEach((price: { service_name: string; unit_price: number }) => {
          if (price.unit_price > 0) {
            servicePricesText += `${price.service_name}: $${price.unit_price.toFixed(2)}/sq ft\n`;
          }
        });
        servicePricesText += "\nUse these prices when calculating cost estimates. If a service is not listed or has a $0 price, use industry standard estimates.";
        console.log("Loaded service prices for user:", effectiveUserId);
      } else {
        console.log("No service prices found for user, using default estimates");
      }

      // Fetch business info from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_name, business_phone, business_address")
        .eq("user_id", effectiveUserId)
        .single();

      if (!profileError && profile) {
        businessName = profile.business_name || businessName;
        businessPhone = profile.business_phone || "";
        businessAddress = profile.business_address || "";
        console.log("Loaded business info for user:", effectiveUserId, businessName);
      }
    } catch (priceError) {
      console.error("Error fetching user data:", priceError);
    }

    // Calculate square footage
    const length = typeof rugInfo.length === 'string' ? parseFloat(rugInfo.length) || 0 : rugInfo.length || 0;
    const width = typeof rugInfo.width === 'string' ? parseFloat(rugInfo.width) || 0 : rugInfo.width || 0;
    const squareFootage = length * width;

    // Build the image content array for Gemini vision
    // Use "high" detail for Pro model, "low" for Flash to optimize speed/cost
    const imageDetail = model === "google/gemini-2.5-flash" ? "low" : "high";
    const imageContent = photos.map((photoUrl: string) => ({
      type: "image_url",
      image_url: {
        url: photoUrl,
        detail: imageDetail,
      },
    }));

    // Sanitize notes to prevent prompt injection
    const sanitizedNotes = rugInfo.notes 
      ? rugInfo.notes.replace(/[<>{}]/g, '').substring(0, 2000)
      : "None provided";

    // Build the user message with rug details and images
    const userMessage = `RUG DETAILS:
Client Name: ${rugInfo.clientName.substring(0, 200)}
Rug Number: ${rugInfo.rugNumber.substring(0, 100)}
Rug Type: ${rugInfo.rugType.substring(0, 100)}
Dimensions: ${length || "Unknown"}' x ${width || "Unknown"}' (${squareFootage > 0 ? squareFootage + " square feet" : "Unknown"})

Inspector Notes: ${sanitizedNotes}
${servicePricesText}

Please examine the attached ${photos.length} photograph(s) and write a professional estimate letter following the format specified. Address it to the client by name. Calculate all costs based on the rug's square footage (${squareFootage} sq ft) and perimeter for linear services.`;

    // Use Lovable AI Gateway with selected model
    // Reduce max_tokens for Flash model since it's more concise
    const maxTokens = model === "google/gemini-2.5-flash" ? 5000 : 8000;
    const startTime = Date.now();
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
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
    
    const processingTimeMs = Date.now() - startTime;

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

    // Parse response with better error handling for truncated/empty responses
    let data;
    try {
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        console.error("Empty response from AI Gateway");
        throw new Error("Empty response from AI - please try again");
      }
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error("Failed to parse AI Gateway response:", jsonError);
      throw new Error("Invalid response from AI - please try again");
    }
    
    console.log("Gemini response received successfully");

    // Extract the text content from the response
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error("Unexpected response structure:", JSON.stringify(data, null, 2));
      throw new Error("No analysis content in response");
    }

    console.log(`Analysis completed successfully using ${model}`);

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
      // Check if response was truncated (ends with incomplete JSON)
      const isTruncated = rawContent.includes('"letter"') && 
        (!rawContent.includes('"imageAnnotations"') || !rawContent.trim().endsWith('}'));
      
      if (isTruncated) {
        console.log("Response appears truncated, extracting letter content");
        // Try to extract the letter content from truncated JSON
        const letterMatch = rawContent.match(/"letter"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"imageAnnotations"|"\s*}|$)/);
        if (letterMatch && letterMatch[1]) {
          // Unescape JSON string
          analysisReport = letterMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        } else {
          // Clean up any JSON formatting from raw content
          analysisReport = rawContent
            .replace(/^[\s\S]*?"letter"\s*:\s*"/i, '')
            .replace(/"\s*,?\s*"imageAnnotations"[\s\S]*$/i, '')
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        }
        console.log("Extracted letter from truncated response");
      } else {
        // If not truncated JSON, use the raw content as the report
        console.log("Response is not JSON, using raw text");
        analysisReport = rawContent;
      }
    }

    return new Response(JSON.stringify({ 
      report: analysisReport,
      imageAnnotations: imageAnnotations,
      modelUsed: model,
      processingTimeMs: processingTimeMs
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