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

## 📊 Database Table Status & Relationships

### ✅ **EXISTING TABLES** (Ready for Use)
```sql
-- Core Clan Tables (COMPLETED)
persistent_teams (id, name, captain_id, invite_code, is_active, max_members, stats...)
├── persistent_team_members (team_id → persistent_teams.id, user_id, is_captain)
├── persistent_team_invites (team_id → persistent_teams.id, invite_code, expires_at)
└── team_tournament_registrations (team_id → persistent_teams.id, tournament_id → tournaments.id)

-- Tournament Core Tables (EXISTING)
tournaments (id, name, registration_type ['solo'|'team'], status, max_teams...)
├── tournament_signups (tournament_id → tournaments.id, user_id) [SOLO ONLY]
├── teams (tournament_id → tournaments.id, captain_id, status) [TEMPORARY TEAMS]
└── team_members (team_id → teams.id, user_id, is_captain) [TEMPORARY MEMBERS]

-- Match System (EXISTING - Works with both)
matches (tournament_id → tournaments.id, team1_id, team2_id, winner_id)
```

### 🔗 **KEY RELATIONSHIPS**
- **Clan Registration**: `persistent_teams` → `team_tournament_registrations` → `tournaments`
- **Skirmish Registration**: `users` → `tournament_signups` → `tournaments` → `teams` (generated)
- **Both Systems**: `teams`/`persistent_teams` → `matches` → tournament progression

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

## ✅ Phase 2A: Tournament Creation Enhancements (COMPLETED)
**Database Dependencies**: `tournaments` table (EXISTS - needs UI updates only)

### Tournament Type Selection ✅
- [x] **`CreateTournamentDialog.tsx` Updates**:
  - [x] Add registration type selector (`'solo'` vs `'team'`)
  - [x] Different default settings for each type (team_size, max_teams vs max_players)
  - [x] Registration type cannot be changed after creation
- [x] **Team Tournament Settings**:
  - [x] Team size requirements (min/max members per team)
  - [x] Maximum team registrations (uses `tournaments.max_teams`)
  - [x] Team registration deadlines

### Tournament Display Updates ✅  
- [x] **`TournamentCard.tsx` Updates**:
  - [x] Show registration type badge (`SOLO` / `TEAM`)
  - [x] Display appropriate participant count (teams vs players)
  - [x] Different icons/colors for tournament types

---

## ✅ Phase 2B: Team Tournament Registration Flow (COMPLETED)
**Database Dependencies**: `team_tournament_registrations`, `persistent_teams` (BOTH EXIST)

### Core Team Registration Component ✅
- [x] **`TeamTournamentRegistration.tsx`** - NEW COMPONENT CREATED
  - [x] Captain-only registration interface
  - [x] Team roster validation (min/max size from tournament settings)
  - [x] Registration status display (registered/waitlist/full)
  - [x] Withdrawal functionality for captains

### Registration Logic & Validation ✅
- [x] **Team Validation System**:
  - [x] Active team member verification (all members still on team)
  - [x] Tournament eligibility checks (team size requirements)
  - [x] Registration deadline enforcement
  - [x] One registration per team per tournament

### Database Integration ✅
- [x] **Registration Flow**: `persistent_teams` → `team_tournament_registrations` → `tournaments`
- [x] **Captain Permissions**: Only `persistent_teams.captain_id` can register team
- [x] **Status Tracking**: Registration, withdrawal, confirmation states

---

## ✅ Phase 2C: Tournament Detail Page Integration (COMPLETED)
**Database Dependencies**: Queries need to check `tournaments.registration_type`

### Registration Type Detection ✅
- [x] **`TournamentDetail.tsx` Updates**:
  - [x] Detect `tournaments.registration_type` field  
  - [x] Show `TournamentRegistration.tsx` for solo tournaments
  - [x] Show `TeamTournamentRegistration.tsx` for team tournaments
  - [x] Different participant lists based on type

### Team Tournament Display ❌
- [ ] **Participant Management**:
  - [ ] Show registered teams instead of individual signups
  - [ ] Display team rosters in expandable format
  - [ ] Team captain identification and contact
  - [ ] Team statistics in tournament context

### Statistics & Analytics ❌
- [ ] **Team-Specific Metrics**:
  - [ ] Count teams instead of players for team tournaments
  - [ ] Team-based tournament statistics
  - [ ] Team performance tracking across tournaments

---

## 🛠️ Phase 3A: Admin Team Seeding System (PRIORITY 4)
**Database Dependencies**: May need new `team_seeds` table or add `seed` to `team_tournament_registrations`

### Manual Team Seeding Interface ❌
- [ ] **Admin Seeding Component** - NEW COMPONENT NEEDED
  - [ ] Drag-and-drop team seed ordering
  - [ ] Manual seed number assignment for registered teams
  - [ ] Auto-seed options (random, by team rank points, by tournament history)
  - [ ] Seeding validation (prevent duplicates, ensure all teams seeded)

### Database Design Decision ❌
- [ ] **Option A**: Add `seed` column to `team_tournament_registrations` 
- [ ] **Option B**: Create new `tournament_team_seeds` table
- [ ] **Seeding Rules**: Ensure all teams have seeds before bracket generation

---

## ⚙️ Phase 3B: Bracket Generation Integration (PRIORITY 5)  
**Database Dependencies**: `matches`, `teams` tables (EXIST - logic updates needed)

### Team Tournament Bracket Logic ❌
- [ ] **Bracket Generator Updates**:
  - [ ] Use registered teams directly (no team balancing for team tournaments)
  - [ ] Respect manual seeding from admin seeding system
  - [ ] Handle bye rounds for uneven team counts
  - [ ] Create `teams` records from `persistent_teams` for bracket consistency

### Bracket Display Updates ❌
- [ ] **Visual Improvements**:
  - [ ] Show persistent team names instead of generated names
  - [ ] Display team rosters in bracket tooltips  
  - [ ] Team captain identification in brackets
  - [ ] Link to team profiles from bracket

---

## 🎮 Phase 4: Match Assignment & Progression (PRIORITY 6)
**Database Dependencies**: `matches`, `match_result_submissions` (EXIST - workflow updates needed)

### Team Match Logic ❌
- [ ] **Match Assignment**:
  - [ ] Assign entire persistent teams to matches (not individual balancing)
  - [ ] Captain notification system for upcoming matches
  - [ ] Team-based match result submission (captains only)

### Match Progression ❌
- [ ] **Tournament Advancement**:
  - [ ] Winning teams advance as complete units
  - [ ] Loser bracket support for team tournaments
  - [ ] Finals seeding based on bracket position
  - [ ] Team statistics updates post-match

---

## 🧪 Phase 5: Testing & Polish (PRIORITY 7)

### Integration Testing ❌
- [ ] **Skirmish Tournament Isolation**:
  - [ ] Verify solo tournaments unaffected by clan system
  - [ ] Test team balancing still works for solo tournaments (`tournament_signups` → `teams` flow)
  - [ ] Confirm database separation works correctly

### Clan Tournament End-to-End Testing ❌
- [ ] **Complete Flow Testing**:
  - [ ] Team registration → admin seeding → bracket generation → match progression
  - [ ] Captain permissions and team management during tournaments
  - [ ] Team statistics tracking across tournament lifecycle
  - [ ] Team vs individual tournament stat separation

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

## 📋 IMPLEMENTATION ORDER SUMMARY

### 🚀 **PHASE 2A**: Tournament Creation (Week 1)
**Goal**: Enable creating "team" type tournaments
**Files to Modify**: `CreateTournamentDialog.tsx`, `TournamentCard.tsx`
**Database**: Uses existing `tournaments` table, no migrations needed

### 🎯 **PHASE 2B**: Team Registration (Week 2)  
**Goal**: Captains can register teams for tournaments
**Files to Create**: `TeamTournamentRegistration.tsx`, team registration hooks
**Database**: Uses existing `team_tournament_registrations`, `persistent_teams`

### 🏆 **PHASE 2C**: Tournament Display (Week 3)
**Goal**: Show team participants in tournament pages
**Files to Modify**: `TournamentDetail.tsx`, participant display components
**Database**: Query `team_tournament_registrations` instead of `tournament_signups`

### 🛠️ **PHASE 3A**: Admin Seeding (Week 4)
**Goal**: Admins can manually seed teams  
**Files to Create**: Team seeding admin component
**Database**: **MAY NEED MIGRATION** - Add seeding system

### ⚙️ **PHASE 3B**: Bracket Integration (Week 5)
**Goal**: Generate brackets using seeded teams
**Files to Modify**: Bracket generation logic components
**Database**: Create temporary `teams` records from `persistent_teams`

### 🎮 **PHASE 4**: Match System (Week 6)
**Goal**: Team-based match progression
**Files to Modify**: Match assignment and progression logic
**Database**: Uses existing `matches` table with team-based workflow

---

## 🔍 **CRITICAL SUCCESS PATHS**

### **Team Tournament Flow** (Must Work End-to-End)
1. **Admin Creates Team Tournament** → `tournaments.registration_type = 'team'`
2. **Captain Registers Team** → Insert into `team_tournament_registrations`  
3. **Admin Seeds Teams** → Assign seeds to registered teams
4. **Generate Bracket** → Create `teams` from `persistent_teams`, respect seeding
5. **Match Progression** → Teams advance through bracket as units
6. **Statistics Update** → Update both team and individual stats

### **Skirmish Tournament Flow** (Must Remain Unchanged)
1. **Admin Creates Solo Tournament** → `tournaments.registration_type = 'solo'`
2. **Players Sign Up** → Insert into `tournament_signups`
3. **Admin Balances Teams** → Generate temporary `teams` and `team_members` 
4. **Generate Bracket** → Use generated teams
5. **Match Progression** → Standard individual-based flow

---

## ⚠️ **CRITICAL DATABASE DECISIONS NEEDED**

### **Team Seeding Storage** (Phase 3A)
```sql
-- Option A: Add to existing table (RECOMMENDED)
ALTER TABLE team_tournament_registrations ADD COLUMN seed INTEGER;

-- Option B: Create new table  
CREATE TABLE tournament_team_seeds (
  tournament_id UUID REFERENCES tournaments(id),
  team_id UUID REFERENCES persistent_teams(id), 
  seed INTEGER,
  PRIMARY KEY (tournament_id, team_id)
);
```

### **Bracket Team Records** (Phase 3B)
Teams participating in clan tournaments need temporary `teams` records for bracket consistency:
```sql
-- Clan teams get temporary teams records during tournament
INSERT INTO teams (tournament_id, name, captain_id, status) 
SELECT t.id, pt.name, pt.captain_id, 'active'
FROM persistent_teams pt 
JOIN team_tournament_registrations ttr ON pt.id = ttr.team_id
WHERE ttr.tournament_id = $1;
```

---

## 🎛️ **DATABASE FLOW COMPARISON**

### **Clan Tournament Data Flow**
```
persistent_teams → team_tournament_registrations → [seeding] → teams (temp) → matches → stats
```

### **Skirmish Tournament Data Flow** (UNCHANGED)
```  
tournament_signups → teams (generated) → team_members → matches → stats
```

### **Key Separation Points**
- **Registration**: `team_tournament_registrations` vs `tournament_signups`
- **Team Creation**: Pre-formed vs Admin-generated  
- **Seeding**: Manual admin seeding vs Automatic balancing
- **Bracket**: Respect team identity vs Balanced matchmaking

---

## 📈 **SUCCESS METRICS & TESTING**

### **Functional Requirements**
- [ ] Team captains can register/withdraw teams from team tournaments
- [ ] Solo tournaments continue working exactly as before  
- [ ] Admins can seed teams manually for fair brackets
- [ ] Team tournaments show teams as participants, not individuals
- [ ] Bracket generation works with both tournament types
- [ ] Team statistics track separately from individual stats

### **Database Integrity Requirements**  
- [ ] No cross-contamination between tournament types
- [ ] Foreign key constraints maintain data relationships
- [ ] RLS policies prevent unauthorized team operations
- [ ] Statistics remain accurate for both systems

---

*Last Updated: December 2024*
*Next Review: After Each Phase Completion*

---

## 📝 **QUICK REFERENCE**

### **Files to Create/Modify by Phase**
- **2A**: `CreateTournamentDialog.tsx`, `TournamentCard.tsx` 
- **2B**: `TeamTournamentRegistration.tsx` (NEW), team registration hooks (NEW)
- **2C**: `TournamentDetail.tsx`, participant display components
- **3A**: Admin team seeding component (NEW)
- **3B**: Bracket generation logic modifications  
- **4**: Match assignment and progression updates

### **Key Database Tables Used**
- `tournaments` (registration_type field)
- `persistent_teams` & `persistent_team_members` (existing)  
- `team_tournament_registrations` (existing)
- `teams` (temporary records for bracket consistency)
- `matches` (existing, works with both systems)

### **Critical Decision Points**
1. **Seeding Storage**: Add `seed` column to `team_tournament_registrations` or create new table?
2. **Bracket Integration**: How to create temporary `teams` records from `persistent_teams`?
3. **Statistics**: Update both team and individual stats for clan tournaments?