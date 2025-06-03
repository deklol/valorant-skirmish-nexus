
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9'
import { corsHeaders } from '../_shared/cors.ts'

interface LogoutAllRequest {
  confirm: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the current user from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: userError } = await supabaseServiceRole.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabaseServiceRole
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || userProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { confirm }: LogoutAllRequest = await req.json()

    if (!confirm) {
      return new Response(
        JSON.stringify({ error: 'Confirmation required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get all active sessions
    const { data: sessions, error: sessionsError } = await supabaseServiceRole.auth.admin.listUsers()
    
    if (sessionsError) {
      console.error('Error fetching users:', sessionsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Sign out all users by invalidating their sessions
    let loggedOutCount = 0
    const errors: string[] = []

    for (const userToLogout of sessions.users) {
      try {
        const { error } = await supabaseServiceRole.auth.admin.signOut(userToLogout.id, 'global')
        if (error) {
          errors.push(`Failed to sign out user ${userToLogout.id}: ${error.message}`)
        } else {
          loggedOutCount++
        }
      } catch (err) {
        errors.push(`Error signing out user ${userToLogout.id}: ${err.message}`)
      }
    }

    console.log(`Admin ${user.id} logged out ${loggedOutCount} users`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        loggedOutCount,
        totalUsers: sessions.users.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in admin-logout-all function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
