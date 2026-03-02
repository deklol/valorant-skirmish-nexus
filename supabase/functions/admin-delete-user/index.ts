import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin using service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: callerData, error: callerError } = await adminClient
      .from("users")
      .select("role")
      .eq("id", callerUser.id)
      .single();

    if (callerError || callerData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (user_id === callerUser.id) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user info before deletion for audit log
    const { data: targetUser } = await adminClient
      .from("users")
      .select("discord_username, riot_id, role")
      .eq("id", user_id)
      .single();

    // Prevent deleting other admins
    if (targetUser?.role === "admin") {
      return new Response(
        JSON.stringify({ error: "Cannot delete admin users" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up related data first (order matters for FK constraints)
    // Tournament signups
    await adminClient.from("tournament_signups").delete().eq("user_id", user_id);
    // Team members (tournament teams)
    await adminClient.from("team_members").delete().eq("user_id", user_id);
    // Persistent team members
    await adminClient.from("persistent_team_members").delete().eq("user_id", user_id);
    // Notifications
    await adminClient.from("notifications").delete().eq("user_id", user_id);
    // User onboarding progress
    await adminClient.from("user_onboarding_progress").delete().eq("user_id", user_id);
    // Faceit stats
    await adminClient.from("faceit_stats").delete().eq("user_id", user_id);
    // Push subscriptions
    await adminClient.from("push_subscriptions").delete().eq("user_id", user_id);
    // Rank history
    await adminClient.from("rank_history").delete().eq("user_id", user_id);
    // Quick match queue
    await adminClient.from("quick_match_queue").delete().eq("user_id", user_id);

    // Delete from public.users table
    const { error: deleteUserError } = await adminClient
      .from("users")
      .delete()
      .eq("id", user_id);

    if (deleteUserError) {
      console.error("Error deleting from users table:", deleteUserError);
      return new Response(
        JSON.stringify({ error: "Failed to delete user record: " + deleteUserError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete from auth.users (requires admin API)
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user_id);
    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError);
      // User record already deleted from public.users, log the issue
    }

    // Log audit
    await adminClient.from("audit_logs").insert({
      action: "user_deleted",
      table_name: "users",
      record_id: user_id,
      user_id: callerUser.id,
      old_values: {
        discord_username: targetUser?.discord_username,
        riot_id: targetUser?.riot_id,
        role: targetUser?.role,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${targetUser?.discord_username || user_id} deleted successfully` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-delete-user:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
