## v1.4.20 — Integrasi Bunpou ke basis v1.4.19 Latih
- Mempertahankan seluruh fitur Latih dan scheduler pada v1.4.19.
- Menambahkan tab Belajar Bunpou berisi 73 pola dari referensi APK, lengkap dengan rumus, penjelasan, contoh, bacaan, dan terjemahan.
- Menambahkan pencarian, kuis 10 soal, tracking penguasaan, dan review terjadwal.
- Menambahkan progres Bunpou ke backup/restore gabung dan timpa.

# v1.4.19 — Tab Latih (2026-11-14)
- New 5th tab "Latih": Sesi Fokus (7 cards x 3 repetitions, wrong answers return 4 cards later, rest screen), Verb conjugation trainer (49 verbs, groups 1/2/3, 12 forms), Bunpou quiz (73 patterns from the existing catalog, pattern <-> meaning), streak, month calendar, daily time estimate, XP.
- Sesi Fokus grades each card's first attempt through the unified scheduler (Good/Again) and feeds Mastery performance.
- Verb data and conjugation rules adapted from the Hafalan JFT A2 app.
- XP is stored in `S.xp` (not yet included in restore-replace). Export a backup before deploying.

# v1.4.18 — Unified scheduler (Anki-style) (2026-11-14)
- Flashcard and Smart Review now share one scheduler: New → Learning (1m, 10m) → Review → Relearning (10m).
- Four grades (Again/Hard/Good/Easy) with ease factor (start 2.5, min 1.3), overdue bonus, small interval fuzz, 365-day cap.
- Quiz answers map to Again (wrong) / Good (correct). Cards lapsed 8 times are flagged `leech`.
- Old fixed ladder 1/3/7/14/30/60/90 and old `sr()` are replaced; existing records are migrated once (`S.schV=1`), completed cards re-enter review at 90 days.
- Flashcard state is stored in `S.review["fc:"+id].card` (included in backup/restore); `w.ivl/w.ease/w.due` are still mirrored.
- Not yet included: daily new-card limits, Kanji/Bunpou Daily Learning, retention stats. Export a backup before deploying.

# v1.4.16 — Study-first visual refresh (2026-11-14)
- Refined the interface into a calmer navy/cyan study-first visual system.
- Improved contrast, card surfaces, answer options, navigation, and responsive spacing.
- Preserved the existing navigation routes, content catalog, local storage keys, IndexedDB database, backup/restore, Quiz, Mastery, and review scheduling logic.
- Synchronized APP_VERSION, version.json, and Service Worker cache version.
- This release is a visual and consistency update; it does not claim completion of the requested Kanji/Bunpou Daily Learning and full adaptive engine integration.

# v1.4.12 — JFT A2 Full Learning Catalog

## v1.4.15 — Mastery consistency patch (2026-11-14)
- Mastery sessions now select up to 10 pending Kotoba (previously 7 in the active implementation).
- A wrong answer resets the affected Kotoba's consecutive 3/3 Mastery counter for that mode.
- No catalog IDs, user vocabulary, answer history, performance records, or existing SRS due dates are rewritten by this patch.
- Full Kanji/Bunpou and Daily Learning integration is not yet included.

- Added 1,497 JFT A2 Kotoba organized across BAB 1–50.
- Added 610 Kanji organized into daily groups of 10.
- Added 73 Bunpou patterns with explanations and example sentences.
- Catalog is added once as a separate root; existing user folders, progress, SRS, and stored data are not overwritten.
- Updated app version, version.json, and service-worker cache together.

# v1.4.10 — 2026-11-14
- Enlarged Japanese vocabulary and Kanji on Learn and Quiz cards for clear reading on iPhone.
- Kept existing card dimensions, answer options, Learning Engine, SRS, storage, and saved progress unchanged.
- Updated APP_VERSION, version.json, and service-worker cache name together.

## 1.4.9 — 2026-11-14
- Rebuilt the Statistics tab to match the supplied Kotoba Card glass/neon reference.
- Added dedicated mastery overview, four KPI cards, 7-day activity chart, Daily Quest summary, and Smart Review summary.
- Preserved the existing analytics, mastery modes, activity ranges, session history, Learning Engine, SRS, and saved data.
- Updated APP_VERSION, version.json, and service-worker cache to 1.4.9.

## v1.4.8
- Fixed in-app APP_VERSION reporting to match version.json and service worker cache.

# v1.4.7 — Statistics visual refinement
- Compact Gen Z-inspired visual hierarchy; no statistics or learning features removed.
- Glass panels use approximately 90% opacity with subtle blur.
- Existing bottom navigation and learning logic are unchanged.


## v1.4.6 — Ambitious Daily Quest
- Hero progress ring now represents Daily Quest completion, separate from overall vocabulary Mastery.
- Added three challenging daily missions: Mastery Run (10 questions), Review Protocol (5 questions), and Knowledge Test (15 questions), each requiring at least 80% accuracy.
- Progress is derived from completed, persisted study sessions for the device's local day; partial sessions do not count.
- Smart Review mission is excluded when no review is due, so learners are not penalized for having nothing due.
- Daily Quest is read-only and does not modify Learning Engine, Mastery thresholds, reinforcement behavior, or spaced-repetition intervals.
- Updated app and service-worker version to 1.4.6.
## v1.4.5 — KOTOBA CARD Soft Glass Compact Statistics (2026-11-14)

- Menyetel permukaan hero, KPI, panel, dan kartu menjadi semi-transparan dengan blur lembut; bentuk kartu, kontras, dan batas tetap jelas.
- Transparansi memakai token tema asli (`--card`, `--bg`, `--line`, `--gold`) sehingga warna tetap mengikuti tema Kotoba Card.
- Memadatkan lagi jarak vertikal, padding, hero, dan panel agar halaman Statistik tidak terasa terlalu panjang.
- Mempertahankan bagian analitik lanjutan dalam panel expandable agar ringkasan utama tetap ringkas.
- Tidak mengubah Learning Engine, struktur data, jadwal review, atau fitur halaman lain.
- Memperbarui cache Service Worker ke `kotoba-v1.4.5`.
- Pemeriksaan sintaks JavaScript, JSON, dan integritas ZIP dilakukan; pengujian browser/perangkat nyata belum dilakukan.

## v1.4.2 — KOTOBA CARD Compact Statistics (2026-11-14)

- Mengganti branding header Statistik menjadi KOTOBA CARD; istilah NEXUS dihapus dari identitas UI.
- Membuat layout Statistik lebih compact: hero, mastery ring, metrik, kartu KPI, panel, dan jarak antar-section dipadatkan untuk layar ponsel.
- Menghapus background mandiri pada wrapper Statistik agar background asli Kotoba Card tetap terlihat dan halaman menyatu dengan aplikasi.
- Mempertahankan aksen futuristik melalui indikator cyan, progress ring, border glow halus, panel kaca, dan visual analytics tanpa menambah animasi berat.
- Tidak mengubah perhitungan statistik maupun Learning Engine.
- Memperbarui cache Service Worker ke `kotoba-v1.4.2`.

## v1.4.1 — KOTOBA NEXUS Cyber Statistics (2026-11-14)

- Redesigned halaman Statistik menjadi dashboard KOTOBA NEXUS dengan visual Cyber Neon, deep-space surfaces, cyan/purple lighting, dan hierarchy command-center.
- Menambahkan hero mastery, executive overview, Mastery Quest per BAB, distribusi Smart Review, Learning Performance, analytics, timeline sesi, dan insight berbasis aturan.
- Menambahkan filter aktivitas 7/30/90 hari dan All Time; grafik memakai data aktivitas harian serta sesi yang benar-benar tersimpan.
- Metrik Quiz dan Flashcard dihitung dari penghitung jawaban aktual; status Smart Review dihitung dari rekaman jadwal per Kotoba/mode dan tetap dipisahkan dari Mastery.
- Menambahkan layout mobile-first, responsive tablet/desktop, empty states, dan dukungan prefers-reduced-motion. CSS seluruhnya dibatasi pada `.nx-shell` / komponen NEXUS di halaman Statistik.
- Memperbarui cache Service Worker ke `kotoba-v1.4.1`; strategi cache dan aturan jaringan tetap dipertahankan.
- Mempertahankan struktur data, Learning Engine, Mastery, Smart Review, Reinforcement, jadwal 1/3/7/14/30/60/90 hari, backup/restore, serta halaman dan fitur aplikasi lainnya.

Catatan pengujian: pemeriksaan sintaks JavaScript, validasi JSON, dan integritas ZIP dilakukan. Pengujian interaksi browser/perangkat fisik, console runtime, visual lintas ukuran layar, serta alur backup/restore pada data pengguna nyata belum dilakukan di lingkungan ini.

---

## v1.3.0

- Menambahkan pilihan kuis MASTERY di samping 25/50/100 dengan maksimal 7 soal per sesi.
- Menyimpan progres 0–3 secara terpisah untuk setiap kotoba dan masing-masing dari lima mode Quiz; jawaban salah tidak mengurangi progres.
- Kotoba yang belum Mastery tetap masuk antrean sesi berikutnya; kotoba yang mencapai 3/3 dikeluarkan dari antrean mode tersebut.
- Mengubah Statistik mengikuti referensi: ringkasan keseluruhan, progres lima mode, daftar BAB yang dapat digulir, dan detail/riwayat sesi.
- Memisahkan penghitungan Mastery dari akurasi jawaban dan menyimpan durasi serta riwayat sesi.
- Memperbarui Flashcard Belajar: depan menampilkan Kanji (atau kana jika tidak ada Kanji); belakang hanya menampilkan kana yang berbeda dari depan dan arti. CSS dibatasi pada Flashcard Belajar, bukan Flashcard Quiz.
- Memperluas backup JSON untuk membawa progres Mastery dan riwayat sesi; backup lama yang belum memiliki data tersebut dimuat dengan progres Mastery awal 0/3.
- Mempertahankan data dan fitur lama; menaikkan skema data ke 4 dan versi aplikasi ke 1.3.0.

Catatan pengujian: pemeriksaan sintaks JavaScript dan validasi struktur ZIP dilakukan. Pengujian interaksi browser/perangkat, alur restore pada data nyata, dan uji visual lintas perangkat belum dapat dilakukan di lingkungan ini.

---

# Kotoba Card — Changelog

Riwayat perubahan resmi. Versi terbaru dicatat di bagian paling atas.

## v1.2.22

- Menggabungkan perapian jarak panel pengaturan Quiz dari v1.2.21 dengan perbaikan Flip Card Belajar.
- Membatasi ukuran teks Kanji/Hiragana dan arti pada Flip Card agar menyesuaikan lebar layar, membungkus teks panjang, dan tidak meluber menutupi tombol penilaian.
- Membatasi perubahan CSS pada Flip Card halaman Belajar; alur flip, penilaian Ulangi/Sulit/Bagus/Mudah, data kosakata, dan sistem Quiz tidak diubah.

Catatan pengujian: pemeriksaan sintaks dan integritas arsip dilakukan; pengujian visual langsung pada iPhone/Android tetap diperlukan.

---

## v1.2.21

- Mempersempit jarak vertikal pada panel pengaturan Quiz: jarak antar-mode, deskripsi mode, panel pengaturan jumlah/cakupan, informasi jumlah soal, dan tombol Mulai Kuis.
- Mengurangi padding tombol dan panel sedikit agar tampilan lebih padat tanpa mengubah susunan, fungsi, atau gaya visual utama.

Catatan pengujian: perubahan CSS dibatasi pada panel pengaturan Quiz; pemeriksaan visual pada perangkat fisik tetap diperlukan.

---

## v1.2.20

- Merapikan pilihan lima mode Quiz menjadi susunan dua kolom untuk empat mode utama dan satu baris penuh untuk Acak Semua Cara agar lebih seimbang di layar ponsel.
- Menegaskan warna aksen kuning pada teks Jepang di sisi belakang Flip Card Quiz; arti bahasa Indonesia tetap memakai warna teks sekunder agar mudah dibedakan.

Catatan pengujian: perubahan sumber dan struktur diperiksa; uji visual/interaksi pada perangkat fisik tetap diperlukan.

---

## v1.2.19

- Menambahkan lima mode Quiz: Kanji → Hiragana, Hiragana → Kanji, Kanji → Arti, Hiragana → Arti, dan Acak Semua Cara.
- Pilihan mode aktif menggunakan highlight kuning mengikuti identitas visual Kotoba Card.
- Sumber pertanyaan, jawaban, dan pengecoh mengikuti pola mode; mode yang memerlukan Kanji hanya memakai kotoba yang memiliki Kanji.
- Mode Acak Semua Cara memilih pola valid per kotoba tanpa mengubah jumlah soal dan alur sesi Quiz lama.
- Flip Card mengikuti mode Quiz yang dipilih; mode acak menggunakan pola stabil per kartu.
- Mesin penilaian, feedback, progress, pengacakan kotoba, pembagian sesi, serta penyimpanan lama dipertahankan.

Catatan pengujian: pemeriksaan sintaks JavaScript dan integritas ZIP dilakukan. Pengujian interaksi pada perangkat Android Chrome dan iPhone Safari tetap diperlukan.

---

## v1.2.18

- Perbaikan khusus Android Chrome: seluruh isi menu Edit, termasuk area tengah accordion, secara eksplisit meneruskan gesture vertikal ke scroll utama.
- Mengatasi aturan `overflow:hidden` yang masih diwarisi `.settings-page` dari `.pg` pada versi sebelumnya.
- Menonaktifkan efek `backdrop-filter` hanya pada accordion menu Edit di Android untuk mengurangi potensi konflik hit-testing/layer sentuhan.
- Kontrol input, textarea, dan select tetap mempertahankan interaksi sentuhnya.
- iPhone/Safari dan desktop tidak terkena override ini.
- Cache service worker dinaikkan ke `kotoba-v1.2.18` agar file lama tidak tertahan cache.

Catatan pengujian: pemeriksaan sintaks JavaScript dan integritas ZIP dilakukan. Pengujian scroll langsung pada perangkat Android tetap diperlukan.

---

## v1.2.17


- Optimasi scroll Android Chrome dengan mengutamakan native scrolling browser.
- Menghapus fallback touchmove manual yang memanggil preventDefault pada setiap gerakan dan mengubah scrollTop lewat JavaScript.
- Menghapus animasi inertia JavaScript tambahan yang berjalan setelah gesture.
- Mempertahankan aturan CSS scroll Android pada #m dan panel Edit dari v1.2.16.
- Tidak mengubah fitur, desain, animasi aplikasi, navigasi, data, penyimpanan, atau sistem kuis.
- iPhone/Safari tidak terkena perubahan JavaScript ini karena fallback sebelumnya hanya aktif pada Android Chrome.

Catatan pengujian: pemeriksaan sintaks dan integritas ZIP dilakukan. Pengujian sentuhan langsung pada perangkat Android/iPhone tetap diperlukan.

---

## v1.2.16

- Tambahkan fallback gesture scroll khusus Android Chrome pada halaman Edit.
- Usapan vertikal di area kosong/tengah panel Edit diarahkan ke area scroll utama; daftar .vscroll tetap memakai scroll internal bila memang dapat digulir.
- Kontrol input, select, textarea, dan tombol tetap memakai interaksi aslinya.
- Tidak menambah layer visual dan tidak mengubah fitur, data, desain, navigasi, atau sistem kuis.
- Perlu uji langsung pada perangkat Android Chrome untuk memastikan perilaku sentuh.

---

## v1.2.15

- Perbaikan terarah Android Chrome: panel accordion Edit yang terbuka tidak lagi memotong area gesture scroll.
- Panel tertutup tetap menggunakan clipping dan animasi asli.
- Tidak mengubah fitur, data, desain, navigasi, atau sistem kuis.

---

## v1.2.14


Perbaikan:
- Memperbaiki konflik touch-action:none pada elemen turunan .vscroll yang dapat memblokir gesture scroll di Android Chrome.
- Accordion pada menu Edit (Kotoba, Tampilan Teks, Backup & Data, Pengaturan Lainnya, dan About) kini secara eksplisit meneruskan gesture vertikal.
- Mempertahankan scroll halaman utama sebagai satu area scroll pada Android Chrome.
- Tidak mengubah fitur, isi, desain, maupun data aplikasi.
- Service worker cache dinaikkan ke kotoba-v1.2.14 agar perubahan tidak tertahan cache lama.

Pemeriksaan:
- Perlu diuji langsung pada perangkat Android Chrome untuk memastikan perilaku sentuh.
- Belum dilakukan uji perangkat fisik; iPhone tidak diubah secara khusus.

---


## v1.3.1 — Statistik Hybrid
- Penyegaran visual khusus halaman Statistik: ringkasan lebih ringkas, progres BAB mudah dipindai, dan detail ditampilkan saat BAB dipilih.
- Detail BAB menampilkan progres lima mode, progres per Kotoba, serta riwayat sesi terbaru.
- Tidak mengubah fungsi atau tampilan halaman selain Statistik.


## v1.4.0 — Learning Engine (2026-11-13)

- Menambahkan Smart Review lintas BAB dengan jadwal per Kotoba dan per mode: 1, 3, 7, 14, 30, 60, dan 90 hari.
- Mastery 3/3 otomatis menjadwalkan Review pertama setelah 1 hari.
- Jawaban salah masuk Reinforcement: coba lagi setelah 10 menit; jika belum berhasil, lanjutkan penguatan harian.
- Review yang jatuh tempo diprioritaskan sebelum Mastery Quest saat pengguna memulai Quest.
- Sesi Review dibatasi maksimal 7 Kotoba, dapat dilanjutkan dalam sesi berikutnya, dan tidak mengulang Kotoba yang sama dua kali dalam satu sesi.
- Siklus Review berakhir pada Long-Term Mastered setelah berhasil menyelesaikan interval 90 hari; latihan acak tetap dapat menguji Kotoba tersebut.
- Statistik menampilkan status Review terpisah dari progres Mastery dan riwayat sesi memberi label Smart Review.
- Data jadwal Review ikut disimpan dalam backup JSON dan dipulihkan saat impor (gabung maupun timpa).
- Migrasi mempertahankan data lama dan menyiapkan jadwal Review untuk Kotoba yang sudah Mastery 3/3.
- Fitur dan tampilan lain dipertahankan; perubahan utama ada pada alur Quiz/Mastery, scheduler, penyimpanan, dan Statistik.

## v1.4.3 — Theme-synced Statistics
- Statistics colors now inherit Kotoba Card theme variables (`--bg`, `--card`, `--line`, `--tx`, `--mu`, `--gold`, `--pink`, and `--ok`) instead of forcing a separate cyber-neon palette.
- Statistics hero and panels use the existing app surfaces and transparent page background, allowing the original Kotoba Card background artwork to remain visible.
- Kept the compact layout, progress rings, charts, indicators, and subtle futuristic effects using the app accent colors.
- Removed the remaining NEXUS product branding from the Statistics footer; product branding is KOTOBA CARD.
- No Learning Engine, mastery, review scheduling, session data, or persistence logic changed.


## v1.4.4 — Compact Statistics
- Reduced Statistics hero, KPI cards, panels, and vertical spacing.
- Kept the Statistics surface transparent so the Kotoba Card app background remains visible.
- Moved detailed performance charts, timeline, and learning insights into a collapsed-by-default “More learning analytics” section.
- Preserved access to all analytics and retained the existing Learning Engine and stored data logic.


## v1.4.17 — Complete UI refresh (2026-11-14)
- Reworked visual hierarchy, navigation, panels, quiz options, study card and responsive spacing.
- Restored and preserved the original Sakura Night background artwork and original purple/lavender/pink/gold palette.
- Kept the existing data schema and learning logic unchanged in this visual release.
