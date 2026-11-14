# Status tes browser

- t02 E1 telah diperbarui: IndexedDB yang tidak tersedia harus gagal-aman, tidak memberi EXP, dan mempertahankan chunk agar dapat dicoba ulang.
- t07 telah diganti dari skenario SRS kartu pribadi versi lama menjadi pengujian UI flashcard Kotoba JFT yang sekarang aktif.
- Kedua skrip sekarang termasuk dalam `npm run test:browser` dan `npm run test:browser-reference`.
- Harness sudah diperbarui, tetapi eksekusi browser pada lingkungan audit ini diblokir oleh kebijakan browser (`ERR_BLOCKED_BY_ADMINISTRATOR` saat navigasi ke localhost). Jalankan pada CI/mesin lokal tanpa pembatasan tersebut sebelum deploy.
