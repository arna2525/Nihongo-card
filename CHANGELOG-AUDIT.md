# CHANGELOG AUDIT — Build 17.5 Combined Candidate

## Combined changes
- Retained Cloud Build 17.3 audit suite: DOM XSS import test (t11), reward crash/reload and two-tab test (t12), Service Worker upgrade test (t13), and 412-case backup fuzz test (t14).
- Retained Cloud's corrected t04 backup browser test using the actual Undo UI path.
- Retained Cloud's corrected t02 reward browser test synchronization (waits for asynchronous IndexedDB claim/ledger commit before asserting EXP).
- Integrated Build 17.4 application fix: startup waits for automatic IndexedDB mirror recovery before JFT reward-ledger reconciliation.
- Added startup recovery ordering regression coverage (3 checks).
- Coordinated application build, version metadata, package version, and Service Worker cache to Build 17.5 / 0.3.8.
- No UI redesign, JFT curriculum edits, or unrelated feature changes.

## Provenance
Cloud Build 17.3 contributes the broader browser/audit suite and audit documents.
Build 17.4 contributes the startup recovery race fix and its regression test.
This combined ZIP is a new candidate; historical Build 17.3 browser results are not represented as Build 17.5 browser results.
