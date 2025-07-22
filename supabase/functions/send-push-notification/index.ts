import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { userIds, payload }: { userIds: string[], payload: PushPayload } = await req.json();

    console.log('Sending push notifications to users:', userIds);

    // Get all active push subscriptions for the users
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (subError) {
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active push subscriptions found for users');
      return new Response(JSON.stringify({ sent: 0, message: 'No active subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sentCount = 0;
    const failedSubscriptions = [];

    // Send notifications to each subscription
    for (const subscription of subscriptions) {
      try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${vapidPrivateKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: subscription.subscription_data.token,
            notification: {
              title: payload.title,
              body: payload.body,
              icon: payload.icon || '/icon-192x192.png',
              badge: payload.badge || '/icon-192x192.png',
              tag: payload.tag,
            },
            data: payload.data || {},
          }),
        });

        if (response.ok) {
          sentCount++;
          console.log(`Push notification sent successfully to user ${subscription.user_id}`);
        } else {
          const errorText = await response.text();
          console.error(`Failed to send push notification to user ${subscription.user_id}:`, errorText);
          failedSubscriptions.push(subscription.id);
        }
      } catch (error) {
        console.error(`Error sending push notification to user ${subscription.user_id}:`, error);
        failedSubscriptions.push(subscription.id);
      }
    }

    // Deactivate failed subscriptions
    if (failedSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('id', failedSubscriptions);
    }

    return new Response(JSON.stringify({ 
      sent: sentCount, 
      total: subscriptions.length,
      failed: failedSubscriptions.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);