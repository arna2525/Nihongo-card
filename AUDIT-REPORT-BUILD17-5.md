# Audit Report — Kotoba Card Build 17.5 Combined Candidate

Build: `2026-11-15.8` · App/package version: `0.3.8` · Combined from Cloud Build 17.3 audit ZIP and Build 17.4 startup-recovery fix.

## Merge decisions
- Cloud Build 17.3 was used as baseline because it contains browser suites t11–t14 and the corrected asynchronous reward assertion in t02.
- Build 17.4's `index.html`, Service Worker, version metadata, startup regression test, and test harness promise mock were integrated.
- The full Cloud browser test command was retained; the new startup recovery test was added to `npm test`.

## Application change
Startup waits for `mirrorRecover()` to complete before `jftReconcileFromIdb()` starts. This prevents a later mirror restore from overwriting reward reconciliation performed against the fresh initial state.

## Verification performed on this exact extracted ZIP
- `npm test`: **75 passed, 0 failed** across audit unit, storage, backup, JFT content/reward, legacy regression, security/import, Service Worker simulation, flashcard, and startup recovery suites.
- `npm run test:browser`: **not run** because the Node Playwright package is unavailable in this execution environment. A separate Python Playwright launch attempt was blocked from reaching the local test server (`ERR_BLOCKED_BY_ADMINISTRATOR`).
- Browser results recorded for Build 17.3 are historical only and are not evidence for this modified Build 17.5 candidate.

## Release gates not claimed
- Browser automation against this exact Build 17.5 ZIP until rerun.
- Physical iPhone Safari/PWA and Android Chrome/PWA checks.
- Human review of JFT translations and educational accuracy.
- External penetration test and exhaustive process-kill injection at every reward transaction boundary.

No production deployment is included.
