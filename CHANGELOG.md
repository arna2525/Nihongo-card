# Kotoba Card — Changelog

Riwayat perubahan resmi. Versi terbaru dicatat di bagian paling atas.

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
