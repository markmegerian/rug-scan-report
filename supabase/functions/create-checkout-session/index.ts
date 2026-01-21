import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: 5 checkout requests per minute per user
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!userLimit || now > userLimit.resetTime) {
    // First request or window expired - reset counter
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment counter
  userLimit.count++;
  return { allowed: true };
}

interface CheckoutRequest {
  jobId: string;
  clientJobAccessId: string;
  selectedServices: {
    rugNumber: string;
    services: {
      id: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }[];
  }[];
  totalAmount: number;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user - REQUIRED for authorization
    const authHeader = req.headers.get("Authorization");
    let userEmail: string | undefined;
    let userId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      if (user) {
        userEmail = user.email;
        userId = user.id;
      }
    }

    // Require authentication
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // RATE LIMITING: Check if user has exceeded checkout attempts
    const rateLimitResult = checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for user ${userId}`);
      return new Response(
        JSON.stringify({ 
          error: "Too many checkout attempts. Please try again later.",
          retryAfter: rateLimitResult.retryAfter
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(rateLimitResult.retryAfter)
          } 
        }
      );
    }

    const body: CheckoutRequest = await req.json();
    const { jobId, clientJobAccessId, selectedServices, totalAmount, customerEmail, successUrl, cancelUrl } = body;

    // Validate required fields
    if (!jobId || !clientJobAccessId || !selectedServices || selectedServices.length === 0 || !totalAmount) {
      throw new Error("Missing required fields: jobId, clientJobAccessId, selectedServices, totalAmount");
    }

    // Use service role client for authorization checks (bypasses RLS for server-side validation)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // SECURITY: Verify the authenticated user has access to this job
    // Get user's client account
    const { data: clientAccount, error: clientError } = await supabaseAdmin
      .from('client_accounts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (clientError || !clientAccount) {
      console.error("Client account not found for user:", userId, "Error:", clientError);
      return new Response(
        JSON.stringify({ error: "Client account not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the client has access to this specific job via client_job_access
    const { data: accessRecord, error: accessError } = await supabaseAdmin
      .from('client_job_access')
      .select('id, job_id')
      .eq('id', clientJobAccessId)
      .eq('job_id', jobId)
      .eq('client_id', clientAccount.id)
      .single();

    if (accessError || !accessRecord) {
      console.error("Unauthorized job access attempt:", { userId, jobId, clientJobAccessId });
      return new Response(
        JSON.stringify({ error: "Unauthorized access to job" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = userEmail || customerEmail;
    if (!email) {
      throw new Error("Customer email is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Build line items from selected services
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    
    for (const rug of selectedServices) {
      for (const service of rug.services) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: `${service.name}`,
              description: `${rug.rugNumber} - ${service.name}`,
            },
            unit_amount: Math.round(service.unitPrice * 100), // Convert to cents
          },
          quantity: service.quantity,
        });
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        jobId,
        clientJobAccessId,
        userId: userId || "",
      },
      payment_intent_data: {
        metadata: {
          jobId,
          clientJobAccessId,
        },
      },
    });

    // Get client account ID for payment record (already have clientAccount from auth check above)
    const clientId = clientAccount?.id || null;

    // Check for existing pending payment for this job and delete it
    await supabaseAdmin
      .from("payments")
      .delete()
      .eq("job_id", jobId)
      .eq("status", "pending");

    // Store new pending payment
    await supabaseAdmin.from("payments").insert({
      job_id: jobId,
      client_id: clientId,
      stripe_checkout_session_id: session.id,
      amount: totalAmount,
      status: "pending",
      metadata: {
        selectedServices,
        clientJobAccessId,
      },
    });

    console.log("Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ 
        checkoutUrl: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating checkout session:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
