/**
 * Group Stage Generation and Progression Logic
 * Supports: Round Robin Groups + Knockout, Swiss Groups + Knockout
 */

import { supabase } from "@/integrations/supabase/client";
import { generateRoundRobinMatches, generateSwissFirstRoundMatches, generateSingleEliminationMatches } from "./formatGenerators";

export interface GroupStageConfig {
  groupCount: number;             // 2-8 groups
  groupFormat: 'round_robin' | 'swiss';
  teamsAdvancePerGroup: number;   // 1-4 teams advance
  swissRoundsPerGroup?: number;   // If using Swiss format
}

export interface TeamWithGroup {
  id: string;
  name: string;
  group_number?: number | null;
  seed?: number;
}

export interface GroupStanding {
  teamId: string;
  teamName: string;
  groupNumber: number;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

// ============================================================================
// GROUP ASSIGNMENT
// ============================================================================

/**
 * Distribute teams into groups using snake draft for balance
 * Teams should be seeded beforehand for best results
 */
export function assignTeamsToGroups(
  teams: TeamWithGroup[],
  groupCount: number
): Map<number, TeamWithGroup[]> {
  const groups = new Map<number, TeamWithGroup[]>();
  
  // Initialize empty groups
  for (let i = 1; i <= groupCount; i++) {
    groups.set(i, []);
  }
  
  // Sort by seed if available
  const sortedTeams = [...teams].sort((a, b) => (a.seed || 999) - (b.seed || 999));
  
  // Snake draft distribution for balance
  let direction = 1;
  let currentGroup = 1;
  
  for (const team of sortedTeams) {
    groups.get(currentGroup)!.push({ ...team, group_number: currentGroup });
    
    // Snake: 1,2,3,4,4,3,2,1,1,2,3,4...
    currentGroup += direction;
    
    if (currentGroup > groupCount) {
      currentGroup = groupCount;
      direction = -1;
    } else if (currentGroup < 1) {
      currentGroup = 1;
      direction = 1;
    }
  }
  
  return groups;
}

// ============================================================================
// GROUP STAGE GENERATION
// ============================================================================

export async function generateGroupStageMatches(
  tournamentId: string,
  teams: TeamWithGroup[],
  config: GroupStageConfig,
  bestOf: number = 1
): Promise<{ success: boolean; matchesCreated: number; error?: string }> {
  try {
    if (teams.length < config.groupCount * 2) {
      return { 
        success: false, 
        matchesCreated: 0, 
        error: `Need at least ${config.groupCount * 2} teams for ${config.groupCount} groups` 
      };
    }
    
    // Assign teams to groups
    const groups = assignTeamsToGroups(teams, config.groupCount);
    
    // Update teams with group assignments in database
    const groupUpdates = [];
    for (const [groupNum, groupTeams] of groups) {
      for (const team of groupTeams) {
        groupUpdates.push({
          id: team.id,
          group_number: groupNum
        });
      }
    }
    
    // Batch update team group assignments
    for (const update of groupUpdates) {
      await supabase
        .from('teams')
        .update({ group_number: update.group_number })
        .eq('id', update.id);
    }
    
    // Generate matches for each group
    let allMatches: any[] = [];
    let matchNumberOffset = 0;
    
    for (const [groupNum, groupTeams] of groups) {
      let groupMatches: any[];
      
      if (config.groupFormat === 'round_robin') {
        // Generate round robin matches for this group
        groupMatches = generateRoundRobinMatches(
          tournamentId,
          groupTeams,
          bestOf
        ).map(match => ({
          ...match,
          bracket_position: `group_${groupNum}`,
          notes: `Group ${groupNum} - ${match.notes || ''}`
        }));
      } else {
        // Generate Swiss first round for this group
        const swissRounds = config.swissRoundsPerGroup || Math.max(3, Math.ceil(Math.log2(groupTeams.length)));
        groupMatches = generateSwissFirstRoundMatches(
          tournamentId,
          groupTeams,
          swissRounds,
          bestOf
        ).map(match => ({
          ...match,
          bracket_position: `group_${groupNum}`,
          notes: `Group ${groupNum} - ${match.notes || ''}`
        }));
      }
      
      // Offset match numbers to be unique across groups
      groupMatches = groupMatches.map((match, idx) => ({
        ...match,
        match_number: matchNumberOffset + idx + 1
      }));
      
      matchNumberOffset += groupMatches.length;
      allMatches = allMatches.concat(groupMatches);
    }
    
    // Insert all group stage matches
    if (allMatches.length > 0) {
      const { error } = await supabase.from('matches').insert(allMatches);
      if (error) {
        return { success: false, matchesCreated: 0, error: error.message };
      }
    }
    
    // Update tournament with group stage config
    await supabase
      .from('tournaments')
      .update({
        group_stage_enabled: true,
        group_count: config.groupCount,
        group_stage_format: config.groupFormat,
        teams_advance_per_group: config.teamsAdvancePerGroup,
        group_stage_completed: false
      })
      .eq('id', tournamentId);
    
    return { success: true, matchesCreated: allMatches.length };
    
  } catch (error: any) {
    console.error('Error generating group stage:', error);
    return { success: false, matchesCreated: 0, error: error.message };
  }
}

// ============================================================================
// GROUP STANDINGS CALCULATION
// ============================================================================

export async function getGroupStandings(
  tournamentId: string
): Promise<{ standings: GroupStanding[][]; complete: boolean; error?: string }> {
  try {
    // Fetch teams with group assignments
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, group_number')
      .eq('tournament_id', tournamentId)
      .not('group_number', 'is', null);
    
    if (teamsError || !teams) {
      return { standings: [], complete: false, error: teamsError?.message };
    }
    
    // Fetch completed matches
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .like('bracket_position', 'group_%')
      .eq('status', 'completed');
    
    if (matchesError) {
      return { standings: [], complete: false, error: matchesError.message };
    }
    
    // Fetch pending matches to check completion
    const { data: pendingMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .like('bracket_position', 'group_%')
      .neq('status', 'completed');
    
    const isComplete = !pendingMatches || pendingMatches.length === 0;
    
    // Build standings map
    const standingsMap = new Map<string, GroupStanding>();
    
    teams.forEach(team => {
      standingsMap.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        groupNumber: team.group_number || 0,
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0
      });
    });
    
    // Calculate standings from matches
    matches?.forEach(match => {
      if (!match.team1_id || !match.team2_id) return; // Skip byes
      
      const team1 = standingsMap.get(match.team1_id);
      const team2 = standingsMap.get(match.team2_id);
      
      if (team1 && team2) {
        team1.played++;
        team2.played++;
        
        team1.goalsFor += match.score_team1 || 0;
        team1.goalsAgainst += match.score_team2 || 0;
        team2.goalsFor += match.score_team2 || 0;
        team2.goalsAgainst += match.score_team1 || 0;
        
        if (match.winner_id === match.team1_id) {
          team1.wins++;
          team1.points += 3;
          team2.losses++;
        } else if (match.winner_id === match.team2_id) {
          team2.wins++;
          team2.points += 3;
          team1.losses++;
        } else {
          // Draw
          team1.draws++;
          team2.draws++;
          team1.points += 1;
          team2.points += 1;
        }
      }
    });
    
    // Calculate goal differences
    standingsMap.forEach(standing => {
      standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
    });
    
    // Group by group number and sort
    const groupsMap = new Map<number, GroupStanding[]>();
    standingsMap.forEach(standing => {
      const group = groupsMap.get(standing.groupNumber) || [];
      group.push(standing);
      groupsMap.set(standing.groupNumber, group);
    });
    
    // Sort each group by points, goal difference, goals for
    const sortedGroups: GroupStanding[][] = [];
    const sortedGroupNumbers = Array.from(groupsMap.keys()).sort((a, b) => a - b);
    
    for (const groupNum of sortedGroupNumbers) {
      const groupStandings = groupsMap.get(groupNum)!.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });
      sortedGroups.push(groupStandings);
    }
    
    return { standings: sortedGroups, complete: isComplete };
    
  } catch (error: any) {
    return { standings: [], complete: false, error: error.message };
  }
}

// ============================================================================
// KNOCKOUT STAGE GENERATION FROM GROUPS
// ============================================================================

export async function generateKnockoutFromGroups(
  tournamentId: string,
  bestOf: number = 1
): Promise<{ success: boolean; matchesCreated: number; error?: string }> {
  try {
    // Get tournament config
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('group_count, teams_advance_per_group')
      .eq('id', tournamentId)
      .single();
    
    if (tournamentError || !tournament) {
      return { success: false, matchesCreated: 0, error: 'Tournament not found' };
    }
    
    // Get group standings
    const { standings, complete, error: standingsError } = await getGroupStandings(tournamentId);
    
    if (standingsError) {
      return { success: false, matchesCreated: 0, error: standingsError };
    }
    
    if (!complete) {
      return { success: false, matchesCreated: 0, error: 'Group stage not complete - pending matches remain' };
    }
    
    // Get advancing teams from each group
    const advancingTeams: TeamWithGroup[] = [];
    
    for (const groupStandings of standings) {
      const qualifying = groupStandings.slice(0, tournament.teams_advance_per_group || 2);
      for (const standing of qualifying) {
        advancingTeams.push({
          id: standing.teamId,
          name: standing.teamName,
          group_number: standing.groupNumber,
          // Seed based on group position: Group winners get top seeds
          seed: standing.groupNumber + (groupStandings.indexOf(standing) * (tournament.group_count || 2))
        });
      }
    }
    
    if (advancingTeams.length < 2) {
      return { success: false, matchesCreated: 0, error: 'Not enough teams qualified for knockout' };
    }
    
    // Generate single elimination bracket with proper seeding
    // Cross-group seeding: 1A vs 2B, 1B vs 2A, etc.
    const seededTeams = seedForKnockout(advancingTeams, tournament.group_count || 2);
    
    const knockoutMatches = generateSingleEliminationMatches(
      tournamentId,
      seededTeams,
      bestOf
    ).map(match => ({
      ...match,
      bracket_position: 'knockout',
      notes: match.notes ? `Knockout - ${match.notes}` : 'Knockout Stage'
    }));
    
    // Get max round from group stage matches to offset knockout rounds
    const { data: groupMatches } = await supabase
      .from('matches')
      .select('round_number')
      .eq('tournament_id', tournamentId)
      .like('bracket_position', 'group_%')
      .order('round_number', { ascending: false })
      .limit(1);
    
    const maxGroupRound = groupMatches?.[0]?.round_number || 0;
    
    // Offset knockout round numbers
    const offsetMatches = knockoutMatches.map(match => ({
      ...match,
      round_number: match.round_number + maxGroupRound
    }));
    
    // Insert knockout matches
    if (offsetMatches.length > 0) {
      const { error: insertError } = await supabase.from('matches').insert(offsetMatches);
      if (insertError) {
        return { success: false, matchesCreated: 0, error: insertError.message };
      }
    }
    
    // Mark group stage as complete
    await supabase
      .from('tournaments')
      .update({ group_stage_completed: true })
      .eq('id', tournamentId);
    
    return { success: true, matchesCreated: offsetMatches.length };
    
  } catch (error: any) {
    console.error('Error generating knockout from groups:', error);
    return { success: false, matchesCreated: 0, error: error.message };
  }
}

/**
 * Seed teams for knockout bracket to avoid early group rematches
 * Uses cross-group pairing: 1A vs 2B, 1B vs 2A, etc.
 */
function seedForKnockout(
  teams: TeamWithGroup[],
  groupCount: number
): TeamWithGroup[] {
  // Organize by finishing position within groups
  const byPosition = new Map<number, TeamWithGroup[]>();
  
  teams.forEach(team => {
    const groupNum = team.group_number || 1;
    const position = team.seed ? Math.floor((team.seed - 1) / groupCount) + 1 : 1;
    const posTeams = byPosition.get(position) || [];
    posTeams.push(team);
    byPosition.set(position, posTeams);
  });
  
  // Cross-match: position 1 teams go to one half, position 2 to other
  // Within each half, arrange so different groups meet
  const seeded: TeamWithGroup[] = [];
  const positions = Array.from(byPosition.keys()).sort((a, b) => a - b);
  
  // Simple cross-group seeding
  let seedNum = 1;
  for (const position of positions) {
    const posTeams = byPosition.get(position) || [];
    // Alternate group ordering for cross-matching
    const ordered = position % 2 === 1 
      ? posTeams.sort((a, b) => (a.group_number || 0) - (b.group_number || 0))
      : posTeams.sort((a, b) => (b.group_number || 0) - (a.group_number || 0));
    
    for (const team of ordered) {
      seeded.push({ ...team, seed: seedNum++ });
    }
  }
  
  return seeded;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function validateGroupConfig(
  teamCount: number,
  config: GroupStageConfig
): { valid: boolean; error?: string } {
  if (config.groupCount < 2 || config.groupCount > 8) {
    return { valid: false, error: 'Group count must be between 2 and 8' };
  }
  
  if (config.teamsAdvancePerGroup < 1 || config.teamsAdvancePerGroup > 4) {
    return { valid: false, error: 'Teams advancing per group must be between 1 and 4' };
  }
  
  const minTeamsPerGroup = 2;
  if (teamCount < config.groupCount * minTeamsPerGroup) {
    return { valid: false, error: `Need at least ${config.groupCount * minTeamsPerGroup} teams for ${config.groupCount} groups` };
  }
  
  const teamsPerGroup = Math.floor(teamCount / config.groupCount);
  if (config.teamsAdvancePerGroup > teamsPerGroup) {
    return { valid: false, error: `Cannot advance ${config.teamsAdvancePerGroup} teams from groups of ${teamsPerGroup}` };
  }
  
  const advancingCount = config.groupCount * config.teamsAdvancePerGroup;
  if (advancingCount < 2) {
    return { valid: false, error: 'At least 2 teams must advance to knockout stage' };
  }
  
  return { valid: true };
}
