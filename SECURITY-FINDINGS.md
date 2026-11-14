# SECURITY-FINDINGS — Build 17.5 Combined Candidate

Scope: source review and deterministic regression suites. This is not a third-party penetration test.

## Integrated coverage
- Four current HTML insertion sinks are reviewed: `kSelUI()`, `kList()`, `R()`, and `qFinish()`.
- User-facing text is escaped through `e()`; imported IDs are constrained by backup validation and locally generated IDs.
- Backup import has a 20 MB cap, rejects prototype-sensitive keys recursively, validates IDs/duplicates, and bounds fields/corrections.
- JFT reward claims use IndexedDB idempotency, fail-closed behavior, restore epoch checks, and startup reconciliation.
- Build 17.4 fix is retained: mirror recovery completes before reward reconciliation begins.
- Service Worker required assets, safe cache retirement, navigation/offline fallback, and bypass rules are covered by simulation and browser suites.

## Residual findings
- LOW: `e()` does not escape apostrophes. Reviewed dynamic attributes use double quotes; no exploitable apostrophe-delimited context was identified in the reviewed sinks. Consider `&#39;` as defense-in-depth if renderer contexts change.
- LOW: IDs used in inline handlers rely on validation/local generation. Existing same-origin localStorage/IndexedDB are not revalidated on every render; same-origin script execution would already imply a compromised origin.
- INFO: Google Fonts requests expose the user's IP to Google; no app user data is included. Consider self-hosting fonts if eliminating this external request is desired.

## Test suite carried forward
- `t11-xss-dom.cjs`: hostile import payloads and DOM interaction, including a negative control.
- `t12-reward-crash.cjs`: reward crash/reload recovery and two-tab duplicate claim scenarios.
- `t13-sw-upgrade.cjs`: old-cache upgrade with open tab and offline behavior.
- `t14-backup-fuzz.cjs`: 412 malformed/hostile backup payloads.
- `tests-audit/startup-recovery-order.cjs`: 3 startup sequencing regression checks.

## Verification limits
The Cloud report recorded browser checks on its Build 17.3 ZIP. They must be rerun against this combined Build 17.5 ZIP before claiming browser-verified status. The exact Build 17.5 `npm test` run passed 75/75; the browser suite was not executable in this environment. Physical iOS/Android checks, human JFT content review, external penetration testing, and exhaustive kill-point injection remain unverified.
