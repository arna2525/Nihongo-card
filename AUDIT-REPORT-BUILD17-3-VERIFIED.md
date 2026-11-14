# Laporan Verifikasi — Kotoba Card Build 17.3 (2026-11-15.6)
Sumber: Build_17_3.zip, SHA-256 e6368e46bcc871fcee73eadeb29614ad3e294086d66f270b17b468273ead0aa9
Lingkungan: Node v22.23.4, npm 10.9.9, Chromium headless (Playwright global 1.63, /opt/pw-browsers), tanpa jaringan. acorn dan playwright dipakai lewat NODE_PATH=/opt/npm-tools/node_modules (npm install tidak dijalankan).

## Status (terpisah per gerbang)
- CODE/AUTOMATED READY: ya untuk yang diuji (npm test 72/72). Audit kode belum menyeluruh (lihat "Belum dikerjakan").
- BROWSER VERIFIED: ya. t02–t10 dijalankan di Chromium nyata; hasil di bawah. Koreksi atas laporan 17.3: browser TIDAK terblokir di lingkungan ini.
- OWNER DEVICE VERIFIED: belum (diserahkan ke pemilik).
- HUMAN CONTENT REVIEWED: belum (diserahkan ke pemilik).
- PRODUCTION RELEASE READY: belum. Tidak ada deploy.

## Temuan
### MEDIUM-1 — t04-backup usang terhadap format snapshot Undo Build 17.2/17.3 (tes, bukan kode aplikasi)
- Lokasi: tests-jft-final/t04-backup.cjs A5, A7 (membaca `localStorage[KEY+'.prerestore']` langsung sebagai S).
- Sejak 17.2 snapshot berformat `{format:"kotoba-restore-undo",state,corrections}`. Tes menimpa S dengan objek pembungkus sehingga state rusak.
- Dampak: A5, A7 gagal dan B1 ikut gagal (m0 kosong) → 3 FAIL pada `npm run test:browser` (rantai berhenti di t04, sehingga t05–t10 tidak berjalan lewat npm script). Laporan 17.3 tidak menangkap ini karena browser tidak dijalankan.
- Perbaikan: A5/A7 kini memakai jalur Undo asli (`bkUndo()` + konfirmasi `#dgy`), jadi sekaligus menguji Undo nyata di browser.
- Bukti: sebelum 13 pass/3 fail; sesudah 16 pass/0 fail.
- Tidak ada perubahan pada index.html, sw.js, atau metadata build.

## Hasil tes (dari ZIP final yang diekstrak ulang)
Lihat bagian "Hasil akhir" di bawah.

## Belum dikerjakan / batasan
- Keamanan: audit sumber + tes regresi; bukan pentest pihak ketiga.
- Kualitas materi JFT: hanya struktur (jft-content-depth 5/5), bukan terjemahan.
- Perangkat fisik iPhone/Android dan review manusia: checklist pemilik di dokumen handoff bagian 8.

## Hasil akhir (dari ZIP yang diekstrak ulang)
npm test: 72 pass, 0 fail.
npm run test:browser (Chromium nyata): t02 12, t03 6, t04 16, t05 14, t06 13, t07 9, t08 9, t09 9, t10 1, t11 1, t12 11, t13 7, t14 5 = 113 pass, 0 fail, 0 skip. Suite Node dan browser tidak dijumlahkan.

## Pekerjaan tambahan (lihat CHANGELOG-AUDIT.md, SECURITY-FINDINGS.md, FEATURE-MATRIX.md)
Audit sink XSS + tes DOM, crash/reload reward, upgrade Service Worker, fuzz backup. Tidak ada bug aplikasi baru; hanya tes t04 yang diperbaiki.
