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

### Phase 1: Core Team Infrastructure ✅
**Status**: COMPLETED

#### Database Schema Creation
- [x] Add `registration_type` enum to tournaments table (`'solo' | 'team'`)
- [x] Create `persistent_teams` table
  - [x] `id`, `name`, `captain_id`, `created_at`, `updated_at`
  - [x] `description`, `invite_code`, `is_active`, `max_members`
  - [x] Team statistics: `wins`, `losses`, `tournaments_played`, `tournaments_won`, `total_rank_points`, `avg_rank_points`
- [x] Create `persistent_team_members` table
  - [x] `id`, `team_id`, `user_id`, `joined_at`, `is_captain`
- [x] Create `persistent_team_invites` table
  - [x] `id`, `team_id`, `invited_by`, `invite_code`, `expires_at`
- [x] Create `team_tournament_registrations` table
  - [x] `id`, `tournament_id`, `team_id`, `registered_at`, `status`

#### Team Management System
- [x] Create `TeamManagementPage.tsx` for team captains
- [x] Implement 4-digit invite code generation/validation
- [x] Add team creation flow and validation logic
- [x] Implement one-team-per-user enforcement
- [x] Team deletion with confirmation for captains
- [x] Team member removal by captains

#### Team Statistics & Profile System
- [x] Create `TeamProfile.tsx` for individual team pages
- [x] Create `TeamsDirectory.tsx` for public team listing
- [x] Implement team-specific statistics tracking (separate from user stats)
- [x] Create `ClickableTeamName.tsx` component for navigation
- [x] Database functions for team statistics: `increment_team_wins()`, `increment_team_losses()`, etc.
- [x] Automatic rank point calculation based on team members

#### Tournament Creation Enhancement
- [x] Add registration type selector to `CreateTournamentDialog.tsx`
- [x] Update tournament creation logic to handle both types
- [x] Add team size validation for team tournaments

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

### Phase 3: Statistics & Profiles ✅
**Status**: COMPLETED

#### Team Statistics System
- [x] Create team-based statistics tracking (separate database columns)
- [x] Implement team performance analytics display
- [x] Create team statistics functions (`increment_team_wins`, etc.)
- [x] Add automatic team rank point calculation
- [x] Team statistics independent from individual player stats

#### Team Profiles
- [x] Create `TeamProfile.tsx` for public team pages
- [x] Create `TeamsDirectory.tsx` for browsing all teams
- [x] Implement team member showcase with ranks
- [x] Add team creation date and basic info display
- [x] Team tournament history integration ready

#### Integration with Existing Stats
- [x] Ensure individual stats remain unaffected
- [x] Create separate team statistics tracking
- [x] Team rank points automatically update with membership changes

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
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  tournaments_played INTEGER DEFAULT 0,
  tournaments_won INTEGER DEFAULT 0,
  total_rank_points INTEGER DEFAULT 0,
  avg_rank_points INTEGER DEFAULT 0,
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
- [x] `TeamManagementPage.tsx` - Main team management interface
- [x] `TeamProfile.tsx` - Public team profile display  
- [x] `TeamsDirectory.tsx` - Browse all public teams
- [x] `ClickableTeamName.tsx` - Clickable team name component
- [x] Team creation/deletion/editing functionality built into main page
- [x] Automatic 4-digit invite code system

#### Team Tournament Flow (Ready for Implementation)
- [ ] `TeamTournamentRegistration.tsx` - Team registration for tournaments
- [ ] Team-specific tournament participant views
- [ ] Team bracket generation integration

#### Team Statistics (Completed)
- [x] Team-specific statistics display in `TeamProfile.tsx`
- [x] Team performance metrics separate from individual stats
- [x] Automatic rank point calculation system

### Modified Components
- [x] `CreateTournamentDialog.tsx` - Add registration type selector
- [x] `AppSidebar.tsx` - Added "My Team" and "Teams Directory" navigation
- [ ] `TournamentCard.tsx` - Show registration type indicator (pending Phase 2)
- [ ] `TournamentDetail.tsx` - Handle both tournament types (pending Phase 2)
- [ ] Tournament medic tools - Detect and handle tournament type (pending Phase 4)

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

### Overall Progress: Phase 1 & 3 Complete, Phase 2 Ready

**Phase 1**: ✅ COMPLETED (15/15 tasks complete - 100%)
**Phase 2**: 🎯 READY TO START (0/8 tasks complete - 0%)  
**Phase 3**: ✅ COMPLETED (7/7 tasks complete - 100%)
**Phase 4**: ⏳ PENDING (0/6 tasks complete - 0%)

---

## Next Steps

1. **Immediate**: Begin Phase 2 - Team Tournament Registration Flow  
2. **Next Priority**: Implement team-based tournament registration system
3. **Medium-term**: Update tournament displays to show registration type
4. **Long-term**: Complete medic tool integration for team tournaments

---

## Notes & Considerations

- **Performance**: Monitor query performance with additional tables
- **Scalability**: Consider caching for team lookups
- **Security**: Implement proper RLS policies for team data
- **UX**: Ensure clear distinction between solo and team tournaments
- **Analytics**: Track adoption of team tournaments vs solo tournaments

---

*Last Updated: 2025-01-03*  
*Status: Phase 1 & 3 Complete - Ready for Phase 2 (Team Tournament Integration)*

## Recent Achievements (January 3, 2025)

### Major Milestones Completed:
- ✅ **Complete Team Infrastructure**: Full team creation, management, and deletion system
- ✅ **Team Statistics System**: Independent team statistics tracking separate from user stats  
- ✅ **Public Team Profiles**: Teams directory and individual team profile pages
- ✅ **Navigation Integration**: Team management and directory added to main navigation
- ✅ **Database Functions**: Automated team statistics and rank point calculations
- ✅ **Clickable Team Names**: Teams are linkable throughout the application

### Key Technical Achievements:
- Implemented automatic team rank point calculation based on member composition
- Created trigger system for real-time team statistics updates
- Built separate team statistics tracking independent from individual user stats
- Established team-specific database functions for wins/losses tracking
- Created comprehensive team management system with captain controls

### Ready for Next Phase:
The foundation is solid for implementing team tournament registration. All core infrastructure is in place, and Phase 2 can begin immediately.