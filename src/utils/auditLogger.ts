
import { supabase } from "@/integrations/supabase/client";

/**
 * Utility functions for logging application events and errors to the audit system
 * This provides a centralized way to track frontend activities and errors
 */

export interface LogApplicationErrorParams {
  component: string;
  errorMessage: string;
  errorCode?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Log application errors to the audit system
 * This will capture frontend errors and display them in the admin audit log
 */
export const logApplicationError = async ({
  component,
  errorMessage,
  errorCode,
  userId,
  metadata = {}
}: LogApplicationErrorParams) => {
  try {
    console.log(`🚨 Logging application error:`, {
      component,
      errorMessage,
      errorCode,
      metadata
    });

    const { error } = await supabase.rpc('log_application_error', {
      p_component: component,
      p_error_message: errorMessage,
      p_error_code: errorCode || null,
      p_user_id: userId || null,
      p_metadata: metadata
    });

    if (error) {
      console.error('Failed to log application error:', error);
    }
  } catch (error) {
    console.error('Error in logApplicationError:', error);
  }
};

/**
 * Log custom audit events for important user actions
 * This allows tracking of significant frontend activities
 */
export const logCustomAuditEvent = async (
  tableName: string,
  action: string,
  recordId: string,
  description: string,
  metadata: Record<string, any> = {}
) => {
  try {
    const { error } = await supabase.rpc('log_audit_event', {
      p_table_name: tableName,
      p_action: action,
      p_record_id: recordId,
      p_description: description,
      p_metadata: metadata
    });

    if (error) {
      console.error('Failed to log custom audit event:', error);
    }
  } catch (error) {
    console.error('Error in logCustomAuditEvent:', error);
  }
};

/**
 * Wrapper for common frontend actions that should be audited
 */
export const auditActions = {
  // Tournament related actions
  tournamentView: (tournamentId: string, tournamentName: string) =>
    logCustomAuditEvent('tournaments', 'VIEW', tournamentId, `Viewed tournament "${tournamentName}"`),
  
  tournamentJoin: (tournamentId: string, tournamentName: string) =>
    logCustomAuditEvent('tournament_signups', 'SIGNUP_ATTEMPT', tournamentId, `Attempted to join tournament "${tournamentName}"`),
  
  // Match related actions
  matchView: (matchId: string) =>
    logCustomAuditEvent('matches', 'VIEW', matchId, 'Viewed match details'),
  
  resultSubmission: (matchId: string, isSuccess: boolean) =>
    logCustomAuditEvent('matches', isSuccess ? 'RESULT_SUBMIT_SUCCESS' : 'RESULT_SUBMIT_FAILED', matchId, 
      isSuccess ? 'Match result submitted successfully' : 'Failed to submit match result'),
  
  // User actions
  profileView: (userId: string, viewedUsername: string) =>
    logCustomAuditEvent('users', 'PROFILE_VIEW', userId, `Viewed profile of "${viewedUsername}"`),
  
  // Map veto actions
  vetoAction: (sessionId: string, action: string, mapName: string) =>
    logCustomAuditEvent('map_veto_sessions', 'VETO_ACTION', sessionId, `${action} map "${mapName}"`),
  
  // Admin actions
  adminPageAccess: (page: string) =>
    logCustomAuditEvent('admin_actions', 'PAGE_ACCESS', 'admin', `Accessed admin page: ${page}`),
  
  // Error tracking
  frontendError: (component: string, error: Error, additionalContext?: Record<string, any>) =>
    logApplicationError({
      component,
      errorMessage: error.message,
      errorCode: error.name,
      metadata: {
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...additionalContext
      }
    })
};

export default auditActions;
