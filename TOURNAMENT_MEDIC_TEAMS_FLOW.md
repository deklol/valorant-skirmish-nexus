# Tournament Medic Teams Tab - Complete Flow Documentation

## Overview
This document provides a step-by-step breakdown of the Tournament Medic Teams Tab autobalance system. This is the **complete reference** for understanding how team balancing works before implementing AI enhancements.

**CRITICAL**: Any AI enhancements must preserve this existing flow and integrate without breaking current functionality.

---

## Table of Contents
1. [Entry Point - Tournament Medic Teams Tab](#1-entry-point)
2. [Team Builder Interface](#2-team-builder-interface)
3. [ATLAS Weight System](#3-atlas-weight-system)
4. [Autobalance Flow](#4-autobalance-flow)
5. [Team Formation Algorithm](#5-team-formation-algorithm)
6. [Database Schema](#6-database-schema)
7. [Key Configuration](#7-key-configuration)
8. [AI Integration Points](#8-ai-integration-points)

---

## 1. Entry Point - Tournament Medic Teams Tab

**File**: `src/components/tournament-medic/TournamentMedicTeamsTab.tsx`

### Component Structure
```
TournamentMedicTeamsTab
├── Team Builder Tab (active by default)
│   └── TeamBalancingInterface Component
└── Quick Actions Tab
    ├── Discord Webhook Announcements
    ├── Team List Preview (grid cards)
    └── Team Management Actions
```

### User Flow
1. Admin navigates to Tournament Medic
2. Selects "Teams" tab
3. Sees two sub-tabs:
   - **Team Builder**: Create and balance teams
   - **Quick Actions**: Announce teams to Discord, manage existing teams

### Quick Actions Features
- **Discord Webhook**: Admins can paste a Discord webhook URL and announce teams
- **Team Preview**: Shows all teams in card grid format with members, ranks, and weights
- **Refresh Teams**: Re-fetches teams from database
- Copy team lists and import from CSV (not yet fully implemented)

---

## 2. Team Builder Interface

**File**: `src/components/TeamBalancingInterface.tsx`

This is the **primary balancing UI** that admins interact with.

### Visual Layout
```
┌─────────────────────────────────────────────┐
│ ATLAS Toggle & Balance Status               │
├─────────────────────────────────────────────┤
│ [Autobalance] [Create Teams] [Save Changes] │
├─────────────────────────────────────────────┤
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Team 1   │  │ Team 2   │  │ Team 3   │  │
│  │ 850 pts  │  │ 830 pts  │  │ 840 pts  │  │
│  │          │  │          │  │          │  │
│  │ Player A │  │ Player D │  │ Player G │  │
│  │ Player B │  │ Player E │  │ Player H │  │
│  │ Player C │  │ Player F │  │ Player I │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                              │
│  Unassigned Players                          │
│  ┌──────────────────────────────────────┐  │
│  │ [Drag players here to unassign]      │  │
│  │ Player J, Player K, Player L         │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  Substitute Players                          │
│  ┌──────────────────────────────────────┐  │
│  │ [Substitutes not in main teams]      │  │
│  │ Player M, Player N                   │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Key Features
1. **ATLAS Toggle**: Enables/disables adaptive weights (stored in `tournaments.enable_adaptive_weights`)
2. **Drag & Drop**: Manual team management with @dnd-kit
3. **Weight Display**: Each player shows their calculated weight with source badge:
   - 🔧 **Manual Override**: Admin-set weight
   - 📈 **Peak Rank**: Using peak rank instead of current
   - ⚡ **ATLAS**: AI-enhanced adaptive weight
   - Standard: Current rank weight

4. **Three Zones**:
   - **Teams**: Organized team slots (droppable)
   - **Unassigned Players**: Checked-in players not yet assigned
   - **Substitutes**: Players marked as substitutes

### State Management
```typescript
const [teams, setTeams] = useState<Team[]>([]);
const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>([]);
const [substitutePlayers, setSubstitutePlayers] = useState<Player[]>([]);
const [enableAdaptiveWeights, setEnableAdaptiveWeights] = useState(false);
const [autobalancing, setAutobalancing] = useState(false);
```

---

## 3. ATLAS Weight System

**Core Files**:
- `src/utils/unifiedWeightSystem.ts` - Abstraction layer
- `src/utils/evidenceBasedWeightSystem.ts` - ATLAS implementation
- `src/utils/adaptiveWeightSystem.ts` - Legacy system
- `src/utils/rankingSystemWithOverrides.ts` - Manual overrides

### Weight Calculation Hierarchy

```
┌─────────────────────────────────────┐
│   getUnifiedPlayerWeight()          │  ← SINGLE SOURCE OF TRUTH
└────────────┬────────────────────────┘
             │
             ├─► Manual Override? → Use manual_weight_override
             │
             ├─► ATLAS Enabled?
             │   └─► calculateEvidenceBasedWeightWithMiniAi()
             │       ├─ Base Rank Points (current or peak)
             │       ├─ Tournament Win Bonus (+15/25/35 pts)
             │       ├─ Underranked Bonus (up to +35%)
             │       └─ Mini-AI Analysis (transparency only)
             │
             └─► ATLAS Disabled?
                 └─► getRankPointsWithManualOverride()
                     ├─ Current Rank
                     └─ Peak Rank Fallback
```

### ATLAS Configuration (EVIDENCE_CONFIG)
```typescript
{
  enableEvidenceBasedWeights: true,
  tournamentWinBonus: 15, // +15 pts per tournament win
  underrankedBonusThreshold: 1.0, // 50pt drop threshold
  maxUnderrankedBonus: 0.35, // Max +35% bonus
  skillTierCaps: {
    enabled: true,
    eliteThreshold: 400, // 400+ pts = elite
    maxElitePerTeam: 1 // Max 1 elite per team
  }
}
```

### Weight Calculation Examples

#### Example 1: Standard Player
```
Player: "JohnDoe"
Current Rank: Gold 3 (155 pts)
Peak Rank: Plat 2 (215 pts)
Tournaments Won: 0
ATLAS Enabled: No

Calculation:
- Use current_rank: 155 pts
- No tournament bonus
- No underranked bonus
Final Weight: 155 pts
Source: "current_rank"
```

#### Example 2: ATLAS Enhanced Player
```
Player: "ProGamer"
Current Rank: Gold 3 (155 pts)
Peak Rank: Ascendant 2 (265 pts)
Tournaments Won: 2
ATLAS Enabled: Yes

Calculation:
- Base: 155 pts (current_rank)
- Tournament Bonus: +25 pts (2 wins)
- Underranked Bonus: (265-155)/155 = 71% drop
  → 2.2 tiers below peak → +18% bonus = +28 pts
- Mini-AI Analysis: (transparency only, no adjustment)
Final Weight: 208 pts
Source: "atlas_evidence"
Reasoning: "Base 155 + 25 tournament + 28 underranked = 208"
```

#### Example 3: Manual Override
```
Player: "AdminFavorite"
Current Rank: Silver 1 (105 pts)
Manual Override: Diamond 2 (315 pts)
use_manual_override: true

Calculation:
- Ignore current_rank
- Use manual_weight_override: 315 pts
Final Weight: 315 pts
Source: "manual_override"
```

---

## 4. Autobalance Flow

### Step-by-Step Process

#### Step 1: User Clicks "Autobalance"
**Triggers**: `handleAutoBalance()` in `TeamBalancingInterface.tsx`

```typescript
const handleAutoBalance = async () => {
  setAutobalancing(true);
  setShowProgress(true); // Shows progress modal
  
  // Fetch checked-in players
  const { data: signups } = await supabase
    .from('tournament_signups')
    .select('user_id, users(...)')
    .eq('tournament_id', tournamentId)
    .eq('is_checked_in', true);
  
  // Calculate number of teams
  const teamsToCreate = Math.min(
    maxTeams, 
    Math.floor(signups.length / teamSize)
  );
  
  // Run ATLAS algorithm
  const result = await evidenceBasedSnakeDraft(
    signups.map(s => s.users),
    teamsToCreate,
    teamSize,
    onProgress,      // Progress callback
    onValidationStart, // Validation callback
    onWeightCalc,    // Weight calculation callback
    EVIDENCE_CONFIG  // ATLAS config
  );
  
  // Display results in UI (preview mode)
  setBalanceAnalysis(result);
  setTeams(result.teams);
  setAutobalancing(false);
};
```

#### Step 2: ATLAS Algorithm Executes
**File**: `src/components/team-balancing/EvidenceBasedSnakeDraft.ts`

**Main Function**: `evidenceBasedSnakeDraft()`

##### Phase 1: Weight Calculation
```typescript
// Process each player through ATLAS
const processedPlayers = await Promise.all(
  players.map(async (player) => {
    const evidenceResult = await calculateEvidenceBasedWeightWithMiniAi(
      player, 
      config
    );
    
    return {
      ...player,
      evidenceWeight: evidenceResult.finalAdjustedPoints,
      evidenceReasoning: evidenceResult.evidenceCalculation?.calculationReasoning,
      isElite: evidenceResult.finalAdjustedPoints >= 400
    };
  })
);
```

**Progress Callback**: Reports weight calculation for each player
**Output**: Array of players with `evidenceWeight` and `isElite` flags

##### Phase 2: Team Formation (Anti-Stacking)
```typescript
function createBalancedTeamsWithAntiStacking(players, numTeams, teamSize) {
  const teams = Array(numTeams).fill([]);
  
  // Sort players by evidenceWeight (highest first)
  const sortedPlayers = [...players].sort(
    (a, b) => b.evidenceWeight - a.evidenceWeight
  );
  
  // Identify highest weight player for anti-stacking
  const highestWeightPlayer = sortedPlayers[0];
  
  // === BALANCE-AWARE CAPTAIN ASSIGNMENT ===
  const captains = sortedPlayers.slice(0, numTeams);
  captains.forEach((captain) => {
    // Find team with lowest current weight
    const targetTeam = findOptimalTeamForPlayer(captain, teams);
    teams[targetTeam].push(captain);
  });
  
  // === REMAINING PLAYER ASSIGNMENT ===
  const remainingPlayers = sortedPlayers.slice(numTeams);
  remainingPlayers.forEach((player) => {
    const targetTeam = findOptimalTeamForPlayer(player, teams);
    
    // ANTI-STACKING: Prevent elite players on strongest team
    if (player.isElite && targetTeam === strongestTeamIndex) {
      // Redirect to alternative team
      targetTeam = findAlternativeTeam(player, teams);
    }
    
    teams[targetTeam].push(player);
  });
  
  return teams;
}
```

**Key Anti-Stacking Rules**:
1. **Captain Assignment**: Highest weight player does NOT automatically go to Team 1
   - Each captain assigned to team with lowest current weight
   - Distributes top players evenly

2. **Elite Player Prevention**: Players with 400+ points (elite)
   - If assigned to strongest team → redirect to alternative team
   - Ensures no single team has multiple elite players

3. **Balance-Aware Assignment**: Every player assignment considers:
   - Current team totals
   - Number of players per team
   - Elite player distribution

##### Phase 3: Smart ATLAS Validation
```typescript
// Initial anti-stacking validation
let antiStackingResults = validateAntiStacking(teams);

if (!antiStackingResults.isValid) {
  // Perform smart balancing with swap optimization
  const optimizationResult = performSmartAtlasBalancing(
    teams, 
    highestWeightPlayer
  );
  
  teams = optimizationResult.teams;
  
  // Re-validate after optimization
  antiStackingResults = validateAntiStacking(teams);
}
```

**Smart Balancing Strategies**:
1. **Direct Swap**: Swap two players between teams
2. **Secondary Swap**: Find indirect swap paths
3. **Cascading Swap**: Multi-team chain swaps
4. **Fallback**: Accept best available balance

**Validation Checks**:
- Highest weight player NOT on strongest team
- Elite player distribution (max 1 per team)
- Overall point balance quality

#### Step 3: Results Preview
**UI Component**: Shows balance results before committing

```typescript
<DetailedBalanceAnalysis
  balanceResult={balanceAnalysis}
  teams={teams}
  showOptimizationDetails={true}
/>
```

**Displays**:
- Team totals with balance quality badge (ideal/good/warning/poor)
- Player assignments with reasoning
- Anti-stacking validation results
- ATLAS decisions and swap suggestions

#### Step 4: Commit to Database
**Triggers**: User clicks "Save Teams"

```typescript
const handleSaveTeams = async () => {
  // Delete existing teams
  await clearExistingTeams();
  
  // Create new teams
  for (const team of balanceAnalysis.teams) {
    const { data: newTeam } = await supabase
      .from('teams')
      .insert({
        name: `Team ${team[0].discord_username}`,
        tournament_id: tournamentId,
        total_rank_points: calculateTeamWeight(team),
        seed: teamIndex + 1
      })
      .select()
      .single();
    
    // Add team members
    for (const player of team) {
      await supabase
        .from('team_members')
        .insert({
          team_id: newTeam.id,
          user_id: player.id,
          is_captain: playerIndex === 0 // First player is captain
        });
    }
    
    // Send notifications
    await notifyTeamAssigned(newTeam.id, teamName, playerIds);
  }
  
  // Save balance analysis metadata
  await supabase
    .from('tournaments')
    .update({
      balance_analysis: {
        timestamp: new Date().toISOString(),
        method: "ATLAS Evidence-Based Draft",
        balance_steps: balanceAnalysis.balanceSteps,
        final_balance: balanceAnalysis.finalAnalysis,
        atlas_validation: { /* detailed ATLAS decisions */ }
      }
    })
    .eq('id', tournamentId);
};
```

---

## 5. Team Formation Algorithm

### Balance-Aware Captain Distribution

**Problem**: Old snake draft put highest weight player always on Team 1
**Solution**: ATLAS distributes captains to minimize initial imbalance

```
Old Snake Draft:
Team 1: Player 1 (500pts) ← Always strongest
Team 2: Player 2 (480pts)
Team 3: Player 3 (470pts)
...continues snake pattern

ATLAS Balance-Aware:
Step 1: Assign Player 1 (500pts) → Team with lowest weight
Step 2: Assign Player 2 (480pts) → Team with lowest weight
Step 3: Assign Player 3 (470pts) → Team with lowest weight
Result: Captains distributed to minimize variance
```

### Anti-Stacking Prevention

**Critical Rules**:
1. **Highest Weight Player Rule**: Player with highest evidenceWeight MUST NOT be on the strongest team
   - If violation detected → trigger smart balancing
   - Find swap that resolves violation

2. **Elite Stacking Rule**: Teams with 400+ point player (elite) should not also be strongest
   - During formation: redirect elite players from strongest team
   - During validation: swap elite players if on strongest team

3. **Radiant History Rule** (legacy, superseded by ATLAS):
   - Players who have ever been Radiant should not be on strongest team
   - ATLAS anti-stacking is more comprehensive

### Smart Balancing Swap System

When violations detected, ATLAS tries swaps in priority order:

```typescript
// Strategy 1: Direct Swap (highest priority)
// Swap highest player with player from weaker team
if (canSwap(highestPlayer, candidateFromWeakerTeam)) {
  executeSwap(highestPlayer, candidateFromWeakerTeam);
}

// Strategy 2: Secondary Swap
// Find best swap pair that improves balance
const bestSwapPair = findOptimalSwapPair(teams);
executeSwap(bestSwapPair.player1, bestSwapPair.player2);

// Strategy 3: Cascading Swap
// Multi-team chain of swaps
const swapChain = findSwapChain(teams);
executeSwapChain(swapChain);

// Strategy 4: Accept Best Available
// If no swap improves balance, accept current state
acceptCurrentBalance();
```

**Swap Evaluation Criteria**:
- Resolves anti-stacking violations
- Improves overall point balance
- Maintains team size constraints
- Minimizes disruption to existing assignments

---

## 6. Database Schema

### Core Tables

#### tournaments
```sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  team_size INTEGER DEFAULT 5,
  max_teams INTEGER DEFAULT 8,
  enable_adaptive_weights BOOLEAN DEFAULT false, -- ATLAS toggle
  balance_analysis JSONB, -- Stores complete balance metadata
  status tournament_status,
  ...
);
```

**balance_analysis structure**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "method": "ATLAS Evidence-Based Draft with Intelligence",
  "systemUsed": "ATLAS (Adaptive Tournament League Analysis System)",
  "atlasEnhanced": true,
  "balance_steps": [
    {
      "round": 1,
      "player": {
        "name": "ProGamer",
        "rank": "Ascendant 2",
        "points": 285,
        "isElite": false,
        "evidenceWeight": 285,
        "weightSource": "atlas_evidence",
        "evidenceReasoning": "Base 265 + 20 underranked = 285"
      },
      "assignedTo": "Team 1",
      "reasoning": "BALANCE-AWARE CAPTAIN: Optimal distribution assignment",
      "phase": "team_formation",
      "teamStates": [...]
    }
  ],
  "finalTeamStats": [...],
  "atlasValidation": {
    "originalSkillDistribution": {...},
    "skillStackingViolations": 0,
    "elitePlayersPerTeam": [0, 0, 0, 1, 0, 0, 0, 0],
    "redistributions": [],
    "atlasDecisions": [...],
    "validationTime": 245,
    "totalDecisions": 3
  },
  "antiStackingValidation": {
    "isValid": true,
    "violations": [],
    "highestWeightPlayerTeam": 4,
    "strongestTeamIndex": 2,
    "teamTotals": [850, 830, 870, 840, 810, 820, 860, 790],
    "summary": "0 violations found"
  }
}
```

#### tournament_signups
```sql
CREATE TABLE tournament_signups (
  id UUID PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id),
  user_id UUID REFERENCES users(id),
  is_checked_in BOOLEAN DEFAULT false,
  is_substitute BOOLEAN DEFAULT false,
  signed_up_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ
);
```

#### teams
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id),
  name TEXT NOT NULL,
  total_rank_points INTEGER DEFAULT 0,
  seed INTEGER, -- Team placement order
  captain_id UUID REFERENCES users(id),
  status team_status
);
```

#### team_members
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES users(id),
  is_captain BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now()
);
```

#### users (relevant fields)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  discord_username TEXT,
  current_rank TEXT,
  peak_rank TEXT,
  weight_rating INTEGER,
  manual_rank_override TEXT,
  manual_weight_override INTEGER,
  use_manual_override BOOLEAN DEFAULT false,
  rank_override_reason TEXT,
  tournaments_won INTEGER DEFAULT 0,
  tournaments_played INTEGER DEFAULT 0,
  last_tournament_win TIMESTAMPTZ,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0
);
```

#### tournament_adaptive_weights (optional tracking)
```sql
CREATE TABLE tournament_adaptive_weights (
  id UUID PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id),
  user_id UUID REFERENCES users(id),
  current_rank TEXT,
  peak_rank TEXT,
  current_rank_points INTEGER,
  peak_rank_points INTEGER,
  adaptive_factor NUMERIC,
  calculated_adaptive_weight INTEGER,
  weight_source TEXT,
  calculation_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 7. Key Configuration

### EVIDENCE_CONFIG (ATLAS Configuration)
**File**: `src/utils/evidenceBasedWeightSystem.ts`

```typescript
export const EVIDENCE_CONFIG = {
  enableEvidenceBasedWeights: true,
  tournamentWinBonus: 15, // +15 pts per tournament win
  underrankedBonusThreshold: 1.0, // Start bonus at 1 tier (50pts) below peak
  maxUnderrankedBonus: 0.35, // Maximum +35% underranked bonus
  skillTierCaps: {
    enabled: true,
    eliteThreshold: 400, // 400+ points = elite player
    maxElitePerTeam: 1 // Maximum 1 elite player per team
  },
  tournamentWinBonusAdaptive: {
    enabled: true,
    lowPoint: 190,
    highPoint: 400,
    lowRankBonus: 25,  // Low rank players get more bonus per win
    highRankBonus: 8,  // Elite players get less bonus per win
    unrankedBonus: 15
  }
};
```

### RANK_POINT_MAPPING
**File**: `src/utils/rankingSystem.ts`

```typescript
export const RANK_POINT_MAPPING: Record<string, number> = {
  'Iron 1': 0,
  'Iron 2': 10,
  'Iron 3': 20,
  'Bronze 1': 30,
  'Bronze 2': 40,
  'Bronze 3': 50,
  'Silver 1': 60,
  'Silver 2': 70,
  'Silver 3': 80,
  'Gold 1': 90,
  'Gold 2': 100,
  'Gold 3': 110,
  'Platinum 1': 120,
  'Platinum 2': 130,
  'Platinum 3': 140,
  'Diamond 1': 150,
  'Diamond 2': 160,
  'Diamond 3': 170,
  'Ascendant 1': 180,
  'Ascendant 2': 190,
  'Ascendant 3': 200,
  'Immortal 1': 210,
  'Immortal 2': 220,
  'Immortal 3': 230,
  'Radiant': 240,
  'Unranked': 150,  // Default fallback
  'Unrated': 150
};
```

---

## 8. AI Integration Points

### Where AI Enhancements Can Be Added

#### 🎯 Priority 1: Post-Tournament Learning (HIGH VALUE)
**Location**: After tournament completion
**Purpose**: Analyze ATLAS predictions vs actual results
**Implementation**: New edge function `ai-tournament-analysis`

```typescript
// Triggered when tournament.status = 'completed'
async function analyzeTournamentResults(tournamentId: string) {
  // 1. Fetch balance_analysis (ATLAS predictions)
  const { balance_analysis } = await getTournament(tournamentId);
  
  // 2. Fetch actual match results
  const matches = await getMatches(tournamentId);
  
  // 3. Compare predictions to reality
  const analysis = await aiAnalyzePredictionAccuracy(
    balance_analysis,
    matches
  );
  
  // 4. Store learning insights
  await storeAILearningHistory(tournamentId, analysis);
  
  // 5. Suggest EVIDENCE_CONFIG adjustments
  if (analysis.accuracy < 0.85) {
    return {
      suggestedAdjustments: {
        tournamentWinBonus: analysis.suggestedTournamentWinBonus,
        underrankedBonusThreshold: analysis.suggestedThreshold
      },
      confidence: analysis.confidence,
      reasoning: analysis.reasoning
    };
  }
}
```

**Database Table**:
```sql
CREATE TABLE ai_learning_history (
  id UUID PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id),
  accuracy_score FLOAT, -- 0-1 score of ATLAS prediction accuracy
  predicted_balance_quality TEXT,
  actual_balance_quality TEXT,
  suggested_adjustments JSONB,
  applied BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Integration Point**: Add to `src/utils/tournamentCompletionHandler.ts`

#### 🎯 Priority 2: AI Confidence Scoring (QUICK WIN)
**Location**: Weight calculation display
**Purpose**: Show confidence in each player's weight
**Implementation**: Enhance `getUnifiedPlayerWeight()`

```typescript
// Add to unifiedWeightSystem.ts
interface UnifiedPlayerWeight {
  points: number;
  source: string;
  rank: string;
  reasoning: string;
  isValid: boolean;
  aiConfidence?: number; // NEW: 0-1 confidence score
  aiConfidenceReason?: string; // NEW: Why this confidence level
}

async function getUnifiedPlayerWeightWithConfidence(
  userData: any, 
  options: PlayerWeightOptions
): Promise<UnifiedPlayerWeight> {
  const baseResult = await getUnifiedPlayerWeight(userData, options);
  
  if (options.enableATLAS) {
    // Call AI to evaluate confidence
    const confidence = await aiEvaluateWeightConfidence({
      currentRank: userData.current_rank,
      peakRank: userData.peak_rank,
      tournamentsWon: userData.tournaments_won,
      calculatedWeight: baseResult.points,
      lastRankUpdate: userData.last_rank_update
    });
    
    return {
      ...baseResult,
      aiConfidence: confidence.score,
      aiConfidenceReason: confidence.reasoning
    };
  }
  
  return baseResult;
}
```

**UI Display**: Add confidence badge to player cards
```tsx
{player.aiConfidence && (
  <Badge className={`
    ${player.aiConfidence >= 0.8 ? 'bg-green-600' : 
      player.aiConfidence >= 0.6 ? 'bg-yellow-600' : 
      'bg-red-600'}
  `}>
    {Math.round(player.aiConfidence * 100)}% Confidence
  </Badge>
)}
```

#### 🎯 Priority 3: Smurf Detection (SECURITY)
**Location**: Player weight calculation anomaly detection
**Purpose**: Flag players performing way above/below their rank
**Implementation**: New utility `src/utils/smurfDetection.ts`

```typescript
interface SmurfDetectionResult {
  isSuspicious: boolean;
  severity: 'low' | 'medium' | 'high';
  reasoning: string;
  suggestedAction: 'monitor' | 'manual_review' | 'adjust_weight';
  suggestedWeight?: number;
}

async function detectSmurfBehavior(
  userId: string, 
  tournamentResults: TournamentResult[]
): Promise<SmurfDetectionResult> {
  // 1. Calculate expected performance from ATLAS weight
  const user = await getUser(userId);
  const atlasWeight = await getUnifiedPlayerWeight(user);
  const expectedWinRate = calculateExpectedWinRate(atlasWeight.points);
  
  // 2. Get actual performance from recent tournaments
  const actualWinRate = calculateActualWinRate(tournamentResults);
  
  // 3. Statistical analysis
  const stdDeviations = Math.abs(actualWinRate - expectedWinRate) / 
                        calculateStdDev(expectedWinRate);
  
  // 4. AI-enhanced analysis
  const aiAnalysis = await aiAnalyzePerformanceAnomaly({
    username: user.discord_username,
    atlasWeight: atlasWeight.points,
    currentRank: user.current_rank,
    expectedWinRate,
    actualWinRate,
    tournamentHistory: tournamentResults
  });
  
  if (stdDeviations > 2.0) {
    return {
      isSuspicious: true,
      severity: stdDeviations > 3.0 ? 'high' : 'medium',
      reasoning: aiAnalysis.reasoning,
      suggestedAction: 'manual_review',
      suggestedWeight: aiAnalysis.suggestedWeight
    };
  }
  
  return { isSuspicious: false, severity: 'low', reasoning: 'Normal performance variance' };
}
```

**Admin Alert**: Add to Tournament Medic dashboard

#### 🎯 Priority 4: Dynamic Weight Adjustments (ADVANCED)
**Location**: Pre-tournament weight calculation
**Purpose**: Adjust weights based on recent hot/cold streaks
**Implementation**: Track rolling performance

```sql
CREATE TABLE user_performance_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  last_30_day_win_rate FLOAT,
  last_3_tournaments JSONB[], -- Array of recent results
  performance_trend TEXT, -- 'improving' | 'declining' | 'stable'
  confidence_score FLOAT, -- How reliable is this trend
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

```typescript
// Add to evidenceBasedWeightSystem.ts
async function calculateEvidenceBasedWeightWithTrend(
  userData: ExtendedUserRankData
): Promise<EnhancedEvidenceResult> {
  const baseResult = calculateEvidenceBasedWeight(userData);
  
  // Get recent performance trend
  const trend = await getUserPerformanceTrend(userData.id);
  
  if (trend.confidence_score >= 0.7) {
    let trendAdjustment = 0;
    
    if (trend.performance_trend === 'improving') {
      trendAdjustment = Math.round(baseResult.points * 0.05); // +5%
    } else if (trend.performance_trend === 'declining') {
      trendAdjustment = Math.round(baseResult.points * -0.05); // -5%
    }
    
    return {
      ...baseResult,
      points: baseResult.points + trendAdjustment,
      evidenceCalculation: {
        ...baseResult.evidenceCalculation,
        calculationReasoning: `${baseResult.evidenceCalculation.calculationReasoning}\n` +
          `Trend Adjustment: ${trendAdjustment > 0 ? '+' : ''}${trendAdjustment} pts (${trend.performance_trend})`
      }
    };
  }
  
  return baseResult;
}
```

#### 🎯 Priority 5: Match Outcome Predictions (VALIDATION)
**Location**: After team creation, before tournament starts
**Purpose**: Predict match winners to validate balance quality
**Implementation**: New utility `src/utils/matchPrediction.ts`

```typescript
interface MatchPrediction {
  matchId: string;
  team1Id: string;
  team2Id: string;
  predictedWinnerId: string;
  confidence: number; // 0.5 = perfect balance, 1.0 = guaranteed win
  reasoning: string;
}

async function predictMatchOutcomes(
  tournamentId: string
): Promise<MatchPrediction[]> {
  const matches = await getMatches(tournamentId);
  const teams = await getTeams(tournamentId);
  
  const predictions = await Promise.all(
    matches.map(async (match) => {
      const team1 = teams.find(t => t.id === match.team1_id);
      const team2 = teams.find(t => t.id === match.team2_id);
      
      // AI prediction based on team weights and historical data
      const prediction = await aiPredictMatchWinner({
        team1Weight: team1.total_rank_points,
        team2Weight: team2.total_rank_points,
        team1Members: team1.members,
        team2Members: team2.members,
        historicalMatchups: await getHistoricalMatchups(
          team1.members.map(m => m.user_id),
          team2.members.map(m => m.user_id)
        )
      });
      
      return {
        matchId: match.id,
        team1Id: match.team1_id,
        team2Id: match.team2_id,
        predictedWinnerId: prediction.winnerId,
        confidence: prediction.confidence,
        reasoning: prediction.reasoning
      };
    })
  );
  
  // Flag potentially unbalanced matches
  const unbalancedMatches = predictions.filter(p => p.confidence > 0.75);
  
  if (unbalancedMatches.length > 0) {
    console.warn(`⚠️ ${unbalancedMatches.length} potentially unbalanced matches detected`);
  }
  
  return predictions;
}
```

**Database Table**:
```sql
CREATE TABLE ai_match_predictions (
  id UUID PRIMARY KEY,
  match_id UUID REFERENCES matches(id),
  predicted_winner_id UUID REFERENCES teams(id),
  confidence FLOAT,
  reasoning TEXT,
  actual_winner_id UUID,
  was_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Integration**: Add to balance preview UI

---

## Critical Rules for AI Implementation

### ✅ DO:
1. **Preserve existing ATLAS flow**: All new AI features must integrate without breaking current functionality
2. **Use unifiedWeightSystem**: Always call `getUnifiedPlayerWeight()` for consistency
3. **Respect manual overrides**: Never override admin-set weights
4. **Log all AI decisions**: Use `atlasLogger` for transparency
5. **Add confidence scores**: AI suggestions should include confidence levels
6. **Store learning history**: Track AI performance for improvement
7. **Follow existing patterns**: Match code style and architecture

### ❌ DON'T:
1. **Don't bypass ATLAS**: Never calculate weights outside unified system
2. **Don't auto-apply AI suggestions**: Always show to admin for approval
3. **Don't break drag-and-drop**: Preserve manual team management
4. **Don't modify EVIDENCE_CONFIG directly**: Store AI suggestions separately
5. **Don't ignore anti-stacking**: AI must respect elite player distribution rules
6. **Don't remove transparency**: Keep all existing logging and reasoning
7. **Don't change database schema without migration**: Use proper Supabase migrations

---

## Testing Checklist

Before deploying AI enhancements:

- [ ] ATLAS toggle still works (on/off)
- [ ] Autobalance creates teams successfully
- [ ] Drag-and-drop still functional
- [ ] Manual overrides respected
- [ ] Weight calculations consistent with existing system
- [ ] Anti-stacking validation passes
- [ ] Balance analysis saves correctly
- [ ] Team notifications sent
- [ ] Discord announcements work
- [ ] All existing unit tests pass
- [ ] New AI features have confidence scores
- [ ] AI suggestions stored but not auto-applied
- [ ] Admin can approve/reject AI recommendations
- [ ] Performance acceptable (<5s for weight calculations)
- [ ] Database migrations applied successfully

---

## Summary

This tournament medic teams tab is a **sophisticated, production-ready system** with:

1. **ATLAS Weight System**: Evidence-based calculation with tournament wins, underranked bonuses, and elite tier tracking
2. **Anti-Stacking Algorithm**: Prevents skill concentration through balance-aware captain assignment
3. **Smart Validation**: Post-formation optimization with swap strategies
4. **Complete Transparency**: Detailed balance_analysis with reasoning for every decision
5. **Manual Override Support**: Admins can set custom weights
6. **Drag-and-Drop Interface**: Intuitive team management
7. **Progress Tracking**: Real-time feedback during balancing

**AI enhancements should augment this system, not replace it.**

The five priority AI integration points provide:
- **Learning** (post-tournament analysis)
- **Transparency** (confidence scoring)
- **Security** (smurf detection)
- **Adaptation** (dynamic adjustments)
- **Validation** (match predictions)

All AI features must:
- Integrate without breaking existing flow
- Require admin approval for significant changes
- Provide confidence scores and reasoning
- Log all decisions for transparency
- Store learning history for improvement

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-15  
**Maintained By**: AI Assistant  
**Next Review**: Before implementing any AI enhancements
