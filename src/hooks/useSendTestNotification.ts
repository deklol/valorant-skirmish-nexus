
import { supabase } from "@/integrations/supabase/client";

/**
 * Send a test notification to user with discord_username = "_dek"
 * For testing notification UI.
 */
export async function sendDekTestNotification() {
  // 1. Lookup by discord_username (can tweak to use different field)
  const { data: userResult, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("discord_username", "_dek")
    .single();

  if (userError || !userResult?.id) {
    console.error("Could not find user _dek", userError);
    return { success: false, error: userError || "User not found" };
  }

  // 2. Send notification to them
  const { error: notifError } = await supabase.rpc("create_notification", {
    p_user_id: userResult.id,
    p_type: "test",
    p_title: "Test Notification",
    p_message: "Hello _dek! This is a test notification. If you see this, notifications work.",
    p_data: { isTest: true },
    p_tournament_id: null,
    p_match_id: null,
    p_team_id: null,
  });

  if (notifError) {
    console.error("Failed to send test notification:", notifError);
    return { success: false, error: notifError };
  }

  return { success: true };
}
