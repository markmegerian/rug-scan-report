import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    console.log("Verifying session:", sessionId, "Status:", session.payment_status);

    // Create admin client for database updates
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (session.payment_status === "paid") {
      const paymentIntent = session.payment_intent as Stripe.PaymentIntent;
      const jobId = session.metadata?.jobId;

      // Update payment record
      const { error: paymentError } = await supabaseAdmin
        .from("payments")
        .update({
          status: "completed",
          stripe_payment_intent_id: paymentIntent?.id,
          paid_at: new Date().toISOString(),
        })
        .eq("stripe_checkout_session_id", sessionId);

      if (paymentError) {
        console.error("Error updating payment:", paymentError);
      }

      // Update job status
      if (jobId) {
        const { error: jobError } = await supabaseAdmin
          .from("jobs")
          .update({
            payment_status: "paid",
            client_approved_at: new Date().toISOString(),
            status: "in-progress",
          })
          .eq("id", jobId);

        if (jobError) {
          console.error("Error updating job:", jobError);
        }

        // Get job details for response
        const { data: job } = await supabaseAdmin
          .from("jobs")
          .select("job_number, client_name, client_email, user_id")
          .eq("id", jobId)
          .single();

        // Get business profile
        let profile = null;
        if (job?.user_id) {
          const { data: profileData } = await supabaseAdmin
            .from("profiles")
            .select("business_email, business_name, business_phone, business_address")
            .eq("user_id", job.user_id)
            .single();
          profile = profileData;
        }

        // Get approved estimates with services for this job
        const { data: estimates } = await supabaseAdmin
          .from("approved_estimates")
          .select(`
            id,
            services,
            total_amount,
            inspection_id,
            inspections (
              rug_number,
              rug_type,
              length,
              width
            )
          `)
          .eq("job_id", jobId);

        // Format rug details for the email
        const rugs = (estimates || []).map((est: any) => ({
          rugNumber: est.inspections?.rug_number || "Unknown",
          rugType: est.inspections?.rug_type || "Unknown",
          dimensions: est.inspections?.length && est.inspections?.width 
            ? `${est.inspections.length}' × ${est.inspections.width}'` 
            : "N/A",
          services: Array.isArray(est.services) ? est.services : [],
          total: est.total_amount || 0,
        }));

        // Create in-app notification for staff
        if (job?.user_id) {
          try {
            const formattedAmount = ((session.amount_total || 0) / 100).toFixed(2);
            await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: job.user_id,
                type: 'payment_received',
                title: `Payment Received - $${formattedAmount}`,
                message: `${job.client_name} has paid for Job #${job.job_number}. The job is now in progress.`,
                metadata: {
                  jobId: jobId,
                  jobNumber: job.job_number,
                  clientName: job.client_name,
                  amount: session.amount_total,
                },
              });
            console.log("In-app notification created");
          } catch (notifError) {
            console.log("In-app notification error:", notifError);
          }
        }

        // Send email notification to business owner
        if (job && profile?.business_email) {
          try {
            await supabaseAdmin.functions.invoke("notify-payment-received", {
              body: {
                to: profile.business_email,
                businessName: profile.business_name,
                jobNumber: job.job_number,
                clientName: job.client_name,
                amount: session.amount_total,
              },
            });
            console.log("Staff email notification sent");
          } catch (notifyError) {
            console.log("Staff email notification error:", notifyError);
          }
        }

        // Generate invoice PDF and send confirmation email to client
        if (job?.client_email) {
          try {
            // Generate invoice PDF
            let pdfBase64: string | undefined;
            try {
              const { data: pdfData, error: pdfError } = await supabaseAdmin.functions.invoke("generate-invoice-pdf", {
                body: {
                  jobNumber: job.job_number,
                  clientName: job.client_name,
                  clientEmail: job.client_email,
                  amount: session.amount_total,
                  rugs: rugs,
                  businessName: profile?.business_name,
                  businessEmail: profile?.business_email,
                  businessPhone: profile?.business_phone,
                  businessAddress: profile?.business_address || null,
                  paidAt: new Date().toISOString(),
                },
              });
              
              if (pdfError) {
                console.log("Invoice PDF generation error:", pdfError);
              } else if (pdfData?.pdfBase64) {
                pdfBase64 = pdfData.pdfBase64;
                console.log("Invoice PDF generated successfully");
              }
            } catch (pdfGenError) {
              console.log("Invoice PDF generation failed:", pdfGenError);
            }

            // Send confirmation email with PDF attachment
            await supabaseAdmin.functions.invoke("send-client-confirmation", {
              body: {
                clientEmail: job.client_email,
                clientName: job.client_name,
                jobId: jobId,
                jobNumber: job.job_number,
                amount: session.amount_total,
                rugs: rugs,
                businessName: profile?.business_name,
                businessEmail: profile?.business_email,
                businessPhone: profile?.business_phone,
                pdfBase64: pdfBase64,
              },
            });
            console.log("Client confirmation sent");
          } catch (clientError) {
            console.log("Client confirmation error:", clientError);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            amount: session.amount_total,
            jobNumber: job?.job_number || "",
            clientName: job?.client_name || "",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: session.payment_status === "paid",
        amount: session.amount_total,
        status: session.payment_status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error verifying payment:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
