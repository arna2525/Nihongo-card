# Audit Report — Kotoba Card Build 17.3 Candidate

Build: `2026-11-15.6` · App version: `0.3.6` · Service Worker cache: `kotoba-v0.1.0-build17-3`

## Decision

**Candidate only — not production release-ready yet.** The code-side changes and deterministic Node tests pass. Browser automation could not be executed in this environment because Chromium navigation to both localhost and file URLs returns `ERR_BLOCKED_BY_ADMINISTRATOR`. Physical iPhone/Android checks are intentionally left to the owner.

## Changes completed

1. Retained the Build 17.2 Restore Undo snapshot of app state plus IndexedDB dictionary corrections; Undo writes corrections back before clearing its recovery snapshot.
2. Retained Restore Gabung welcome-state correction.
3. Hardened backup import: reject payloads above 20 MB, skip oversized Kotoba fields, and cap imported dictionary corrections at 10,000 rows.
4. Added security/import regressions for prototype-pollution keys, unsafe IDs, HTML-like user content, inline handler injection, and the four current `innerHTML` assignment sites.
5. Added Service Worker lifecycle simulation: core install failure does not retire old cache; successful activation removes only old `kotoba-v*` caches and claims clients.
6. Replaced obsolete t02 E1 expectation with current fail-closed semantics when IndexedDB is unavailable: no EXP award and the answer chunk remains available for retry.
7. Replaced obsolete t07 personal-SRS browser flow with tests for the current JFT Kotoba flashcard flow.
8. Fixed `jftFlashExit()` to clear `JFT_FLASH` after recording study time, preventing stale flashcard state from remaining in memory.
9. Added curriculum structure checks for 1,497 Kotoba rows, 610 Kanji rows, 73 Bunpou patterns and 73 paired explanations, 49 verbs, and 13 conjugation form labels. Repeated Kotoba entries are across lesson numbers; no exact Kotoba+reading pair repeats within the same lesson.
10. Bumped app build, package version, metadata, and Service Worker cache together.

## Automated test results

`npm test`: **72 passed, 0 failed**.

| Suite | Passed | Failed |
|---|---:|---:|
| Audit unit | 14 | 0 |
| Storage safety | 6 | 0 |
| Backup state/import | 9 | 0 |
| JFT conjugation content | 3 | 0 |
| JFT async reward/recovery | 11 | 0 |
| Compatible regression | 11 | 0 |
| Security/import | 3 | 0 |
| Service Worker update simulation | 3 | 0 |
| JFT curriculum depth | 5 | 0 |
| JFT flashcard logic | 7 | 0 |

## Remaining release gates

- Run browser automation `npm run test:browser` (t02–t10) on an unrestricted CI or local environment. This includes real IndexedDB behavior, reload, multi-tab, backup UI, Service Worker offline/update, responsive viewport, assessments, and button smoke tests. The harnesses are prepared but not passed here.
- Owner performs physical iPhone Safari/PWA and Android Chrome/PWA checks, including offline launch, update from old installed version, storage persistence, and force-close/reopen.
- Owner performs external human content review of JFT accuracy and user experience.

## Important scope note

The XSS checks here are deterministic code-level regression tests around the known HTML insertion points and imported text/IDs. They are not a third-party penetration test or a guarantee that every possible browser security issue has been eliminated. Likewise, curriculum structure checks do not replace a human review of every translation and pedagogical nuance.
