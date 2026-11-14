# Laporan Audit — Kotoba Card Build 17.1 (2026-11-15.4)
Tanggal: 15 November 2026 · Sumber: Build_17.zip (SHA-256 cd30b48e41541b910c9c905592b3f24cce7591572cef4226b5b5b864d42e4bb4)
Lingkungan: Node v22.23.4, npm 10.9.9, Chromium (Playwright global 1.63, /opt/pw-browsers), tanpa jaringan (npm install tidak dijalankan; acorn & playwright dipakai lewat NODE_PATH=/opt/npm-tools/node_modules).

## A. Keputusan: **NOT READY**
Audit ini BELUM menyeluruh. Satu temuan HIGH ditemukan dan diperbaiki; sebagian besar area audit wajib (konten JFT mendalam, matriks fitur penuh, SW update dari versi lama, review kode keamanan lengkap, tes pengganti t02/t07, crash/reload reward, Restore Gabung welcome-state) belum dikerjakan. Status tertinggi yang dapat dibuktikan saat ini adalah "tidak ada temuan HIGH/CRITICAL yang diketahui di area yang diuji", bukan CODE READY.

## B. Temuan
### HIGH-1 — Three-way merge menimpa seluruh `jft` tab lain bila `jft` tidak ada di merge base
- Lokasi: `saveMerge3()` di index.html (dipakai `save()` dan event `storage`).
- Pemicu: tab B memanggil `jftState()` (membuat default `jft` kosong di memori setelah SAVE_BASE diambil), tab A menyimpan progres JFT (sesi live, progress, EXP). Lalu tab B menyimpan perubahan apa pun.
- Dampak: sesi live, progres item, EXP JFT tab A hilang dari localStorage dan dari memori kedua tab (kehilangan progres diam-diam).
- Reproduksi: `tests-jft-final/t03-storage.cjs` D1 gagal sebelum perbaikan (`stored.done=null`); skrip debug 2 tab menunjukkan `hasLive:false` di kedua tab setelah save tab B.
- Penyebab: cabang merge objek mensyaratkan `base` berupa objek; jika key tidak ada di base, `local` dikembalikan utuh.
- Perbaikan: jika base tidak ada, nilai lokal "kosong" (null/0/""/[]/{}) tidak menimpa remote; dua objek digabung dengan base `{}`.
- Tes: 2 tes regresi baru di `tests-audit/storage-safety.cjs` (gagal sebelum, lulus sesudah); D1 browser lulus sesudah.
- Catatan: heuristik "nilai kosong lokal kalah" berarti pengaturan lokal yang sengaja diubah ke 0/"" pada key yang tidak ada di base bisa kalah dari nilai remote. Risiko rendah; dicatat.

### Temuan lain (belum diperbaiki)
- MEDIUM: t02 E1 dan t07 masih usang, tanpa tes pengganti (alur reward fail-closed di browser dan kartu pribadi/SRS).
- MEDIUM: README menyebut hitungan tes yang sudah tidak cocok dengan hasil aktual; `npm test` butuh acorn (tidak ada di lingkungan tanpa `npm install`; tes AST gagal tanpanya).
- LOW: tidak ada validasi perangkat fisik iPhone/Android.

## C. File yang diubah
- index.html: `saveEmpty()` baru, `saveMerge3()`, APP_BUILD → 2026-11-15.4.
- tests-audit/storage-safety.cjs: +2 tes regresi.
- sw.js: CACHE_NAME → kotoba-v0.1.0-build17-1; version.json, package.json, README*.md, MERGE-MANIFEST.txt, tests-v29/run-checks.cjs & sw-registration.cjs: sinkron build.

## E. Hasil suite (NODE_PATH ke acorn/playwright, Chromium headless)
| Suite | Pass | Fail | Skip |
|---|---|---|---|
| Sebelum perbaikan: npm test | 47 (AST gagal: acorn tak ada) | 1 | 0 |
| Sebelum perbaikan: t03-storage | 5 | 1 (D1) | 0 |
| Sesudah: Audit unit | 14 | 0 | 0 |
| Sesudah: Storage safety | 6 | 0 | 0 |
| Sesudah: Backup state | 5 | 0 | 0 |
| Sesudah: JFT content | 3 | 0 | 0 |
| Sesudah: JFT async reward | 11 | 0 | 0 |
| Sesudah: Regresi kompatibel | 11 | 0 | 0 |
| Browser t03 / t04 / t05 / t06 / t08 / t09 / t10 | 6 / 16 / 14 / 13 / 9 / 9 / 1 | 0 | t02, t07 tidak dijalankan (usang) |
Suite berbeda tidak dijumlahkan; sebagian tes mungkin tumpang tindih.

## F. Tes usang
t02 E1 dan t07 belum diganti.

## G. Risiko tersisa dan batasan
Area wajib yang belum diaudit mendalam: konten materi JFT, aturan Mastery (selain tes yang ada), SW update dari versi lama, XSS/keamanan impor di luar tes yang ada, crash/reload reward, Restore Gabung welcome-state, perangkat fisik.


## H. Tindak lanjut Build 17.2 candidate (2026-11-15.5)
- Perbaikan: snapshot Undo sekarang menyimpan `S` dan `CORR`; `bkUndo()` memulihkan state serta menulis ulang seluruh koreksi ke IndexedDB `corrections` sebelum menghapus snapshot Undo.
- Perbaikan: Restore Gabung menetapkan `S.welcomed=1`, sehingga instalasi baru yang menerima backup tidak tertahan di onboarding.
- Tes regresi backup-state bertambah dua: snapshot Undo mencakup koreksi IndexedDB; Restore Gabung menyelesaikan welcome-state.
- Hasil `npm test` setelah patch: 52 lulus, 0 gagal.
- `npm run test:browser` dicoba tetapi gagal mulai karena modul Playwright tidak tersedia pada lingkungan saat ini. Ini bukan hasil tes browser gagal; statusnya belum dijalankan.
- Status tetap **NOT READY**. Belum ada bukti untuk audit keamanan XSS menyeluruh, validasi semua bentuk file impor, SW upgrade dari cache lama, pengujian browser crash/reload dan alur kartu pribadi/SRS, serta perangkat fisik.

## Superseded by Build 17.3
Laporan ini adalah catatan historis untuk Build 17.1/17.2. Status dan hasil terbaru ada di `AUDIT-REPORT-BUILD17-3.md`: Build 17.3 candidate, 72 tes Node lulus, backup/security/SW/content checks ditambahkan, dan t02/t07 diperbarui. Browser automation tetap belum dieksekusi karena navigasi Chromium ke localhost/file diblokir oleh kebijakan lingkungan.
