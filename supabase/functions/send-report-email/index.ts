import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 5; // Max 5 emails per minute per user
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

// Validate base64 string (basic check)
function isValidBase64(str: string): boolean {
  if (!str || str.length === 0) return true; // Optional field
  // Check if string only contains valid base64 characters
  return /^[A-Za-z0-9+/=]+$/.test(str);
}

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

// Input validation schema with stricter constraints and sanitization
const EmailRequestSchema = z.object({
  to: z.string().email().max(255),
  clientName: z.string().min(1).max(200).transform(sanitizeString),
  jobNumber: z.string().min(1).max(100).transform(sanitizeString),
  rugDetails: z.array(z.object({
    rugNumber: z.string().min(1).max(100).transform(sanitizeString),
    rugType: z.string().min(1).max(100).transform(sanitizeString),
    dimensions: z.string().max(100).transform(sanitizeString)
  })).max(50),
  pdfBase64: z.string().max(25000000).refine(isValidBase64, { message: "Invalid PDF data" }).optional(),
  subject: z.string().max(200).transform(sanitizeString).optional(),
  customMessage: z.string().max(5000).transform(sanitizeString).optional(),
  businessName: z.string().max(200).transform(sanitizeString).optional(),
  businessEmail: z.string().email().max(255).optional().or(z.literal("")),
  businessPhone: z.string().max(50).transform(sanitizeString).optional(),
});

// Helper function to escape HTML to prevent XSS
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

    console.log("Sending email to:", to, "Job:", jobNumber, "Has attachment:", !!pdfBase64);

    // Check for Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    
    // Get the verified from email address
    const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";

    const fromName = businessName || "Rug Inspection Service";
    const rugSummaryHtml = rugDetails.map(r => 
      `<tr><td style="padding:12px;border-bottom:1px solid #e5e7eb">${escapeHtml(r.rugNumber)}</td><td style="padding:12px;border-bottom:1px solid #e5e7eb">${escapeHtml(r.rugType)}</td><td style="padding:12px;border-bottom:1px solid #e5e7eb">${escapeHtml(r.dimensions)}</td></tr>`
    ).join("");
    
    const messageHtml = customMessage 
      ? customMessage.split('\n').map(l => `<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 15px">${escapeHtml(l) || '&nbsp;'}</p>`).join('')
      : `<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px">Dear <strong>${escapeHtml(clientName)}</strong>,</p><p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 30px">Thank you for choosing our services. Please find attached the detailed inspection report for Job #<strong>${escapeHtml(jobNumber)}</strong>.</p>`;

    const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f3f4f6"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center"><h1 style="color:white;margin:0;font-size:28px">${escapeHtml(fromName)}</h1><p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:16px">Rug Inspection Report</p></div><div style="background:white;padding:40px 30px;border-radius:0 0 16px 16px">${messageHtml}<div style="margin:30px 0"><h2 style="color:#1f2937;font-size:18px;margin:0 0 15px;border-bottom:2px solid #3b82f6;padding-bottom:10px">Rug Summary</h2><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f9fafb"><th style="padding:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb">Rug #</th><th style="padding:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb">Type</th><th style="padding:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb">Dimensions</th></tr></thead><tbody>${rugSummaryHtml}</tbody></table></div>${pdfBase64 ? '<div style="background:#eff6ff;border-radius:12px;padding:20px;margin:30px 0;text-align:center"><p style="color:#1e40af;margin:0">📎 <strong>Detailed PDF report attached</strong></p></div>' : ''}<p style="color:#374151;font-size:16px;margin:30px 0 0">If you have questions, please contact us.</p><p style="color:#374151;font-size:16px;margin:20px 0 0">Best regards,<br><strong>${escapeHtml(fromName)}</strong></p></div><div style="text-align:center;padding:30px 20px"><p style="color:#6b7280;font-size:14px;margin:0">${escapeHtml(businessPhone || '')}${businessPhone && businessEmail ? ' • ' : ''}${escapeHtml(businessEmail || '')}</p></div></div></body></html>`;

    // Prepare attachments for Resend
    const attachments = pdfBase64 ? [{
      filename: `Inspection_Report_Job_${jobNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`,
      content: pdfBase64,
    }] : [];

    // Send email using Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: subject || `Rug Inspection Report - Job #${jobNumber}`,
      html: emailHtml,
      attachments,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${emailError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully! ID:", emailData?.id);
    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailData?.id,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetIn: Math.ceil(rateLimit.resetIn / 1000)
        }
      }), 
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } }
    );
  }
};

serve(handler);
