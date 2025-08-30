# Production Broadcast System

The broadcast system has been completely redesigned for real-world production use with OBS, vMix, and other streaming tools.

## New Architecture

Instead of one complex interface, we now have separate, focused components that can be used as transparent web sources:

### Individual Broadcast Pages

#### 1. Team Roster Display
- **Route**: `/broadcast/{tournamentId}/teams` (shows first team)
- **Route**: `/broadcast/{tournamentId}/team/{teamId}` (shows specific team)
- **Features**:
  - Clean intro animation with team name
  - Individual player cards with avatars, ranks, Riot IDs
  - Shows adaptive weights for the tournament
  - Transparent background for easy layering
  - Perfect for team introductions

#### 2. Matchup Preview
- **Route**: `/broadcast/{tournamentId}/matchup/{team1Id}/{team2Id}`
- **Features**:
  - Side-by-side team comparison
  - Shows average weight and difference
  - Individual player stats for each team
  - Balance analysis (Very Balanced/Balanced/Favored)
  - Great for pre-match graphics

#### 3. Bracket Overlay
- **Route**: `/broadcast/{tournamentId}/bracket`
- **Features**:
  - Clean tournament bracket display
  - Shows match results and current status
  - Color-coded winners and completed matches
  - Live match indicators
  - Perfect for between-match content

#### 4. Player Spotlight
- **Route**: `/broadcast/{tournamentId}/player/{playerId}`
- **Features**:
  - Large player card with detailed stats
  - Current rank, peak rank, tournament weight
  - Team affiliation and captain status
  - Tournament experience metrics
  - Performance rating based on adaptive weight

#### 5. Tournament Statistics
- **Route**: `/broadcast/{tournamentId}/stats`
- **Features**:
  - Live tournament stats overview
  - Player count, match progress
  - Average tournament weight
  - Highest rank in tournament
  - Progress bar with completion percentage

### API Endpoint for External Integrations

#### Tournament Data API
- **Route**: `/broadcast/{tournamentId}/api/data`
- **Features**:
  - Returns complete tournament data as JSON
  - Teams, players, matches, adaptive weights
  - Statistics and progress information
  - Perfect for integration with external graphics tools
  - Monospace formatting for easy reading

## Key Design Principles

### 1. **Single Purpose**
Each page serves one specific broadcast need - no crowded interfaces

### 2. **Transparent Backgrounds**
All components use `bg-transparent` so they layer perfectly over your stream graphics

### 3. **Production Ready**
- No interactive controls that require mouse/keyboard
- Clean, readable fonts and appropriate sizing
- Automatic animations where appropriate
- Real tournament data, no dummy content

### 4. **Streaming Tool Compatible**
- Works perfectly as browser sources in OBS
- Compatible with vMix web inputs
- Suitable for StreamDeck integration via URL switching
- TouchPortal compatible

## Usage Examples

### OBS Setup
1. Add Browser Source
2. Set URL to specific broadcast page (e.g., `/broadcast/123/teams`)
3. Set appropriate width/height (1920x1080 recommended)
4. Enable "Shutdown source when not visible" for performance
5. Layer over your background graphics

### vMix Integration
1. Add Web Input
2. Set URL to broadcast page
3. Use as overlay or fullscreen
4. Switch between different pages using hotkeys

### StreamDeck/TouchPortal
1. Create URL actions for each broadcast page
2. Switch between team rosters, matchups, bracket, etc.
3. Perfect for caster control during live streams

## Data Features

### Real Tournament Data
- Pulls live data from tournament database
- Shows actual adaptive weights calculated for tournament
- Real player ranks and statistics
- Actual match results and bracket progression

### Weight Transparency
- Shows both base weight rating and tournament-specific adaptive weight
- Displays weight differences in matchups
- Color-coded balance indicators

### Automatic Updates
- Data refreshes when page loads
- No manual refresh needed between matches
- Always shows current tournament state

## Migration from Old System

The original `/broadcast/{id}` route still exists as a control panel for tournament organizers, but production should use the new individual routes:

- **Old**: Complex all-in-one interface with controls
- **New**: Clean, single-purpose graphics for streaming

This new system provides the flexibility and simplicity needed for professional tournament broadcasts while maintaining all the powerful data features of the original system.