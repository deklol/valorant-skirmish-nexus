import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent deleting other admins
    if (targetUser?.role === "admin") {
      return new Response(
        JSON.stringify({ error: "Cannot delete admin users" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleting user ${user_id} (${targetUser.discord_username}). Starting cascading cleanup...`);

    // Clean up ALL related data (order matters for FK constraints)
    // 1. Fulfillment orders (references user_purchases)
    await adminClient.from("fulfillment_orders").delete().eq("user_id", user_id);

    // 2. User purchases
    await adminClient.from("user_purchases").delete().eq("user_id", user_id);

    // 3. User achievements & progress
    await adminClient.from("user_achievement_progress").delete().eq("user_id", user_id);
    await adminClient.from("user_achievements").delete().eq("user_id", user_id);

    // 4. User active effects (shop items)
    await adminClient.from("user_active_effects").delete().eq("user_id", user_id);

    // 5. User chat warnings
    await adminClient.from("user_chat_warnings").delete().eq("user_id", user_id);

    // 6. User follows (both directions)
    await adminClient.from("user_follows").delete().eq("follower_id", user_id);
    await adminClient.from("user_follows").delete().eq("following_id", user_id);

    // 7. User notification preferences
    await adminClient.from("user_notification_preferences").delete().eq("user_id", user_id);

    // 8. Tournament signups
    await adminClient.from("tournament_signups").delete().eq("user_id", user_id);

    // 9. Team members (tournament teams) - nullify instead of delete to preserve match history
    // Set user_id to null so the team member slot shows as "Deleted Player"
    await adminClient.from("team_members").update({ user_id: null }).eq("user_id", user_id);

    // 10. Persistent team members
    await adminClient.from("persistent_team_members").delete().eq("user_id", user_id);

    // 11. Notifications
    await adminClient.from("notifications").delete().eq("user_id", user_id);

    // 12. User onboarding progress
    await adminClient.from("user_onboarding_progress").delete().eq("user_id", user_id);

    // 13. Faceit stats
    await adminClient.from("faceit_stats").delete().eq("user_id", user_id);

    // 14. Push subscriptions
    await adminClient.from("push_subscriptions").delete().eq("user_id", user_id);

    // 15. Rank history
    await adminClient.from("rank_history").delete().eq("user_id", user_id);

    // 16. Quick match queue
    await adminClient.from("quick_match_queue").delete().eq("user_id", user_id);

    // 17. Match result submissions (nullify submitted_by)
    await adminClient.from("match_result_submissions").update({ submitted_by: null }).eq("submitted_by", user_id);

    // 18. Transfer persistent team captaincy or delete teams
    const { data: captainedTeams } = await adminClient
      .from("persistent_teams")
      .select("id")
      .eq("captain_id", user_id);

    if (captainedTeams && captainedTeams.length > 0) {
      for (const team of captainedTeams) {
        // Try to find another member to promote
        const { data: otherMember } = await adminClient
          .from("persistent_team_members")
          .select("user_id")
          .eq("team_id", team.id)
          .neq("user_id", user_id)
          .limit(1)
          .maybeSingle();

        if (otherMember) {
          await adminClient.from("persistent_teams").update({
            captain_id: otherMember.user_id,
            owner_id: otherMember.user_id
          }).eq("id", team.id);
        } else {
          // No other members, disband team
          await adminClient.from("persistent_team_invites").delete().eq("team_id", team.id);
          await adminClient.from("team_tournament_registrations").delete().eq("team_id", team.id);
          await adminClient.from("persistent_teams").delete().eq("id", team.id);
        }
      }
    }

    console.log(`Cascading cleanup complete. Deleting user record...`);

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

    console.log(`User ${targetUser.discord_username} (${user_id}) deleted successfully.`);

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
