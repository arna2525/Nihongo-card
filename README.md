# Kotoba Card v0.1.0 — Integrated JFT Learning System

Generasi 0.1 mempertahankan aplikasi Kotoba Card sebagai basis utama dan menambahkan kurikulum belajar JFT yang diadaptasi dari aset web di dalam APK Si Paling JFT yang diberikan. Kode dan UI referensi tidak ditempel mentah; mekanisme pembelajaran ditulis ulang dan diintegrasikan ke Learning area Kotoba Card.

## Isi kurikulum JFT
- **50 BAB Kotoba — 1.497 entri** dari materi referensi.
- **61 hari Kanji — 610 entri**, tepat 10 Kanji per hari.
- **73 pola Bunpou**, masing-masing memiliki struktur, arti, penjelasan, contoh Jepang, romaji, dan terjemahan Indonesia.
- **49 kata kerja**, 3 golongan, dan 13 bentuk konjugasi.

## Mekanisme belajar yang diadaptasi
- Empat arah latihan: Kanji → Hiragana, Hiragana → Kanji, Kanji → Arti, Hiragana → Arti. Item tanpa perbedaan Kanji/bacaan hanya diuji pada arah yang valid.
- Tiga putaran pengulangan per item, tiga pass yang diacak, dan larangan mengulang item baru yang sama dalam satu blok tujuh soal.
- Jawaban salah masuk antrean penguatan dan muncul kembali setelah jeda 3–4 jawaban; item salah terus diulang sampai benar.
- Jeda per tujuh soal baru, ringkasan blok, EXP, dan sesi yang dapat dilanjutkan setelah aplikasi dibuka ulang.
- Flashcard per BAB/per 10 Kanji atau seluruh kurikulum, balik kartu, arah depan yang dapat diubah, navigasi sebelumnya/berikutnya, dan acak.
- Test Ingatan mengambil materi yang sudah mencapai penguasaan dan mengacak arah pertanyaan.
- Bunpou: daftar, tutup arti untuk uji diri, detail penjelasan/contoh, dan kuis 10 soal.
- Konjugasi: tabel per kata kerja, filter golongan, filter bentuk latihan, kuis 10 soal, serta halaman aturan konjugasi.
- Target harian Kanji (default 10; pilihan 5/10/15/20), hitungan Kanji unik yang benar-benar disentuh dalam latihan, streak, kalender aktivitas, waktu belajar, EXP, dan riwayat sesi.

## Fitur Kotoba Card yang tetap ada
- Mother Folder, folder bertingkat, kategori, pencarian, CRUD kosakata, dan pengelolaan folder.
- Flashcard pribadi dengan spaced repetition dan rating Ulangi/Sulit/Bagus/Mudah.
- Quiz pribadi, lima pola pertanyaan, Mastery 3/3, adaptive weighting, Smart Review dan riwayat.
- Statistik lama, pengaturan font, ukuran teks, bold, backup/restore, dan pemulihan impor.

## Menjalankan
Ekstrak ZIP, buka terminal pada folder proyek, lalu jalankan:

```bash
python3 -m http.server 8000
```

Buka `http://localhost:8000`. Untuk Netlify/GitHub Pages, unggah seluruh isi folder ke root situs. Tidak ada API key, backend, atau proses build yang dibutuhkan.

## Data dan kompatibilitas
- LocalStorage key lama tetap `kotobaCard.v1`.
- Database tetap `SCHEMA=5`; tidak ada migrasi destruktif.
- Data kurikulum JFT tertanam lokal di `index.html`, sehingga tersedia offline setelah aplikasi ter-cache.
- Progres JFT disimpan secara terpisah pada `S.jft`, tetapi ikut dalam backup JSON. Restore Timpa mengembalikan progres JFT; Restore Gabung memakai penggabungan konservatif (nilai maksimum untuk penghitung agregat, penggabungan ID sesi dan himpunan materi) agar backup yang sama tidak dihitung dua kali. Aktivitas paralel dari dua perangkat berbeda pada tanggal yang sama tidak selalu dapat dijumlahkan sempurna karena catatan lama tidak memiliki ID unik per jawaban; gunakan Restore Timpa bila sumber backup adalah perangkat utama yang ingin dipulihkan secara persis.
- Folder, kosakata, Mastery, Smart Review, dan riwayat Kotoba Card tidak diganti oleh dataset JFT.

## Versi
- Display version: **0.1.0**
- Build: **2026-11-15.4**
- Skema data: **5**

## Menjalankan pengujian
Dengan Node.js 18+ jalankan `npm install` lalu `npm test` dari folder proyek. Suite Node mencakup Quiz/Mastery, ledger bersama, statistik, backup merge, reward EXP JFT async, service worker, dan pemeriksaan sintaks. Untuk arsip browser-reference: `npm run test:browser-reference` setelah memasang Chromium dengan `npx playwright install chromium`.

## Status pengujian
Build 17: 14 tes Quiz/Mastery + 9 tes reward async + 11 regresi kompatibel (Node, 34 lulus; tes duplikat AST butuh `npm install`) + 68 tes browser Chromium (`npm run test:browser`). Browser end-to-end dan pemasangan PWA pada iPhone/Android fisik belum dapat diverifikasi di lingkungan build ini; lakukan uji perangkat sebelum distribusi luas.


## Akurasi dan kalkulasi keberhasilan (build 2026-11-14.4)
- **Akurasi** = jawaban benar ÷ seluruh jawaban kuis × 100. Ditampilkan untuk hari ini, keseluruhan JFT, dan setiap BAB/Day.
- **Mastery** = jumlah arah latihan yang memenuhi syarat penguasaan ÷ seluruh arah yang valid × 100. Mastery tidak disamakan dengan akurasi.
- Hasil sesi Kotoba/Kanji, Test Ingatan, Bunpou, dan konjugasi ikut direkap. Jawaban salah dan benar sama-sama masuk penyebut; jawaban salah tidak dihitung sebagai benar.
- Flashcard hanya menambah durasi belajar. Membalik, berpindah, atau mengacak kartu tidak menaikkan akurasi, jumlah jawaban, maupun target Kanji harian.
- Data harian lama yang belum memiliki penghitung kuis terpisah tidak dipakai untuk membuat akurasi harian palsu; tampilan menunjukkan `—` sampai ada jawaban kuis baru. Statistik mastery dan progres lama tetap dipertahankan.
- Halaman Statistik Kotoba Card tetap menampilkan perhitungan asli Kotoba Card; bagian JFT menambahkan akurasi dan mastery JFT secara terpisah.

## Desain Statistik (build 2026-11-14.6)
- Lapisan visual dashboard Statistics dipindahkan dari file Kotoba Card v1.4.7: header, Learning Mastery, ring persentase, kartu metrik, Learning Activity, Daily Quest, Smart Review Intelligence, dan View Details.
- Filter aktivitas 7/30/90 hari/All Time mengubah rentang data yang ditampilkan.
- Desain tidak membawa mesin data dari file referensi. Seluruh angka dan status tetap dihitung dari penyimpanan Kotoba Card terintegrasi; statistik JFT tetap tampil di halaman yang sama.
- Detail analitik versi integrasi tetap tersedia pada bagian More learning analytics.


### Statistik terintegrasi build 2026-11-14.7
Desain dashboard mengikuti Statistics Redesign v1.4.7. Grafik aktivitas, waktu belajar, dan streak menggabungkan log Kotoba Card serta JFT. Bagian More learning analytics memuat rincian JFT termasuk progres 50 BAB, 61 hari Kanji, mastery, akurasi, EXP, aktivitas harian, dan riwayat sesi. Aturan mastery dan penyimpanan kedua sistem tetap terpisah agar metrik yang berbeda tidak tercampur.


### Statistik terpadu build 2026-11-14.8
Dashboard Statistics memakai desain asli v1.4.7 dengan satu lapisan analitik gabungan Kotoba Card + JFT:
- Mastery gabungan dihitung dari seluruh arah belajar valid yang dikuasai ÷ seluruh arah valid dari kedua sistem.
- Akurasi gabungan memakai jawaban kuis Kotoba Card dan seluruh jawaban JFT (latihan materi + assessment). Rating flashcard bukan jawaban benar/salah dan tidak masuk rumus akurasi.
- Smart Review menyatukan status Kotoba Card dengan status arah JFT: mastered, belum dicoba, atau perlu penguatan.
- Daily Quest menggabungkan sesi Mastery/Unit dan Assessment JFT dengan sesi Kotoba Card yang sesuai.
- Grafik aktivitas, waktu belajar, streak, jumlah sesi, dan durasi rata-rata menggabungkan sumber keduanya.
- Rincian sumber tetap bisa dibuka: folder Kotoba Card, 50 BAB Kotoba, 61 hari Kanji, Bunpou, konjugasi, Test Ingatan, dan riwayat sesi.

Tes: `node tests/run-checks.cjs` menjalankan pemeriksaan kurikulum, aturan belajar, rumus, kompatibilitas backup, dan render runtime statistik terpadu.


### Shared learning ledger build 2026-11-14.13
Kotoba Card dan JFT kini menulis/membaca progres item dan arah latihan yang cocok melalui ledger kanonik bersama. Statistik menggunakan identitas unik Kotoba (Jepang + bacaan) dan Kanji (karakter + bacaan), bukan menjumlahkan dua katalog mentah. Backup/restore membawa ledger ini. Restore Gabung menggunakan nilai maksimum untuk mencegah penghitungan ulang backup yang sama. Ini adalah sinkronisasi di dalam satu penyimpanan aplikasi, bukan cloud sync otomatis antarperangkat.

**Penting sebelum deploy:** jalankan `npm test` untuk pemeriksaan Node. Uji pemasangan, navigasi, penyimpanan, offline cache, dan pemulihan data pada Safari iPhone/Android fisik tetap harus dilakukan sebelum menyatakan rilis final.

## Recovery V30 validation workspace

Install the test dependencies and run the compatible Build 15 Node regression suite:

```bash
npm install
npm test
```

The historical V28/V29 and V12–V17 experiments are retained for reference. Tests written for superseded synchronous reward APIs are excluded from the active runner; Build 15 async reward behavior has its own IndexedDB-mocked Node tests. Archived browser-reference checks are separate with `npm run test:browser-reference`.

This recovery workspace does not represent a deployment or production release. Real-device Safari/iOS, Android WebView, PWA installation/offline relaunch, true multi-tab IndexedDB contention, and crash/reload recovery still require additional validation.


## Build 14 — JFT reward transaction hardening

- Status klaim hadiah IndexedDB dibedakan: `CLAIMED`, `EXISTS`, `UNAVAILABLE`, dan `FAILED`.
- Klaim yang sudah ada di IndexedDB direkonsiliasi ke ledger lokal agar EXP tidak hilang setelah gangguan saat penyimpanan.
- Kegagalan transaksi tidak lagi dianggap sebagai klaim yang sudah selesai.
- Blok sesi JFT yang gagal menyimpan EXP tetap dipertahankan dan dapat dicoba ulang sebelum sesi dilanjutkan atau diakhiri.
- Pengujian regresi reward dilakukan terpisah di workspace audit; tidak disertakan dalam paket web.


## Build 15 — audit and corrections (2026-11-15)

Audit fixes in this build:
- Quiz length selector now cycles 25 → 50 → 100 → Mastery → 25.
- Random quiz has its own consecutive-correct Mastery counter while still recording the actual question direction.
- Mastery sessions select at most seven Kotoba; missed items are persisted and prioritized in the next Mastery session so the session cap is preserved.
- Reaching 3/3 through a normal Quiz also initializes Smart Review.
- Quiz result accuracy now uses all submitted answers, matching the displayed answer denominator and saved session accuracy.
- Quiz session duration is measured from the actual session start, including continuation sessions.
- Shared-ledger backup merge now preserves per-source correct-answer counters.

Run the Node regression suite with `npm test` after `npm install`. The archived browser-reference tests are separate: `npm run test:browser-reference` and require Playwright plus its Chromium browser (`npx playwright install chromium`). Older V12–V17 reward experiments remain in the archive as historical references; they target superseded synchronous reward APIs and are not part of the active Build 15 regression runner.

Browser-level and physical-device verification still needs to be performed in a normal browser environment, especially iPhone Safari/PWA, Android Chrome/PWA, offline relaunch, and real IndexedDB transaction contention.


## Audit Build 17.3 candidate (2026-11-15.6)
- Restore Undo menyimpan snapshot data utama dan koreksi kamus IndexedDB; Undo menulis ulang koreksi ke object store `corrections` sebelum menghapus snapshot.
- Restore Gabung menandai instalasi sebagai sudah melewati welcome-state.
- Validasi backup membatasi payload hingga 20 MB, membatasi panjang field kosakata, dan membatasi koreksi impor hingga 10.000 baris.
- Audit XSS/import menambahkan tes untuk teks HTML berbahaya, ID yang mencoba memecah atribut inline, dan semua titik `innerHTML`.
- Tes Service Worker mensimulasikan install gagal, upgrade sukses, penghapusan cache lama milik Kotoba saja, dan `clients.claim()`.
- t02 diperbarui agar sesuai dengan kebijakan fail-closed: bila IndexedDB tidak tersedia, EXP tidak diberikan dan chunk dipertahankan untuk dicoba ulang.
- t07 diganti dengan alur flashcard Kotoba JFT yang sekarang dipakai; `jftFlashExit()` kini membersihkan sesi flashcard di memori.
- Audit struktur materi JFT memeriksa 1.497 Kotoba, 610 Kanji, 73 pola Bunpou beserta 73 penjelasan, 49 kata kerja dan 13 kategori konjugasi. Duplikasi Kotoba yang ditemukan tersebar antar-bab, bukan duplikasi dalam bab yang sama.
- Hasil `npm test`: 72 lulus, 0 gagal.
- Status belum RELEASE READY: eksekusi browser nyata diblokir oleh kebijakan lingkungan ini meskipun Chromium tersedia. Pengujian browser t02–t10 harus dijalankan pada CI/mesin lokal yang mengizinkan akses ke localhost/file. Pengujian fisik iPhone Safari dan Android Chrome/PWA tetap menjadi gerbang manual.


## Build 17.5 combined candidate
This archive combines the expanded Cloud Build 17.3 audit/browser suite with the Build 17.4 startup mirror/reward recovery ordering fix. Run `npm test` and `npm run test:browser` against this exact extracted archive; earlier Build 17.3 browser counts are not a substitute for rerunning this candidate.
