# Production Audit Report

**Generated:** January 8, 2026  
**Status:** Critical issues resolved, lower-priority items documented for future work

---

## Executive Summary

This audit identified **45+ issues** across the codebase. Critical and high-priority issues have been **resolved**. This document tracks remaining lower-priority items.

---

## ✅ RESOLVED ISSUES

### 1. Duplicate Matches in Database (CRITICAL - FIXED)

**Problem:** 9 duplicate match records existed across 3 tournaments due to missing unique constraint.

**Affected Tournaments:**
- `14/10/25 ULANZI Skirmish` - 3 duplicates
- `28/10/25 ULANZI Skirmish` - 3 duplicates
- `30/12/25 TLR Skirmish` - 3 duplicates

**Resolution:**
- Cleaned up all duplicate matches (kept match with winner_id or most recent)
- Added unique constraint: `UNIQUE (tournament_id, round_number, match_number)`
- Migration file: Applied January 2026

---

### 2. Duplicate Toaster Component (HIGH - FIXED)

**Location:** `src/App.tsx`

**Problem:** Two `<Toaster />` components caused duplicate toast notifications.

**Resolution:** Removed duplicate Toaster from line 133.

---

### 3. Full Page Reloads from `<a>` Tags (HIGH - FIXED)

**Location:** `src/pages/NotFound.tsx` line 19

**Problem:** Using `<a href="/">` caused full page reloads instead of SPA navigation.

**Resolution:** Changed to `<Link to="/">` from react-router-dom.

---

### 4. BatchBracketGenerator Missing Pre-Check (MEDIUM - FIXED)

**Location:** `src/components/BatchBracketGenerator.tsx`

**Problem:** Unlike `BracketGenerator.tsx`, the batch version did NOT check for existing matches before inserting, causing duplicates.

**Resolution:** Added pre-generation validation with confirmation dialog and automatic cleanup of existing matches.

---

### 5. Unsafe `.single()` Queries in Critical Files (HIGH - FIXED)

**Files Fixed:**
- `src/hooks/useBroadcastData.ts` line 35 → Changed to `.maybeSingle()`
- `src/components/TeamProfile.tsx` line 57 → Changed to `.maybeSingle()`

---

## 🔶 REMAINING ISSUES (Lower Priority)

### A. Hardcoded Colors (MEDIUM)

**Instances:** 3,524 occurrences of `bg-slate-*` across 135 files

**Files with highest counts:**
- `src/components/TeamProfile.tsx` - 20+ instances
- `src/pages/Profile.tsx` - 15+ instances
- `src/components/TournamentCard.tsx` - 12+ instances

**Recommendation:** Gradually migrate to semantic color tokens from design system.

---

### B. Unsafe `.single()` Queries (LOW - 60+ files)

Many files use `.single()` without proper `PGRST116` (no rows found) handling. Most are in non-critical paths.

**Files to prioritize:**
| File | Line | Risk Level |
|------|------|------------|
| `src/pages/BracketView.tsx` | 35 | Medium |
| `src/pages/MatchDetails.tsx` | 42 | Medium |
| `src/components/VetoDialog.tsx` | 89 | Low |
| `src/hooks/useTournamentData.ts` | 67 | Low |

**Note:** Files with existing `PGRST116` error handling are safe:
- `TournamentRegistration.tsx`
- `TeamTournamentRegistration.tsx`
- `AppSettingsManager.tsx`

---

### C. Database Linter Warnings (LOW - 106 warnings)

**Type:** Function Search Path Mutable

**Description:** 106 database functions do not have `search_path` parameter set.

**Impact:** Low security risk in controlled environment.

**Fix:** Add `SET search_path = public` to all custom functions.

---

### D. Type Inconsistencies (LOW)

**Files:**
- `src/types/tournament.ts`
- `src/types/tournamentDetail.ts`

**Problem:** Overlapping/duplicated type definitions.

**Recommendation:** Consolidate into single `tournament.ts` file.

---

### E. Console.log Statements (LOW)

**Instances:** 200+ `console.log` statements remain in production code.

**Recommendation:** Replace with proper logging service or remove in production builds.

---

### F. TournamentStatsModal Links (LOW)

**Location:** `src/components/TournamentStatsModal.tsx` lines 251, 259, 267

**Current:** Uses `<a target="_blank">` for external links

**Status:** Intentional - these open new browser tabs, not SPA navigation. No change needed.

---

## Database Constraints Added

| Table | Constraint Name | Type | Columns |
|-------|-----------------|------|---------|
| matches | `matches_tournament_round_match_unique` | UNIQUE | (tournament_id, round_number, match_number) |

---

## Next Steps

1. **Immediate:** Monitor for any duplicate match errors (should no longer occur)
2. **Short-term:** Review remaining `.single()` usages in medium-risk files
3. **Long-term:** Migrate hardcoded colors to design system tokens
4. **Long-term:** Fix database function search_path warnings

---

## Changelog

| Date | Action | Files Affected |
|------|--------|----------------|
| 2026-01-08 | Added unique constraint to matches table | Database |
| 2026-01-08 | Cleaned 9 duplicate match records | Database |
| 2026-01-08 | Fixed duplicate Toaster | App.tsx |
| 2026-01-08 | Fixed `<a>` to `<Link>` routing | NotFound.tsx |
| 2026-01-08 | Added pre-check to BatchBracketGenerator | BatchBracketGenerator.tsx |
| 2026-01-08 | Fixed unsafe .single() calls | useBroadcastData.ts, TeamProfile.tsx |
