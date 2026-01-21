import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get authenticated user
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

    const body: CheckoutRequest = await req.json();
    const { jobId, clientJobAccessId, selectedServices, totalAmount, customerEmail, successUrl, cancelUrl } = body;

    // Validate required fields
    if (!jobId || !selectedServices || selectedServices.length === 0 || !totalAmount) {
      throw new Error("Missing required fields: jobId, selectedServices, totalAmount");
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

    // Create a pending payment record using service role client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get client account ID if user is authenticated
    let clientId: string | null = null;
    if (userId) {
      const { data: clientAccount } = await supabaseAdmin
        .from("client_accounts")
        .select("id")
        .eq("user_id", userId)
        .single();
      
      if (clientAccount) {
        clientId = clientAccount.id;
      }
    }

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
