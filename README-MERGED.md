# Kotoba Card — Paket Gabungan Build 17

Aplikasi aktif berada di `WORK-RECOVERY-V30/` dan menggunakan **Build 17 (2026-11-15.4)**.

Build 17 menggabungkan basis keamanan/progres dari Build 15.9 dengan perbaikan penyimpanan, status sambutan Restore Timpa, harness tes browser, dan pembaruan dokumentasi dari Build 16.

## Struktur utama
- `index.html`: aplikasi aktif.
- `sw.js`, `manifest.webmanifest`, `version.json`: PWA dan metadata build.
- `tests-audit/`: audit Quiz/Mastery, penyimpanan, backup, konjugasi, dan reward.
- `tests-jft-final/`: tes browser dari Build 16.
- `tests-v29/`: regresi kompatibilitas.
- `history-v01-v29/`: arsip historis, tidak menjadi kode aktif.

## Pengujian
Jalankan `npm install`, lalu:
- `npm test` — tes otomatis Node.
- `npm run test:browser` — tes browser Chromium melalui Playwright.

Rincian asal perubahan, temuan, dan batasan pengujian ada di `AUDIT-REPORT.md`.
