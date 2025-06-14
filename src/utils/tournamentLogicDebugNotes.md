
# Tournament Logic Debug/Design Notes

## Current Logic
- ALL match outcome processing MUST go through the new `processMatchResults` in `/components/MatchResultsProcessor.tsx`.
- This ensures bracket advancement, stats, notifications, and audit are consistent.
- The bracket generator (`BracketGenerator.tsx`) still requires validating for corner cases (for 3, 5, odd-N teams, byes correctly).
- Admin controls and user submissions now both use processor for full match completion (admin can still update scores for non-finalized matches).

## Next Steps / Remaining Gaps
- Force "in-progress" admin/post workflows (such as forcibly resetting a tournament/repairing).
- Add more tests for "dead bracket arms" (when a team is bye'd/tree'd to the final).
- Wire in audit logs for all admin/db actions for compliance.
- Prepare repair/rollback scripts for manual state-fix by admins (not in codebase yet).
- UI can further clarify bracket state before and after admin actions.

---

_Maintain this file as a source of truth and a design/debug/learn log for all major tournament flow changes._
