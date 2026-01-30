import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client for verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log(`Starting account deletion for user: ${userId}`);

    // Admin client for deletion operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Delete user's storage files (rug photos)
    try {
      const { data: files } = await adminClient.storage
        .from("rug-photos")
        .list(userId);
      
      if (files && files.length > 0) {
        // List all files in user's folder recursively
        const filePaths = files.map(f => `${userId}/${f.name}`);
        await adminClient.storage.from("rug-photos").remove(filePaths);
        console.log(`Deleted ${filePaths.length} storage files`);
      }
    } catch (storageError) {
      console.error("Storage deletion error:", storageError);
      // Continue with other deletions
    }

    // Step 2: Get all job IDs for this user (needed for cascade deletes)
    const { data: jobs } = await adminClient
      .from("jobs")
      .select("id")
      .eq("user_id", userId);
    
    const jobIds = jobs?.map(j => j.id) || [];

    // Step 3: Delete related data in order (respecting foreign keys)
    
    // Delete service completions (via approved_estimates)
    if (jobIds.length > 0) {
      const { data: estimates } = await adminClient
        .from("approved_estimates")
        .select("id")
        .in("job_id", jobIds);
      
      const estimateIds = estimates?.map(e => e.id) || [];
      if (estimateIds.length > 0) {
        await adminClient.from("service_completions").delete().in("approved_estimate_id", estimateIds);
        await adminClient.from("client_service_selections").delete().in("approved_estimate_id", estimateIds);
      }
    }

    // Delete approved estimates
    if (jobIds.length > 0) {
      await adminClient.from("approved_estimates").delete().in("job_id", jobIds);
    }

    // Delete inspections
    if (jobIds.length > 0) {
      await adminClient.from("inspections").delete().in("job_id", jobIds);
    }

    // Delete payments
    if (jobIds.length > 0) {
      await adminClient.from("payments").delete().in("job_id", jobIds);
    }

    // Delete client job access
    if (jobIds.length > 0) {
      await adminClient.from("client_job_access").delete().in("job_id", jobIds);
    }

    // Delete jobs
    await adminClient.from("jobs").delete().eq("user_id", userId);

    // Delete payouts
    await adminClient.from("payouts").delete().eq("user_id", userId);

    // Delete AI analysis feedback
    await adminClient.from("ai_analysis_feedback").delete().eq("user_id", userId);

    // Delete notifications
    await adminClient.from("notifications").delete().eq("user_id", userId);

    // Delete push tokens
    await adminClient.from("push_tokens").delete().eq("user_id", userId);

    // Delete service prices
    await adminClient.from("service_prices").delete().eq("user_id", userId);

    // Delete email templates
    await adminClient.from("email_templates").delete().eq("user_id", userId);

    // Delete user roles
    await adminClient.from("user_roles").delete().eq("user_id", userId);

    // Delete profile (last before auth user)
    await adminClient.from("profiles").delete().eq("user_id", userId);

    console.log(`Deleted all user data for: ${userId}`);

    // Step 4: Delete the auth user
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      console.error("Error deleting auth user:", deleteUserError);
      return new Response(
        JSON.stringify({ error: "Failed to delete user account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully deleted user account: ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Account deletion error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});