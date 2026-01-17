import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, clientName, jobNumber, rugDetails, pdfBase64, subject, customMessage, businessName, businessEmail, businessPhone }: EmailRequest = await req.json();

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
      `<tr><td style="padding:12px;border-bottom:1px solid #e5e7eb">${r.rugNumber}</td><td style="padding:12px;border-bottom:1px solid #e5e7eb">${r.rugType}</td><td style="padding:12px;border-bottom:1px solid #e5e7eb">${r.dimensions}</td></tr>`
    ).join("");
    
    const messageHtml = customMessage 
      ? customMessage.split('\n').map(l => `<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 15px">${l || '&nbsp;'}</p>`).join('')
      : `<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px">Dear <strong>${clientName}</strong>,</p><p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 30px">Thank you for choosing our services. Please find attached the detailed inspection report for Job #<strong>${jobNumber}</strong>.</p>`;

    const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f3f4f6"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center"><h1 style="color:white;margin:0;font-size:28px">${fromName}</h1><p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px">Rug Inspection Report</p></div><div style="background:white;padding:40px 30px;border-radius:0 0 16px 16px">${messageHtml}<div style="margin:30px 0"><h2 style="color:#1f2937;font-size:18px;margin:0 0 15px;border-bottom:2px solid #3b82f6;padding-bottom:10px">Rug Summary</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f9fafb"><th style="padding:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb">Rug #</th><th style="padding:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb">Type</th><th style="padding:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb">Dimensions</th></tr></thead><tbody>${rugSummaryHtml}</tbody></table></div>${pdfBase64 ? '<div style="background:#eff6ff;border-radius:12px;padding:20px;margin:30px 0;text-align:center"><p style="color:#1e40af;margin:0">📎 <strong>Detailed PDF report attached</strong></p></div>' : ''}<p style="color:#374151;font-size:16px;margin:30px 0 0">If you have questions, please contact us.</p><p style="color:#374151;font-size:16px;margin:20px 0 0">Best regards,<br><strong>${fromName}</strong></p></div><div style="text-align:center;padding:30px 20px"><p style="color:#6b7280;font-size:14px;margin:0">${businessPhone || ''}${businessPhone && businessEmail ? ' • ' : ''}${businessEmail || ''}</p></div></div></body></html>`;

    const attachments = pdfBase64 ? [{ filename: `Inspection_Report_Job_${jobNumber}.pdf`, content: pdfBase64 }] : [];

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
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
