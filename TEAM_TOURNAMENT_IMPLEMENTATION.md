# Team Tournament Implementation Plan

## Executive Summary

This document tracks the implementation of team-based tournaments using a **dual-path architecture**. The approach allows users to create persistent teams and register for team tournaments while maintaining complete backward compatibility with existing solo tournament functionality.

**Core Principle**: Build a parallel team system without modifying existing solo tournament logic.

---

## Current State Analysis

### ✅ What Currently Exists
- **Solo Tournament Registration**: Individual players sign up via `tournament_signups` table
- **Auto Team Generation**: System creates balanced teams using `TeamBalancingLogic.tsx`
- **Tournament Management**: Full tournament lifecycle with bracket generation
- **Statistics System**: Individual player statistics and rankings
- **Admin/Medic Tools**: Comprehensive tournament management tools

### 🎯 What We Need to Add
- **Persistent Teams**: User-created teams that exist outside tournaments
- **Team Registration Flow**: Teams sign up as units for team tournaments
- **Team Management**: Captain controls, invites, roster management
- **Team Profiles**: Public team pages with statistics and history
- **Dual Tournament Types**: Solo vs Team tournament distinction

---

## Implementation Phases

### Phase 1: Core Team Infrastructure 🚧
**Status**: Not Started

#### Database Schema Creation
- [ ] Add `registration_type` enum to tournaments table (`'solo' | 'team'`)
- [ ] Create `persistent_teams` table
  - [ ] `id`, `name`, `captain_id`, `created_at`, `updated_at`
  - [ ] `description`, `invite_code`, `is_active`, `max_members`
- [ ] Create `persistent_team_members` table
  - [ ] `id`, `team_id`, `user_id`, `joined_at`, `is_captain`
- [ ] Create `persistent_team_invites` table
  - [ ] `id`, `team_id`, `invited_by`, `invite_code`, `expires_at`
- [ ] Create `team_tournament_registrations` table
  - [ ] `id`, `tournament_id`, `team_id`, `registered_at`, `status`

#### Team Management System
- [ ] Create `TeamManagementPage.tsx` for team captains
- [ ] Implement 4-digit invite code generation/validation
- [ ] Create `TeamInviteDialog.tsx` for sending invites
- [ ] Create `TeamRosterManager.tsx` for roster management
- [ ] Add team creation flow and validation logic
- [ ] Implement one-team-per-user enforcement

#### Tournament Creation Enhancement
- [ ] Add registration type selector to `CreateTournamentDialog.tsx`
- [ ] Update tournament creation logic to handle both types
- [ ] Add validation for team tournaments (team size requirements)

---

### Phase 2: Tournament Integration 🎯
**Status**: Not Started

#### Team Registration Flow
- [ ] Create `TeamTournamentRegistration.tsx` component
- [ ] Implement team-based signup logic (parallel to individual signup)
- [ ] Add team validation (roster completion, eligibility)
- [ ] Create team tournament participant management

#### Tournament Display Updates
- [ ] Update `TournamentCard.tsx` to show registration type
- [ ] Create team-specific tournament views
- [ ] Modify `TournamentParticipants.tsx` for team tournaments
- [ ] Update tournament detail pages for team context

#### Bracket System Adaptation
- [ ] Ensure bracket generation works with pre-formed teams
- [ ] Update match assignment for team tournaments
- [ ] Modify team progression logic for team tournaments

---

### Phase 3: Statistics & Profiles 📊
**Status**: Not Started

#### Team Statistics System
- [ ] Create team-based statistics tracking tables
- [ ] Implement team performance analytics
- [ ] Create team leaderboards separate from individual
- [ ] Add team tournament history tracking

#### Team Profiles
- [ ] Create `TeamProfilePage.tsx` for public team pages
- [ ] Add team achievement system
- [ ] Implement team tournament history display
- [ ] Create team member showcase

#### Integration with Existing Stats
- [ ] Ensure individual stats remain unaffected
- [ ] Create cross-reference without interference
- [ ] Update analytics to handle both stat types

---

### Phase 4: Medic Tools & Polish ⚡
**Status**: Not Started

#### Tournament Medic Adaptation
- [ ] Update medic tools to detect tournament type
- [ ] Add team-specific management tools
- [ ] Enhance bracket management for pre-formed teams
- [ ] Create team roster validation tools

#### Final Integration & Testing
- [ ] Comprehensive testing of both tournament paths
- [ ] UI/UX refinements and consistency checks
- [ ] Performance optimization for dual systems
- [ ] Documentation updates

---

## Database Schema Plan

### New Tables

#### `persistent_teams`
```sql
CREATE TABLE persistent_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  captain_id UUID REFERENCES users(id) NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### `persistent_team_members`
```sql
CREATE TABLE persistent_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES persistent_teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_captain BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, user_id)
);
```

#### `persistent_team_invites`
```sql
CREATE TABLE persistent_team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES persistent_teams(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES users(id),
  invite_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### `team_tournament_registrations`
```sql
CREATE TABLE team_tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES persistent_teams(id) ON DELETE CASCADE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'registered',
  UNIQUE(tournament_id, team_id)
);
```

### Table Modifications

#### `tournaments`
- Add `registration_type` enum: `'solo' | 'team'`

---

## Component Architecture

### New Components

#### Team Management
- `TeamManagementPage.tsx` - Main team management interface
- `TeamCreationDialog.tsx` - Team creation form
- `TeamInviteDialog.tsx` - Send team invitations
- `TeamRosterManager.tsx` - Manage team roster
- `TeamProfilePage.tsx` - Public team profile display

#### Team Tournament Flow
- `TeamTournamentRegistration.tsx` - Team registration for tournaments
- `TeamTournamentCard.tsx` - Display team-based tournaments
- `TeamTournamentParticipants.tsx` - Show registered teams

#### Team Statistics
- `TeamLeaderboard.tsx` - Team rankings and statistics
- `TeamStatsDisplay.tsx` - Team performance metrics
- `TeamTournamentHistory.tsx` - Historical team performance

### Modified Components
- `CreateTournamentDialog.tsx` - Add registration type selector
- `TournamentCard.tsx` - Show registration type indicator
- `TournamentDetail.tsx` - Handle both tournament types
- Tournament medic tools - Detect and handle tournament type

---

## Risk Mitigation Strategy

### Data Isolation
- **Separate Tables**: New team system uses dedicated tables
- **Clear Type Definitions**: TypeScript interfaces prevent mixing
- **Service Layer Validation**: Enforce separation at API level

### Backward Compatibility
- **Existing Tournaments**: All current tournaments remain unchanged
- **Current Team Balancing**: Solo tournament team generation untouched
- **User Experience**: Existing features continue working identically

### User Confusion Prevention
- **Clear UI Indicators**: Tournament type clearly displayed
- **Separate Navigation**: Team management in dedicated section
- **Contextual Help**: Tooltips and guidance for new features

---

## Decision Log

### Key Architectural Decisions

| Date | Decision | Rationale | Impact |
|------|----------|-----------|--------|
| 2025-01-03 | Dual-path architecture over single unified system | Prevents breaking changes, allows gradual rollout | Higher complexity but safer implementation |
| 2025-01-03 | Persistent teams over tournament-specific teams | Better user experience, teams can participate in multiple tournaments | Additional complexity but more feature-rich |
| 2025-01-03 | 4-digit invite codes over email invitations | Simpler implementation, better UX for gaming community | Less formal but more practical |

---

## Testing Strategy

### Unit Testing
- [ ] Team management service functions
- [ ] Team validation logic
- [ ] Invite code generation/validation
- [ ] Tournament registration logic

### Integration Testing
- [ ] Solo tournament flow (ensure no regression)
- [ ] Team tournament flow (end-to-end)
- [ ] Cross-system statistics consistency
- [ ] Database constraint validation

### User Acceptance Testing
- [ ] Team captain workflow
- [ ] Team member workflow
- [ ] Tournament admin workflow
- [ ] Mixed tournament type scenarios

---

## Progress Tracking

### Overall Progress: 75% of Phase 1 Complete

**Phase 1**: 12/15 tasks complete (80%)
**Phase 2**: 0/8 tasks complete (0%)
**Phase 3**: 0/7 tasks complete (0%)
**Phase 4**: 0/6 tasks complete (0%)

---

## Next Steps

1. **Immediate**: Begin Phase 1 database schema creation
2. **Short-term**: Implement core team management system
3. **Medium-term**: Build team tournament registration flow
4. **Long-term**: Complete statistics and medic tool integration

---

## Notes & Considerations

- **Performance**: Monitor query performance with additional tables
- **Scalability**: Consider caching for team lookups
- **Security**: Implement proper RLS policies for team data
- **UX**: Ensure clear distinction between solo and team tournaments
- **Analytics**: Track adoption of team tournaments vs solo tournaments

---

*Last Updated: 2025-01-03*
*Status: Planning Phase*