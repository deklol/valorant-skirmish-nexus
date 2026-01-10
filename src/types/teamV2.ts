/**
 * Team Tournament System V2 - Enhanced Types
 * 
 * This file contains all types for the new team tournament system with:
 * - Lifecycle states (active, locked, disbanded, archived)
 * - Role hierarchy (owner, manager, captain, player, substitute, analyst, coach)
 * - Seeding & check-in support
 * - Dispute system
 */

// ============================================
// Enums & Constants
// ============================================

export type TeamLifecycleStatus = 'active' | 'locked' | 'disbanded' | 'archived';

export type TeamMemberRole = 'owner' | 'manager' | 'captain' | 'player' | 'substitute' | 'analyst' | 'coach';

export type TeamCheckInStatus = 'pending' | 'checked_in' | 'no_show';

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected';

export type TournamentPhase = 
  | 'setup' 
  | 'registration' 
  | 'seeding' 
  | 'check_in' 
  | 'bracket_generation' 
  | 'live' 
  | 'disputes' 
  | 'completed' 
  | 'review';

// Role permission definitions
export const ROLE_PERMISSIONS = {
  owner: [
    'manage_team',
    'edit_team_info',
    'manage_roster',
    'manage_roles',
    'transfer_ownership',
    'disband_team',
    'register_tournament',
    'withdraw_tournament',
    'check_in',
    'submit_scores',
    'raise_dispute',
    'regenerate_invite_code',
  ],
  manager: [
    'manage_team',
    'edit_team_info',
    'manage_roster',
    'manage_roles',
    'register_tournament',
    'withdraw_tournament',
    'check_in',
    'submit_scores',
    'raise_dispute',
    'regenerate_invite_code',
  ],
  captain: [
    'register_tournament',
    'withdraw_tournament',
    'check_in',
    'submit_scores',
    'raise_dispute',
  ],
  player: [
    'raise_dispute',
  ],
  substitute: [
    'raise_dispute',
  ],
  analyst: [],
  coach: [],
} as const;

export type Permission = typeof ROLE_PERMISSIONS[TeamMemberRole][number];

// Role display configuration
export const ROLE_DISPLAY = {
  owner: { label: 'Owner', color: 'hsl(var(--beta-accent-gold))', icon: 'Crown' },
  manager: { label: 'Manager', color: 'hsl(var(--beta-accent-copper))', icon: 'Settings' },
  captain: { label: 'Captain', color: 'hsl(var(--beta-primary))', icon: 'Star' },
  player: { label: 'Player', color: 'hsl(var(--beta-text-secondary))', icon: 'User' },
  substitute: { label: 'Substitute', color: 'hsl(var(--beta-text-muted))', icon: 'UserMinus' },
  analyst: { label: 'Analyst', color: 'hsl(var(--beta-info))', icon: 'BarChart' },
  coach: { label: 'Coach', color: 'hsl(var(--beta-warning))', icon: 'GraduationCap' },
} as const;

// ============================================
// Team Interfaces
// ============================================

export interface PersistentTeamV2 {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  captain_id: string; // Legacy compatibility
  invite_code: string | null;
  status: TeamLifecycleStatus;
  is_active: boolean;
  max_members: number | null;
  locked_at: string | null;
  locked_reason: string | null;
  disbanded_at: string | null;
  join_code_version: number;
  join_code_generated_at: string | null;
  created_at: string;
  updated_at: string | null;
  // Stats
  wins: number | null;
  losses: number | null;
  tournaments_played: number | null;
  tournaments_won: number | null;
  total_rank_points: number | null;
  avg_rank_points: number | null;
}

export interface PersistentTeamMemberV2 {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  is_captain: boolean; // Legacy compatibility
  joined_at: string | null;
  users?: {
    id: string;
    discord_username: string | null;
    current_rank: string | null;
    riot_id: string | null;
    rank_points: number | null;
    weight_rating: number | null;
  };
}

export interface TeamWithMembers extends PersistentTeamV2 {
  members: PersistentTeamMemberV2[];
  owner?: {
    id: string;
    discord_username: string | null;
    avatar_url: string | null;
  };
}

// ============================================
// Tournament Registration Interfaces
// ============================================

export interface TeamTournamentRegistrationV2 {
  id: string;
  tournament_id: string;
  team_id: string;
  registered_at: string | null;
  status: 'registered' | 'withdrawn' | 'disqualified';
  seed: number | null;
  seeded_at: string | null;
  seeded_by: string | null;
  check_in_status: TeamCheckInStatus;
  checked_in_at: string | null;
  checked_in_by: string | null;
  roster_snapshot: RosterSnapshot[] | null;
  // Joined data
  team?: PersistentTeamV2;
  tournament?: {
    id: string;
    name: string;
    status: string;
    current_phase: TournamentPhase;
  };
}

export interface RosterSnapshot {
  user_id: string;
  role: TeamMemberRole;
  discord_username: string | null;
  current_rank: string | null;
  rank_points: number | null;
}

// ============================================
// Seeding Interfaces
// ============================================

export interface TeamSeedData {
  registrationId: string;
  teamId: string;
  teamName: string;
  seed: number | null;
  totalRankPoints: number | null;
  avgRankPoints: number | null;
  memberCount: number;
  seededAt: string | null;
}

export interface SeedValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// Check-in Interfaces
// ============================================

export interface TeamCheckInData {
  registrationId: string;
  teamId: string;
  teamName: string;
  status: TeamCheckInStatus;
  checkedInAt: string | null;
  checkedInBy: string | null;
  memberCount: number;
  rosterSnapshot: RosterSnapshot[] | null;
}

// ============================================
// Dispute Interfaces
// ============================================

export interface MatchDispute {
  id: string;
  match_id: string;
  tournament_id: string;
  raised_by: string;
  raised_by_team: string | null;
  reason: string;
  evidence_urls: string[] | null;
  status: DisputeStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution: string | null;
  created_at: string;
  // Joined data
  match?: {
    id: string;
    round_number: number;
    match_number: number;
  };
  raiser?: {
    id: string;
    discord_username: string | null;
  };
  team?: {
    id: string;
    name: string;
  };
}

// ============================================
// Join Code History
// ============================================

export interface JoinCodeHistoryEntry {
  id: string;
  team_id: string;
  previous_code: string | null;
  new_code: string;
  rotation_trigger: string;
  triggered_by: string | null;
  rotated_at: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: TeamMemberRole, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
}

/**
 * Get all roles that have a specific permission
 */
export function getRolesWithPermission(permission: Permission): TeamMemberRole[] {
  return (Object.keys(ROLE_PERMISSIONS) as TeamMemberRole[]).filter(
    role => hasPermission(role, permission)
  );
}

/**
 * Check if role1 can manage role2 (is higher in hierarchy)
 */
export function canManageRole(managerRole: TeamMemberRole, targetRole: TeamMemberRole): boolean {
  const hierarchy: TeamMemberRole[] = ['owner', 'manager', 'captain', 'player', 'substitute', 'analyst', 'coach'];
  const managerIndex = hierarchy.indexOf(managerRole);
  const targetIndex = hierarchy.indexOf(targetRole);
  
  // Can only manage roles lower in hierarchy
  // Owner can manage everyone except owner
  // Manager can manage captain and below
  if (managerRole === 'owner') return targetRole !== 'owner';
  if (managerRole === 'manager') return targetIndex > 1; // Can't manage owner or other managers
  return false;
}

/**
 * Get display info for a role
 */
export function getRoleDisplay(role: TeamMemberRole) {
  return ROLE_DISPLAY[role] || ROLE_DISPLAY.player;
}

/**
 * Get status badge variant for team lifecycle status
 */
export function getTeamStatusVariant(status: TeamLifecycleStatus): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'active': return 'success';
    case 'locked': return 'warning';
    case 'disbanded': return 'error';
    case 'archived': return 'default';
    default: return 'default';
  }
}

/**
 * Get status badge variant for check-in status
 */
export function getCheckInStatusVariant(status: TeamCheckInStatus): 'success' | 'warning' | 'error' {
  switch (status) {
    case 'checked_in': return 'success';
    case 'pending': return 'warning';
    case 'no_show': return 'error';
    default: return 'warning';
  }
}

/**
 * Get status badge variant for dispute status
 */
export function getDisputeStatusVariant(status: DisputeStatus): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'open': return 'warning';
    case 'under_review': return 'default';
    case 'resolved': return 'success';
    case 'rejected': return 'error';
    default: return 'default';
  }
}
