import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegistrationRequest {
  accessToken: string;
  email: string;
  password: string;
}

// Rate limiting: 5 registration attempts per IP per 5 minutes
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_REQUESTS = 5;

function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, value] of rateLimits.entries()) {
    if (now > value.resetAt) {
      rateLimits.delete(key);
    }
  }
}

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
  cleanupRateLimits();
  const now = Date.now();
  const limit = rateLimits.get(identifier);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: limit.resetAt - now };
  }

  limit.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - limit.count, resetIn: limit.resetAt - now };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client identifier from IP or forwarded header
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // Check rate limit
    const rateCheck = checkRateLimit(`registration:${clientIp}`);
    if (!rateCheck.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: 'Too many registration attempts. Please try again later.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(rateCheck.resetIn / 1000).toString(),
          } 
        }
      );
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { accessToken, email, password } = await req.json() as RegistrationRequest;

    if (!accessToken || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Access token, email, and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!/[A-Z]/.test(password)) {
      return new Response(
        JSON.stringify({ error: 'Password must contain an uppercase letter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!/[a-z]/.test(password)) {
      return new Response(
        JSON.stringify({ error: 'Password must contain a lowercase letter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!/[0-9]/.test(password)) {
      return new Response(
        JSON.stringify({ error: 'Password must contain a number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const requestId = crypto.randomUUID().slice(0, 8);
    
    console.log(`[${requestId}] Registration request from IP: ${clientIp.substring(0, 10)}*** for: ${normalizedEmail.substring(0, 3)}***`);
    console.log(`[${requestId}] Rate limit status - Remaining: ${rateCheck.remaining}, Reset in: ${Math.ceil(rateCheck.resetIn / 1000)}s`);

    // Validate the access token and verify email matches
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .rpc('validate_access_token', { _token: accessToken });

    if (tokenError || !tokenData || tokenData.length === 0) {
      console.error('Token validation error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired access link' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessInfo = tokenData[0];
    
    // SECURITY: Verify the email matches the invited email
    const invitedEmail = accessInfo.invited_email?.toLowerCase().trim();
    if (invitedEmail && invitedEmail !== normalizedEmail) {
      return new Response(
        JSON.stringify({ error: 'Email does not match the invitation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the user by email
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
      // User doesn't exist yet - create them with the provided password
      console.log(`[${requestId}] Creating new user account`);
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          needs_password_setup: false,
        },
      });

      if (createError) {
        console.error(`[${requestId}] Error creating user:`, createError.message);
        throw createError;
      }

      console.log(`[${requestId}] User created successfully: ${newUser.user.id.substring(0, 8)}***`);
      const userId = newUser.user.id;

      // Add client role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'client' });

      if (roleError && roleError.code !== '23505') {
        console.error(`[${requestId}] Error adding client role:`, roleError.message);
      } else {
        console.log(`[${requestId}] Client role added`);
      }

      // Create client account
      const { data: clientAccount, error: clientError } = await supabaseAdmin
        .from('client_accounts')
        .insert({
          user_id: userId,
          email: normalizedEmail,
          full_name: accessInfo.client_name || '',
        })
        .select('id')
        .single();

      if (clientError && clientError.code !== '23505') {
        console.error(`[${requestId}] Error creating client account:`, clientError.message);
      } else if (clientAccount) {
        console.log(`[${requestId}] Client account created: ${clientAccount.id.substring(0, 8)}***`);
      }

      // Link to job access
      if (clientAccount) {
        await supabaseAdmin
          .from('client_job_access')
          .update({ client_id: clientAccount.id })
          .eq('access_token', accessToken);
        console.log(`[${requestId}] Linked client to job access`);
      }

      console.log(`[${requestId}] Registration completed successfully (new user)`);
      return new Response(
        JSON.stringify({ success: true, userId, isNewUser: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User exists - update their password
    console.log(`[${requestId}] Updating password for existing user: ${existingUser.id.substring(0, 8)}***`);
    
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      {
        password: password,
        user_metadata: {
          ...existingUser.user_metadata,
          needs_password_setup: false,
        },
      }
    );

    if (updateError) {
      console.error(`[${requestId}] Error updating user password:`, updateError.message);
      throw updateError;
    }
    console.log(`[${requestId}] Password updated successfully`);

    // Ensure client account exists and is linked
    const { data: existingClient } = await supabaseAdmin
      .from('client_accounts')
      .select('id')
      .eq('user_id', existingUser.id)
      .maybeSingle();

    let clientId = existingClient?.id;

    if (!clientId) {
      const { data: newClient, error: clientError } = await supabaseAdmin
        .from('client_accounts')
        .insert({
          user_id: existingUser.id,
          email: normalizedEmail,
          full_name: accessInfo.client_name || existingUser.user_metadata?.full_name || '',
        })
        .select('id')
        .single();

      if (!clientError) {
        clientId = newClient.id;
      }
    }

    // Link to job access if not already linked
    if (clientId) {
      await supabaseAdmin
        .from('client_job_access')
        .update({ client_id: clientId })
        .eq('access_token', accessToken)
        .is('client_id', null);
    }

    // Ensure client role exists
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: existingUser.id, role: 'client' });

    if (roleError && roleError.code !== '23505') {
      console.error(`[${requestId}] Error adding role:`, roleError.message);
    }

    console.log(`[${requestId}] Registration completed successfully (existing user)`);
    return new Response(
      JSON.stringify({ success: true, userId: existingUser.id, isNewUser: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Registration error:', error instanceof Error ? error.message : 'Unknown error');
    const errorMessage = error instanceof Error ? error.message : 'Failed to complete registration';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
