# FEATURE-MATRIX — Build 17.3 (hanya yang dibuktikan tes; "tidak diuji" dinyatakan eksplisit)
| Area | Skenario | Hasil | Bukti |
|---|---|---|---|
| Penyimpanan | Reload memulihkan sesi/progres/Kanji harian | PASS | t03 A1-A2 |
| Penyimpanan | localStorage korup → pulih dari mirror IndexedDB | PASS | t03 B1 |
| Penyimpanan | Kuota penuh → peringatan terlihat (saveFail) | PASS | t03 C1, storage-safety |
| Multi-tab | Tab lama tidak menimpa progres tab lain (base-key hilang) | PASS | t03 D1, storage-safety (2 regresi) |
| Reward JFT | 7 benar = 30 EXP sekali; klik cepat/multi-tab tidak ganda | PASS | t02 (12), jft-reward (11) |
| Reward JFT | Crash setelah klaim IDB sebelum ledger lokal → pulih 30 EXP sekali, reload berulang stabil | PASS | t12 A1-A4 |
| Reward JFT | IDB tidak tersedia → fail-closed, chunk utuh, retry memberi 30 sekali | PASS | t12 B1-B4 |
| Reward JFT | Dua tab klaim id sama → 1 CLAIMED + 1 EXISTS, EXP sekali | PASS | t12 C1-C2 |
| Reward JFT | Transaksi stale setelah Restore Timpa ditolak | PASS (unit) | jft-reward |
| Backup | Ekspor memuat jft/ledger/sharedProgress | PASS | t04 A0 |
| Backup | Timpa: EXP/ledger kembali ke backup, stabil setelah reload, welcome tidak muncul | PASS | t04 A2-A3, A6 |
| Backup | Urungkan (jalur asli) memulihkan state + koreksi; stabil setelah reload | PASS | t04 A5, A7 (diperbaiki) |
| Backup | Gabung dua kali tidak menggandakan | PASS | t04 B1 |
| Backup | Ditolak: tidak valid / versi lebih baru, data tak berubah | PASS | t04 C1-C2 |
| Backup | Fuzz tipe salah/terpotong/hostile | PASS | t14 |
| Keamanan | DOM XSS lewat impor + klik semua layar | PASS | t11 |
| PWA | Manifest, ikon, aset, versi konsisten | PASS | t05 M1-M4 |
| PWA | SW terdaftar, cache, offline launch, belajar offline 30 EXP | PASS | t05 S1-S4, O1-O5 |
| PWA | Upgrade dari cache lama dengan tab terbuka; cache pihak ketiga utuh; data utuh; offline setelah upgrade | PASS | t13 U1-U6 |
| UI | Responsif, 13 pemeriksaan | PASS | t06 |
| UI | 366 klik tombol di 13 layar tanpa error JS | PASS | t10 |
| Kotoba | Flashcard JFT Kotoba, keluar flashcard | PASS | t07 (9), jft-flashcard (7) |
| Kuis/Mastery | Pola, skor, statistik, aturan Mastery 3/3, antrean | PASS | t08 (9), audit unit (14) |
| JFT | Assessment, hasil, reward | PASS | t09 (9) |
| JFT konten | 1.497 Kotoba, 610 Kanji, 73 Bunpou, 49 kata kerja, 13 bentuk; konjugasi | PASS (struktur saja) | jft-content (3), jft-content-depth (5) |
| Kartu pribadi/SRS lama (t07 versi lama) | Tidak lagi fitur aktif di tab KOTOBA V30 | TIDAK DIUJI (digantikan) | KNOWN-OUTDATED.md |
| Perangkat fisik iOS/Android | - | TIDAK DIUJI | checklist pemilik |
| Akurasi terjemahan/UX | - | TIDAK DIUJI | review manusia |


## Build 17.5 combined-candidate additions
| Area | Scenario | Evidence | Status |
|---|---|---|---|
| Startup recovery | Mirror snapshot restore completes before JFT reward reconciliation | `tests-audit/startup-recovery-order.cjs` (3 checks) | Node test included; rerun required |
| Reward browser test | Waits for asynchronous IndexedDB claim/ledger commit before asserting EXP | Updated `t02-jft-reward.cjs` | Browser rerun required |
| XSS / crash / SW upgrade / backup fuzz | t11–t14 retained from Cloud candidate | Browser suites included in `npm run test:browser` | Browser rerun required on this ZIP |


## Build 17.5 execution result
- `npm test`: **75/75 passed** on the extracted combined ZIP.
- `npm run test:browser`: **not executed** in this environment (Node Playwright package unavailable; local browser-server access blocked).
- Do not transfer the Build 17.3 browser pass count to Build 17.5.
