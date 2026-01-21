import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  email: string;
  fullName: string;
  jobId: string;
  accessToken: string;
  jobNumber: string;
  portalUrl: string;
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Replace template variables
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, fullName, jobId, accessToken, jobNumber, portalUrl } = await req.json() as InviteRequest;

    if (!email || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Email and access token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Inviting client: ${normalizedEmail} for job ${jobId}`);

    let userId: string;
    let isNewUser = false;
    let tempPassword: string | null = null;

    // Try to create the user first - if they exist, we'll handle that error
    tempPassword = crypto.randomUUID().slice(0, 16);
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        needs_password_setup: true,
      },
    });

    if (createError) {
      // Check if it's an "email exists" error
      if (createError.code === 'email_exists' || createError.message?.includes('already been registered')) {
        console.log('User already exists, fetching existing user...');
        
        // Fetch user by email using the admin API
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (listError) {
          console.error('Error listing users:', listError);
          throw listError;
        }

        const existingUser = usersData?.users?.find(
          u => u.email?.toLowerCase() === normalizedEmail
        );

        if (!existingUser) {
          throw new Error('User exists but could not be retrieved');
        }

        userId = existingUser.id;
        isNewUser = false;
        tempPassword = null;
        console.log('Found existing user:', userId);
      } else {
        console.error('Error creating user:', createError);
        throw createError;
      }
    } else {
      userId = newUser.user.id;
      isNewUser = true;
      console.log('Created new user:', userId);

      // Add client role for new users
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'client' });

      if (roleError && roleError.code !== '23505') {
        console.error('Error adding role:', roleError);
      }
    }

    // Check if client account exists
    const { data: existingClient } = await supabaseAdmin
      .from('client_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let clientId: string;

    if (existingClient) {
      clientId = existingClient.id;
      console.log('Using existing client account:', clientId);
    } else {
      // Create client account
      const { data: newClient, error: clientError } = await supabaseAdmin
        .from('client_accounts')
        .insert({
          user_id: userId,
          email: normalizedEmail,
          full_name: fullName,
        })
        .select('id')
        .single();

      if (clientError) {
        console.error('Error creating client account:', clientError);
        throw clientError;
      }
      clientId = newClient.id;
      console.log('Created new client account:', clientId);
    }

    // Link client to job access
    const { error: linkError } = await supabaseAdmin
      .from('client_job_access')
      .update({ client_id: clientId })
      .eq('access_token', accessToken);

    if (linkError) {
      console.error('Error linking client to job:', linkError);
    } else {
      console.log('Linked client to job access');
    }

    // Variable to track email status
    let emailSentSuccessfully = false;
    let emailErrorMessage: string | null = null;

    // Get job owner's profile for branding
    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('user_id')
      .eq('id', jobId)
      .single();

    let businessName = 'Rug Cleaning Service';
    let businessPhone = '';
    let businessEmail = '';
    let customTemplate = null;

    if (job?.user_id) {
      // Get branding
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('business_name, business_phone, business_email')
        .eq('user_id', job.user_id)
        .single();

      if (profile) {
        businessName = profile.business_name || businessName;
        businessPhone = profile.business_phone || '';
        businessEmail = profile.business_email || '';
      }

      // Check for custom email template
      const { data: template } = await supabaseAdmin
        .from('email_templates')
        .select('subject, body')
        .eq('user_id', job.user_id)
        .eq('template_type', 'client_invite')
        .single();

      if (template) {
        customTemplate = template;
      }
    }

    // Send invite email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && portalUrl) {
      try {
        const resend = new Resend(resendApiKey);
        const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev';

        const templateVariables: Record<string, string> = {
          client_name: fullName || 'Valued Customer',
          business_name: businessName,
          business_phone: businessPhone,
          business_email: businessEmail,
          job_number: jobNumber || '',
          portal_link: portalUrl,
        };

        let emailSubject: string;
        let emailBody: string;

        if (customTemplate) {
          // Use custom template
          emailSubject = replaceTemplateVariables(customTemplate.subject, templateVariables);
          emailBody = replaceTemplateVariables(customTemplate.body, templateVariables);
        } else {
          // Use default template
          emailSubject = `Your Rug Inspection Estimate is Ready - ${businessName}`;
          emailBody = `Dear ${fullName || 'Valued Customer'},

Thank you for choosing ${businessName} for your rug care needs.

We have completed the inspection of your rugs and prepared a detailed estimate for the recommended services. Please click the link below to review your estimate and approve the services you'd like us to proceed with:

${portalUrl}

Your Job Number: #${jobNumber || 'N/A'}

If you have any questions, please don't hesitate to contact us${businessPhone ? ` at ${businessPhone}` : ''}.

Best regards,
${businessName}`;
        }

        // Convert plain text to HTML
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f3f4f6; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0; }
              .content { background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; }
              .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 25px 0; }
              .footer { text-align: center; padding: 30px 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">${escapeHtml(businessName)}</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">Your Estimate is Ready</p>
              </div>
              <div class="content">
                ${emailBody.split('\n').map(line => 
                  line.startsWith('http') 
                    ? `<p style="text-align: center;"><a href="${escapeHtml(line)}" class="cta-button">View Your Estimate</a></p>`
                    : `<p style="margin: 15px 0;">${escapeHtml(line) || '&nbsp;'}</p>`
                ).join('')}
              </div>
              <div class="footer">
                ${businessPhone ? `<p style="margin: 0;">📞 ${escapeHtml(businessPhone)}</p>` : ''}
                ${businessEmail ? `<p style="margin: 5px 0 0;">✉️ ${escapeHtml(businessEmail)}</p>` : ''}
              </div>
            </div>
          </body>
          </html>
        `;

        const { error: emailError } = await resend.emails.send({
          from: `${businessName} <${fromEmail}>`,
          to: [normalizedEmail],
          subject: emailSubject,
          html: emailHtml,
        });

        if (emailError) {
          console.error('Error sending invite email:', emailError);
          emailErrorMessage = typeof emailError === 'object' ? JSON.stringify(emailError) : String(emailError);
        } else {
          console.log('Invite email sent successfully');
          emailSentSuccessfully = true;
        }
      } catch (emailErr) {
        console.error('Failed to send invite email:', emailErr);
        emailErrorMessage = emailErr instanceof Error ? emailErr.message : String(emailErr);
      }
    } else {
      console.log('Skipping email - no RESEND_API_KEY or portalUrl');
      emailErrorMessage = 'Email not configured (missing RESEND_API_KEY or portalUrl)';
    }

    // Update client_job_access with email status
    const { error: updateError } = await supabaseAdmin
      .from('client_job_access')
      .update({
        email_sent_at: emailSentSuccessfully ? new Date().toISOString() : null,
        email_error: emailErrorMessage,
      })
      .eq('access_token', accessToken);

    if (updateError) {
      console.error('Error updating email status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        clientId,
        isNewUser,
        tempPassword: isNewUser ? tempPassword : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Invite client error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to invite client';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
