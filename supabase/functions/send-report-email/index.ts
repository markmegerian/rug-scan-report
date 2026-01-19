import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Allowed origins for CORS - restricts to known application domains
const ALLOWED_ORIGINS = [
  "https://rug-scan-report.lovable.app",
  "https://id-preview--fef72b1b-d121-4ff6-bcc3-c957ca919cde.lovable.app",
  "https://fef72b1b-d121-4ff6-bcc3-c957ca919cde.lovableproject.com",
  "https://sandbox.gmit.io",
  Deno.env.get("APP_ORIGIN") || ""
].filter(Boolean);

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

// Input validation schema
const EmailRequestSchema = z.object({
  to: z.string().email().max(255),
  clientName: z.string().min(1).max(200),
  jobNumber: z.string().min(1).max(100),
  rugDetails: z.array(z.object({
    rugNumber: z.string().min(1).max(100),
    rugType: z.string().min(1).max(100),
    dimensions: z.string().max(100)
  })).max(50),
  pdfBase64: z.string().max(10000000).optional(), // ~7.5MB max PDF
  subject: z.string().max(200).optional(),
  customMessage: z.string().max(5000).optional(),
  businessName: z.string().max(200).optional(),
  businessEmail: z.string().email().max(255).optional().or(z.literal("")),
  businessPhone: z.string().max(50).optional(),
});

// SMTP client that handles STARTTLS on port 587
async function sendSMTPEmail(options: {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}) {
  const { host, port, username, password, from, to, subject, html, attachments } = options;
  
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Connect with plain TCP first
  let conn: Deno.TcpConn | Deno.TlsConn = await Deno.connect({ hostname: host, port });
  
  const readResponse = async (): Promise<string> => {
    const buffer = new Uint8Array(4096);
    let response = "";
    try {
      const n = await conn.read(buffer);
      if (n) response = decoder.decode(buffer.subarray(0, n));
    } catch (e) {
      console.log("Read error:", e);
    }
    console.log("SMTP <", response.trim());
    return response;
  };
  
  const sendCommand = async (cmd: string, hideLog = false): Promise<string> => {
    console.log("SMTP >", hideLog ? cmd.split(" ")[0] + " ***" : cmd);
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await readResponse();
  };
  
  try {
    // Read server greeting
    await readResponse();
    
    // EHLO
    await sendCommand(`EHLO localhost`);
    
    // STARTTLS
    const starttlsResp = await sendCommand("STARTTLS");
    if (starttlsResp.startsWith("220")) {
      // Upgrade to TLS
      conn = await Deno.startTls(conn, { hostname: host });
      console.log("TLS connection established");
      
      // EHLO again after TLS
      await sendCommand(`EHLO localhost`);
    }
    
    // AUTH LOGIN
    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(username), true);
    const authResp = await sendCommand(btoa(password), true);
    
    if (!authResp.startsWith("235")) {
      throw new Error("Authentication failed: " + authResp);
    }
    
    // MAIL FROM
    await sendCommand(`MAIL FROM:<${username}>`);
    
    // RCPT TO
    await sendCommand(`RCPT TO:<${to}>`);
    
    // DATA
    await sendCommand("DATA");
    
    // Build MIME email
    const boundary = "----=_Part_" + Math.random().toString(36).substring(2);
    
    let emailContent = `From: ${from}\r\n`;
    emailContent += `To: ${to}\r\n`;
    emailContent += `Subject: ${subject}\r\n`;
    emailContent += `MIME-Version: 1.0\r\n`;
    
    if (attachments && attachments.length > 0) {
      emailContent += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
      emailContent += `--${boundary}\r\n`;
      emailContent += `Content-Type: text/html; charset=utf-8\r\n`;
      emailContent += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
      emailContent += html + "\r\n";
      
      for (const att of attachments) {
        emailContent += `--${boundary}\r\n`;
        emailContent += `Content-Type: application/pdf; name="${att.filename}"\r\n`;
        emailContent += `Content-Disposition: attachment; filename="${att.filename}"\r\n`;
        emailContent += `Content-Transfer-Encoding: base64\r\n\r\n`;
        // Split base64 into 76-char lines
        const b64 = att.content;
        for (let i = 0; i < b64.length; i += 76) {
          emailContent += b64.substring(i, i + 76) + "\r\n";
        }
      }
      emailContent += `--${boundary}--\r\n`;
    } else {
      emailContent += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
      emailContent += html + "\r\n";
    }
    
    emailContent += "\r\n.\r\n";
    
    console.log("SMTP > [EMAIL CONTENT]");
    await conn.write(encoder.encode(emailContent));
    const dataResp = await readResponse();
    
    if (!dataResp.startsWith("250")) {
      throw new Error("Failed to send email data: " + dataResp);
    }
    
    // QUIT
    await sendCommand("QUIT");
    
  } finally {
    try { conn.close(); } catch (_) {}
  }
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  
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

    console.log("Authenticated user:", claimsData.claims.sub);

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

    const validationResult = EmailRequestSchema.safeParse(body);
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

    const { to, clientName, jobNumber, rugDetails, pdfBase64, subject, customMessage, businessName, businessEmail, businessPhone } = validationResult.data;

    console.log("Sending email to:", to, "Job:", jobNumber, "Attachment:", !!pdfBase64);

    const smtpHost = Deno.env.get("SMTP_HOST") || "";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER") || "";
    const smtpPassword = Deno.env.get("SMTP_PASSWORD") || "";

    if (!smtpHost || !smtpUser || !smtpPassword) {
      throw new Error("SMTP configuration incomplete");
    }

    const fromName = businessName || "Rug Inspection Service";
    const rugSummaryHtml = rugDetails.map(r => 
      `<tr><td style="padding:12px;border-bottom:1px solid #e5e7eb">${escapeHtml(r.rugNumber)}</td><td style="padding:12px;border-bottom:1px solid #e5e7eb">${escapeHtml(r.rugType)}</td><td style="padding:12px;border-bottom:1px solid #e5e7eb">${escapeHtml(r.dimensions)}</td></tr>`
    ).join("");
    
    const messageHtml = customMessage 
      ? customMessage.split('\n').map(l => `<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 15px">${escapeHtml(l) || '&nbsp;'}</p>`).join('')
      : `<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px">Dear <strong>${escapeHtml(clientName)}</strong>,</p><p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 30px">Thank you for choosing our services. Please find attached the detailed inspection report for Job #<strong>${escapeHtml(jobNumber)}</strong>.</p>`;

    const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f3f4f6"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center"><h1 style="color:white;margin:0;font-size:28px">${escapeHtml(fromName)}</h1><p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px">Rug Inspection Report</p></div><div style="background:white;padding:40px 30px;border-radius:0 0 16px 16px">${messageHtml}<div style="margin:30px 0"><h2 style="color:#1f2937;font-size:18px;margin:0 0 15px;border-bottom:2px solid #3b82f6;padding-bottom:10px">Rug Summary</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f9fafb"><th style="padding:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb">Rug #</th><th style="padding:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb">Type</th><th style="padding:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb">Dimensions</th></tr></thead><tbody>${rugSummaryHtml}</tbody></table></div>${pdfBase64 ? '<div style="background:#eff6ff;border-radius:12px;padding:20px;margin:30px 0;text-align:center"><p style="color:#1e40af;margin:0">📎 <strong>Detailed PDF report attached</strong></p></div>' : ''}<p style="color:#374151;font-size:16px;margin:30px 0 0">If you have questions, please contact us.</p><p style="color:#374151;font-size:16px;margin:20px 0 0">Best regards,<br><strong>${escapeHtml(fromName)}</strong></p></div><div style="text-align:center;padding:30px 20px"><p style="color:#6b7280;font-size:14px;margin:0">${escapeHtml(businessPhone || '')}${businessPhone && businessEmail ? ' • ' : ''}${escapeHtml(businessEmail || '')}</p></div></div></body></html>`;

    const attachments = pdfBase64 ? [{ filename: `Inspection_Report_Job_${jobNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`, content: pdfBase64 }] : [];

    await sendSMTPEmail({
      host: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPassword,
      from: `"${fromName}" <${smtpUser}>`,
      to,
      subject: subject || `Rug Inspection Report - Job #${jobNumber}`,
      html: emailHtml,
      attachments,
    });

    console.log("Email sent successfully!");
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } });
  }
};

// Helper function to escape HTML to prevent XSS
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

serve(handler);