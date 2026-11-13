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
