import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  clientName: string;
  jobNumber: string;
  rugDetails: {
    rugNumber: string;
    rugType: string;
    dimensions: string;
  }[];
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      to,
      clientName,
      jobNumber,
      rugDetails,
      businessName,
      businessEmail,
      businessPhone,
    }: EmailRequest = await req.json();

    console.log("Sending email to:", to);
    console.log("Job number:", jobNumber);
    console.log("Number of rugs:", rugDetails.length);

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");

    if (!smtpHost || !smtpUser || !smtpPassword) {
      throw new Error("SMTP configuration is incomplete");
    }

    const client = new SmtpClient();

    await client.connectTLS({
      hostname: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPassword,
    });

    const fromName = businessName || "Rug Inspection Service";

    // Build rug summary HTML
    const rugSummaryHtml = rugDetails
      .map(
        (rug) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${rug.rugNumber}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${rug.rugType}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${rug.dimensions}</td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">${fromName}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Rug Inspection Report</p>
    </div>
    
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Dear <strong>${clientName}</strong>,
      </p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
        Thank you for choosing our services. Please find below the inspection report for Job #<strong>${jobNumber}</strong>.
      </p>
      
      <div style="margin: 30px 0;">
        <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #3b82f6;">
          Rug Summary
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Rug #</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Type</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Dimensions</th>
            </tr>
          </thead>
          <tbody>
            ${rugSummaryHtml}
          </tbody>
        </table>
      </div>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 30px 0 0 0;">
        If you have any questions about this report, please don't hesitate to contact us.
      </p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
        Best regards,<br>
        <strong>${fromName}</strong>
      </p>
    </div>
    
    <div style="text-align: center; padding: 30px 20px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        ${businessPhone ? `📞 ${businessPhone}` : ''}
        ${businessPhone && businessEmail ? ' • ' : ''}
        ${businessEmail ? `✉️ ${businessEmail}` : ''}
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 15px 0 0 0;">
        This email was sent automatically.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    await client.send({
      from: smtpUser,
      to: to,
      subject: `Rug Inspection Report - Job #${jobNumber}`,
      content: "Please view this email in an HTML-compatible email client.",
      html: emailHtml,
    });

    await client.close();

    console.log("Email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
