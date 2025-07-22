import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending email notifications
    const { data: emails, error: emailError } = await supabase
      .from('email_notification_queue')
      .select(`
        *,
        users!inner(discord_username, email)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(50);

    if (emailError) {
      throw emailError;
    }

    if (!emails || emails.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: 'No pending emails' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processedCount = 0;

    for (const email of emails) {
      try {
        const user = email.users as any;
        
        // Generate email content based on notification type
        let htmlContent = `
          <h2>${email.subject}</h2>
          <p>${email.content}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            This email was sent from Tournament App. 
            <a href="${Deno.env.get('SUPABASE_URL')}/settings/notifications">Manage your notification preferences</a>
          </p>
        `;

        // Enhanced email templates based on notification type
        if (email.notification_type === 'tournament_created') {
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2563eb;">🏆 New Tournament Available!</h1>
              <h2>${email.subject}</h2>
              <p style="font-size: 16px;">${email.content}</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Tournament Details:</strong></p>
                ${email.template_data?.tournament_id ? `<p>Tournament ID: ${email.template_data.tournament_id}</p>` : ''}
              </div>
              <a href="${Deno.env.get('SUPABASE_URL')}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Tournament</a>
              <hr style="margin-top: 40px;">
              <p style="color: #666; font-size: 12px;">
                Tournament App | <a href="${Deno.env.get('SUPABASE_URL')}/settings/notifications">Notification Settings</a>
              </p>
            </div>
          `;
        } else if (email.notification_type === 'match_ready') {
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #dc2626;">⚡ Match Ready!</h1>
              <h2>${email.subject}</h2>
              <p style="font-size: 16px;">${email.content}</p>
              <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                <p><strong>🎮 Your match is ready to start!</strong></p>
                <p>Please join the tournament lobby and prepare for your match.</p>
              </div>
              <a href="${Deno.env.get('SUPABASE_URL')}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Match</a>
              <hr style="margin-top: 40px;">
              <p style="color: #666; font-size: 12px;">
                Tournament App | <a href="${Deno.env.get('SUPABASE_URL')}/settings/notifications">Notification Settings</a>
              </p>
            </div>
          `;
        }

        const { error: sendError } = await resend.emails.send({
          from: 'Tournament App <tournaments@resend.dev>',
          to: [user.email],
          subject: email.subject,
          html: htmlContent,
        });

        if (sendError) {
          throw sendError;
        }

        // Mark email as sent
        await supabase
          .from('email_notification_queue')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', email.id);

        processedCount++;
        console.log(`Email sent successfully to ${user.email} for notification type: ${email.notification_type}`);

      } catch (error) {
        console.error(`Failed to send email ${email.id}:`, error);
        
        // Mark email as failed
        await supabase
          .from('email_notification_queue')
          .update({ 
            status: 'failed', 
            error_message: error.message 
          })
          .eq('id', email.id);
      }
    }

    return new Response(JSON.stringify({ processed: processedCount, total: emails.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-email-notification function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);