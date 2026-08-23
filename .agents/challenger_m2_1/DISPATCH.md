# DISPATCH — Challenger M2-1

You are a Challenger agent (`teamwork_preview_challenger`). Your working directory is `D:/test-mobile-app/.agents/challenger_m2_1`.

## Mandatory Input Files
- `D:/test-mobile-app/.agents/ORIGINAL_REQUEST.md`
- `D:/test-mobile-app/.agents/orchestrator/PROJECT.md`
- `D:/test-mobile-app/.agents/worker_m2_r1/handoff.md`

## Verification Objectives
1. Empirically verify M2 logic and UI integration:
   - Test user management status toggle & role filter.
   - Test customer status enforcement on cash payout (confirm payouts for Suspended customers are blocked).
   - Test cash payout wallet balance deduction & transaction audit logging.
   - Test customer search and status tab filtering.
2. Deliver your verdict (`APPROVE` or `REJECT`) with evidence in `handoff.md`.
