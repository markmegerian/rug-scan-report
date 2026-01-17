import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "https://esm.sh/nodemailer@6.9.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  clientName: string;
  jobNumber: string;
  rugDetails: { rugNumber: string; rugType: string; dimensions: string }[];
  pdfBase64?: string;
  subject?: string;
  customMessage?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, clientName, jobNumber, rugDetails, pdfBase64, subject, customMessage, businessName, businessEmail, businessPhone }: EmailRequest = await req.json();

    console.log("Sending email to:", to, "Job:", jobNumber);

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");

    if (!smtpHost || !smtpUser || !smtpPassword) throw new Error("SMTP configuration incomplete");

    const transporter = nodemailer.createTransport({
      host: smtpHost, port: smtpPort, secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    });

    const fromName = businessName || "Rug Inspection Service";
    const rugSummaryHtml = rugDetails.map(r => `<tr><td style="padding:12px;border-bottom:1px solid #e5e7eb">${r.rugNumber}</td><td style="padding:12px;border-bottom:1px solid #e5e7eb">${r.rugType}</td><td style="padding:12px;border-bottom:1px solid #e5e7eb">${r.dimensions}</td></tr>`).join("");
    
    const messageHtml = customMessage 
      ? customMessage.split('\n').map(l => `<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 15px">${l || '&nbsp;'}</p>`).join('')
      : `<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px">Dear <strong>${clientName}</strong>,</p><p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 30px">Thank you for choosing our services. Please find attached the detailed inspection report for Job #<strong>${jobNumber}</strong>.</p>`;

    const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f3f4f6"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center"><h1 style="color:white;margin:0;font-size:28px;font-weight:700">${fromName}</h1><p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px">Rug Inspection Report</p></div><div style="background:white;padding:40px 30px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)">${messageHtml}<div style="margin:30px 0"><h2 style="color:#1f2937;font-size:18px;margin:0 0 15px;padding-bottom:10px;border-bottom:2px solid #3b82f6">Rug Summary</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f9fafb"><th style="padding:12px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">Rug #</th><th style="padding:12px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">Type</th><th style="padding:12px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">Dimensions</th></tr></thead><tbody>${rugSummaryHtml}</tbody></table></div>${pdfBase64 ? '<div style="background:#eff6ff;border-radius:12px;padding:20px;margin:30px 0;text-align:center"><p style="color:#1e40af;margin:0;font-size:14px">📎 <strong>Detailed PDF report attached</strong></p></div>' : ''}<p style="color:#374151;font-size:16px;line-height:1.6;margin:30px 0 0">If you have any questions, please don\'t hesitate to contact us.</p><p style="color:#374151;font-size:16px;line-height:1.6;margin:20px 0 0">Best regards,<br><strong>${fromName}</strong></p></div><div style="text-align:center;padding:30px 20px"><p style="color:#6b7280;font-size:14px;margin:0">${businessPhone ? `📞 ${businessPhone}` : ''}${businessPhone && businessEmail ? ' • ' : ''}${businessEmail ? `✉️ ${businessEmail}` : ''}</p></div></div></body></html>`;

    const mailOptions: any = {
      from: `"${fromName}" <${smtpUser}>`,
      to, subject: subject || `Rug Inspection Report - Job #${jobNumber}`,
      html: emailHtml,
    };

    if (pdfBase64) {
      mailOptions.attachments = [{ filename: `Inspection_Report_Job_${jobNumber}.pdf`, content: pdfBase64, encoding: 'base64' }];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
