

# Transition Plan: Beta to Production

## Overview
Promote the beta site to the root (`/`) and move original pages under `/legacy/*`. This will be done in 4 stages, verifiable after each step.

---

## Stage 1: Restructure App.tsx Routes
Rearrange the route tree so:
- `BetaLayout` becomes the root layout at `/`
- All beta child routes lose the `/beta/` prefix (e.g., `/beta/tournaments` becomes `/tournaments`)
- All original production routes move under `/legacy/*` with their existing layout (AppSidebar, Header, Footer)
- Broadcast routes (`/broadcast/*`) remain completely untouched
- Add a catch-all redirect: `/beta/*` redirects to `/` equivalents for any bookmarked URLs

**Files changed:** `src/App.tsx`

---

## Stage 2: Update All Component Links
Strip the `/beta/` prefix from every internal link in `src/components-beta/`:

| File | Changes |
|------|---------|
| BetaSidebar.tsx | ~15 navigation hrefs (`/beta/tournaments` -> `/tournaments`, etc.) |
| BetaHeader.tsx | Profile link, sign-out redirect, mobile menu links |
| BetaFooter.tsx | Help link |
| BetaGlobalSearch.tsx | Search result links |
| BetaNotificationCenter.tsx | Notification links |
| BetaBracketPreview.tsx | Bracket and match links |
| BetaDiscordLinking.tsx | OAuth redirect URL |
| BetaDisputeManager.tsx | Match link |
| BetaTeamTournamentRegistration.tsx | Navigate to my-team |

**Files changed:** 9 files in `src/components-beta/`

---

## Stage 3: Update All Page Links
Strip the `/beta/` prefix from every internal link in `src/pages-beta/`:

| File | Approximate link count |
|------|----------------------|
| BetaTournamentDetail.tsx | ~12 links (teams, profiles, matches, brackets, admin) |
| BetaMatchDetails.tsx | Profile and tournament links |
| BetaTournaments.tsx | Tournament detail links, admin link |
| BetaTeams.tsx | Team profile, my-team links |
| BetaTeamProfile.tsx | Profile links |
| BetaTeamManagement.tsx | Internal navigation |
| BetaLeaderboard.tsx | Profile links |
| BetaPlayers.tsx | Profile links |
| BetaBrackets.tsx | Bracket links |
| BetaBracketView.tsx | Match/tournament links |
| BetaProfile.tsx | Internal links |
| BetaProfileSettings.tsx | Internal links |
| BetaAdmin.tsx | Internal links |
| BetaIndex.tsx | Internal links |
| BetaStatistics.tsx, BetaHelp.tsx, BetaShop.tsx, BetaVODs.tsx | Any remaining links |

**Files changed:** Up to 18 files in `src/pages-beta/`

---

## Stage 4: Cleanup
- Remove `BetaIndicator` component from `BetaLayout.tsx` (no longer needed -- this is production now)
- Delete `src/components-beta/BetaIndicator.tsx`
- Remove `BetaInvitePopup` from the legacy layout (it invited users to beta, no longer relevant)
- Verify sign-out redirects to `/` instead of `/beta`

**Files changed:** `BetaLayout.tsx`, `BetaIndicator.tsx` (delete), `App.tsx` (remove BetaInvitePopup import from legacy)

---

## Technical Notes
- All Supabase data fetching remains unchanged -- pages already use live data
- No database changes required
- The `beta-tokens.css` stylesheet and `components-beta/` directory naming can be renamed later in a cosmetic pass, but is not functionally necessary
- Broadcast routes are isolated and unaffected

