# Clan Tournament System Implementation Roadmap

## System Overview

This document tracks the implementation of the **Persistent Teams (Clan) System** and its integration with tournaments. The goal is to support two distinct tournament types:

- **Skirmish Tournaments**: Solo player signup → Admin team balancing → Temporary teams
- **Clan Tournaments**: Pre-formed persistent teams → Captain registration → Direct bracket placement

## 🎯 Core Principle: Dual System Architecture

The clan tournament system is designed to **coexist** with the existing skirmish system without any interference:

- **Skirmish Database Tables**: `tournament_signups`, `teams`, `team_members` (tournament-specific, temporary)
- **Clan Database Tables**: `persistent_teams`, `persistent_team_members`, `team_tournament_registrations` (permanent)
- **Tournament Type**: Determined by `tournaments.registration_type` (`'solo'` vs `'team'`)

---

## ✅ Phase 1: Core Clan Infrastructure (COMPLETED)

### Database Schema ✅
- [x] **`persistent_teams`** - Core team records with captain, invite codes, statistics
- [x] **`persistent_team_members`** - Team memberships with captain designations  
- [x] **`persistent_team_invites`** - Invite code system (4-digit codes, 7-day expiry)
- [x] **`team_tournament_registrations`** - Team tournament signup records
- [x] **RLS Policies** - Proper security for all clan tables

### Team Management System ✅
- [x] **Team Creation** - Any user can create a team (becomes captain)
- [x] **Invite Code System** - 4-digit unique codes generated per team
- [x] **Captain Controls**:
  - [x] Edit team name and description
  - [x] Remove team members
  - [x] Delete entire team
- [x] **Member Management**:
  - [x] Join team via invite code
  - [x] Leave team functionality
  - [x] One-team-per-user enforcement

### Team Statistics ✅
- [x] **Independent Stats** - Separate from user stats
- [x] **Team Performance Tracking**:
  - [x] Team wins/losses
  - [x] Tournaments played/won
  - [x] Total/average rank points
- [x] **Automatic Calculations** - Based on team member composition

### UI Components ✅
- [x] **`TeamManagementPage.tsx`** - Complete team creation/management interface
- [x] **`TeamProfile.tsx`** - Public team profile display
- [x] **`TeamsDirectory.tsx`** - Browse all active teams
- [x] **`ClickableTeamName.tsx`** - Navigation helper component
- [x] **Navigation Integration** - Added to main sidebar

### Hooks & Logic ✅
- [x] **`useTeamManagement.ts`** - All team CRUD operations
- [x] **`useUserTeam.ts`** - Fetch user's current team
- [x] **TypeScript Types** - Complete type definitions in `types/team.ts`

---

## 🔄 Phase 2: Tournament Integration (IN PROGRESS)

### Core Tournament Registration Flow ❌
- [ ] **`TeamTournamentRegistration.tsx`** - Component for captains to register teams
- [ ] **Team Registration Logic** - Validate roster, handle registration status
- [ ] **Registration Type Detection** - Tournament detail pages detect solo vs team
- [ ] **Captain Permissions** - Only captains can register their teams

### Tournament Display Updates ❌
- [ ] **`TournamentCard.tsx` Updates**:
  - [ ] Show registration type badge (`SOLO` / `TEAM`)
  - [ ] Display appropriate participant count (players vs teams)
- [ ] **Tournament Detail Pages**:
  - [ ] Show team registrations instead of individual signups for team tournaments
  - [ ] Display team roster in participant list
  - [ ] Team-specific tournament statistics

### Participant Management ❌
- [ ] **Team Validation**:
  - [ ] Minimum team size enforcement
  - [ ] Maximum team size enforcement
  - [ ] Active team member verification
- [ ] **Registration Status Tracking**:
  - [ ] Registered teams list
  - [ ] Team withdrawal functionality
  - [ ] Registration deadline enforcement

---

## 🎯 Phase 3: Admin Tournament Tools (NOT STARTED)

### Team Seeding System ❌
- [ ] **Manual Team Seeding Interface**:
  - [ ] Admin can assign seed numbers to registered teams
  - [ ] Drag-and-drop seed ordering
  - [ ] Auto-seed options (random, by rank points, by tournament history)
- [ ] **Seeding Validation**:
  - [ ] Prevent duplicate seeds
  - [ ] Ensure all teams have seeds before bracket generation

### Tournament Creation Enhancements ❌
- [ ] **Tournament Type Selection**:
  - [ ] Clear UI distinction between Solo and Team tournaments
  - [ ] Different default settings for each type
  - [ ] Registration type cannot be changed after creation
- [ ] **Team Tournament Settings**:
  - [ ] Team size requirements
  - [ ] Maximum team registrations
  - [ ] Team registration deadlines

### Admin Tournament Management ❌
- [ ] **Team Tournament Controls**:
  - [ ] Force register/unregister teams
  - [ ] Emergency team roster modifications
  - [ ] Team substitution system
- [ ] **Tournament Conversion Prevention**:
  - [ ] Block changing registration type after teams register
  - [ ] Clear warnings about tournament type impacts

---

## 🔧 Phase 4: Bracket System Integration (NOT STARTED)

### Bracket Generation Updates ❌
- [ ] **Team Tournament Bracket Logic**:
  - [ ] Use registered teams directly (no team balancing)
  - [ ] Respect manual seeding from admin
  - [ ] Handle bye rounds for uneven team counts
- [ ] **Bracket Display**:
  - [ ] Show team names instead of generated team names
  - [ ] Display team rosters in bracket tooltips
  - [ ] Team captain identification in brackets

### Match Assignment ❌
- [ ] **Team Match Logic**:
  - [ ] Assign entire teams to matches
  - [ ] Captain notification system for matches  
  - [ ] Team-based match result submission
- [ ] **Match Progression**:
  - [ ] Winning teams advance (not team balancing)
  - [ ] Loser bracket support for team tournaments
  - [ ] Finals seeding based on bracket position

---

## 🧪 Phase 5: Testing & Polish (NOT STARTED)

### Integration Testing ❌
- [ ] **Skirmish Tournament Isolation**:
  - [ ] Verify solo tournaments unaffected by clan system
  - [ ] Test team balancing still works for solo tournaments
  - [ ] Confirm database separation works correctly
- [ ] **Clan Tournament Flow**:
  - [ ] End-to-end team registration → bracket → completion
  - [ ] Captain permissions and team management during tournaments
  - [ ] Statistics tracking for team tournaments

### UI/UX Polish ❌
- [ ] **Visual Distinction**:
  - [ ] Clear tournament type indicators throughout UI
  - [ ] Different color schemes or icons for tournament types
  - [ ] Help text explaining clan vs skirmish tournaments
- [ ] **Error Handling**:
  - [ ] Graceful handling of team registration errors
  - [ ] Clear error messages for invalid team states
  - [ ] Fallback UI for edge cases

---

## 📋 Implementation Checklist

### Immediate Next Steps (Phase 2 Priority)
1. [ ] Create `TeamTournamentRegistration.tsx` component
2. [ ] Add team registration logic to tournament details
3. [ ] Update `TournamentCard.tsx` with registration type display
4. [ ] Implement team validation for tournament registration
5. [ ] Add team participant display to tournament pages

### Critical Integration Points
- [ ] **Tournament Creation**: Ensure `registration_type` field is properly set
- [ ] **Registration Display**: Tournament pages show appropriate registration component
- [ ] **Database Queries**: Use correct tables based on tournament type
- [ ] **Navigation**: Team profiles link to team tournament history

### Success Criteria
- [ ] Captains can register their teams for team tournaments
- [ ] Team tournaments show registered teams, not individual players
- [ ] Skirmish tournaments continue to work unchanged
- [ ] Admins can seed teams manually for team tournaments
- [ ] Bracket generation works with pre-formed teams

---

## 🔍 Testing Scenarios

### Clan Tournament Flow
1. **Team Registration**: Captain registers active team for team tournament
2. **Admin Seeding**: Admin assigns seeds to registered teams
3. **Bracket Generation**: System creates bracket using registered teams
4. **Match Progression**: Teams advance through bracket based on match results
5. **Statistics Update**: Team and individual stats updated post-tournament

### Skirmish Tournament Flow (Unchanged)
1. **Individual Signup**: Players sign up individually
2. **Team Balancing**: Admin uses existing balancing tools
3. **Bracket Generation**: System creates bracket with balanced teams
4. **Match Progression**: Standard tournament progression
5. **Statistics Update**: Individual stats updated (no team stats)

---

## 🎛️ Database Impact Analysis

### New Data Flow (Clan Tournaments)
```
persistent_teams → team_tournament_registrations → matches → tournament_results
```

### Existing Data Flow (Skirmish Tournaments) - UNCHANGED
```
tournament_signups → teams (generated) → team_members → matches → tournament_results
```

### No Overlap
- Clan tournaments never touch `tournament_signups`, `teams` (tournament-specific), or `team_members` (tournament-specific)
- Skirmish tournaments never touch `persistent_teams`, `persistent_team_members`, or `team_tournament_registrations`

---

## 📈 Future Enhancements (Post-Launch)

- [ ] **Clan Leagues**: Season-long clan competitions
- [ ] **Clan Challenges**: Team vs team direct challenges
- [ ] **Clan Rankings**: Global clan leaderboards
- [ ] **Team Draft System**: Captains draft available free agents
- [ ] **Clan Alliances**: Multi-team partnerships for larger tournaments

---

## 🚨 Risk Mitigation

### Database Integrity
- All clan tables have proper RLS policies
- Foreign key constraints prevent orphaned records
- Unique constraints prevent duplicate team names/codes

### User Experience
- Clear visual indicators for tournament types
- Helpful error messages for invalid team states
- Graceful degradation when features are unavailable

### System Performance
- Indexed queries for team lookups
- Efficient joins between clan and tournament tables
- Cached team statistics to reduce computation

---

*Last Updated: [Current Date]*
*Next Review: After Phase 2 Completion*