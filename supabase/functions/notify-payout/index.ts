import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@rugboost.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayoutNotificationRequest {
  payout_id: string;
  notification_type: "created" | "completed";
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
};

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-payout function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { payout_id, notification_type }: PayoutNotificationRequest = await req.json();

    console.log(`Processing ${notification_type} notification for payout: ${payout_id}`);

    // Fetch payout details
    const { data: payout, error: payoutError } = await supabase
      .from("payouts")
      .select("*")
      .eq("id", payout_id)
      .single();

    if (payoutError || !payout) {
      console.error("Error fetching payout:", payoutError);
      throw new Error("Payout not found");
    }

    // Fetch business profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", payout.user_id)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      throw new Error("Business profile not found");
    }

    const businessName = profile.business_name || profile.full_name || "Business Owner";
    const recipientEmail = profile.business_email;

    if (!recipientEmail) {
      console.log("No business email configured, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No email configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let subject: string;
    let htmlContent: string;

    if (notification_type === "created") {
      subject = `Payout Initiated - ${formatCurrency(payout.amount)}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .amount { font-size: 32px; font-weight: bold; color: #4f46e5; margin: 20px 0; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">💰 Payout Initiated</h1>
            </div>
            <div class="content">
              <p>Hello ${businessName},</p>
              <p>Great news! A payout has been initiated for your account:</p>
              
              <div class="amount">${formatCurrency(payout.amount)}</div>
              
              <div class="details">
                <div class="detail-row">
                  <span>Status</span>
                  <span class="badge">Pending</span>
                </div>
                <div class="detail-row">
                  <span>Payment Method</span>
                  <span>${payout.payment_method || "To be determined"}</span>
                </div>
                ${payout.period_start && payout.period_end ? `
                <div class="detail-row">
                  <span>Period</span>
                  <span>${payout.period_start} to ${payout.period_end}</span>
                </div>
                ` : ""}
                ${payout.notes ? `
                <div class="detail-row">
                  <span>Notes</span>
                  <span>${payout.notes}</span>
                </div>
                ` : ""}
              </div>
              
              <p>You will receive another notification once the payout has been completed and the funds have been transferred.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from RugBoost Platform</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = `Payout Completed - ${formatCurrency(payout.amount)}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .amount { font-size: 32px; font-weight: bold; color: #059669; margin: 20px 0; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✅ Payout Completed</h1>
            </div>
            <div class="content">
              <p>Hello ${businessName},</p>
              <p>Your payout has been successfully completed!</p>
              
              <div class="amount">${formatCurrency(payout.amount)}</div>
              
              <div class="details">
                <div class="detail-row">
                  <span>Status</span>
                  <span class="badge">Completed</span>
                </div>
                <div class="detail-row">
                  <span>Payment Method</span>
                  <span>${payout.payment_method || "N/A"}</span>
                </div>
                ${payout.reference_number ? `
                <div class="detail-row">
                  <span>Reference Number</span>
                  <span style="font-family: monospace;">${payout.reference_number}</span>
                </div>
                ` : ""}
                ${payout.paid_at ? `
                <div class="detail-row">
                  <span>Paid On</span>
                  <span>${new Date(payout.paid_at).toLocaleDateString("en-US", { 
                    year: "numeric", 
                    month: "long", 
                    day: "numeric" 
                  })}</span>
                </div>
                ` : ""}
              </div>
              
              <p>The funds should appear in your account according to your payment method's typical processing time.</p>
              <p>Thank you for being a valued partner!</p>
            </div>
            <div class="footer">
              <p>This is an automated message from RugBoost Platform</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    console.log(`Sending ${notification_type} notification to: ${recipientEmail}`);

    const emailResponse = await resend.emails.send({
      from: `RugBoost <${fromEmail}>`,
      to: [recipientEmail],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-payout function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
