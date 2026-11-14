# AUDIT REPORT — KOTOBA CARD BUILD 17
Tanggal: 15 November 2026

## Status
**MERGED AUDIT BUILD — belum dinyatakan RELEASE READY.**
Build 17 menggabungkan basis kode Build 15.9 dan perbaikan terpilih Build 16 milik Claude. Tidak ada publikasi/deploy yang dilakukan.

## Sumber
- Build 15.9: `Kotoba-Card-GABUNGAN-V30-Build15.9-AUDIT(2).zip`
- Build 16: `Kotoba-Card-GABUNGAN-V30-Build16.zip`
- SHA-256 Build 15.9: `4bc3d577b507aeb6e3567005ae2b2a90b17d1f1723ad9b904e0e45ca37f78188`
- SHA-256 Build 16: `e313f06399e623ff7b9819a59e296c2feec152f0253ae7724442e779da35d181`

## Strategi penggabungan
Basis `index.html` berasal dari Build 15.9 karena mempertahankan:
- Reward generation pada klaim/reconcile IndexedDB, termasuk penolakan transaksi stale setelah Restore Timpa.
- Three-way merge saat save dan sinkronisasi antartab yang menggabungkan perubahan lokal/remote.
- `qScope` dan `masteryQueue` dalam Restore Timpa.
- Validasi backup dan proteksi prototype pollution yang sudah diuji oleh tes tambahan Build 15.9.

Perbaikan Build 16 yang diterapkan:
- `saveFail()` dengan peringatan penyimpanan yang dibatasi satu kali per 10 detik.
- Restore Timpa mempertahankan `welcomed: 1`.
- Tes browser Build 16 yang sudah diperbarui dan dokumentasi/`.gitignore`.
- Versi metadata dan cache Service Worker dinaikkan konsisten ke Build 17.

## Perbedaan yang sengaja TIDAK diambil dari Build 16
Build 16 menghapus guard `JFT_REWARD_RECONCILE_EPOCH`/`rewardGeneration` dari `jftClaimReward`, `jftReconcileFromIdb`, dan `jftAwardChunkAsync`, serta menghapus beberapa field restore (`qScope`, `masteryQueue`, dan pengaturan statistik). Perubahan tersebut tidak diambil karena berisiko menghilangkan perlindungan transaksi stale dan state Mastery/quiz saat restore.

Build 16 juga mengganti three-way save merge Build 15.9 dengan penulisan langsung `localStorage.setItem(KEY, JSON.stringify(S))`; perubahan ini tidak diambil karena dapat meningkatkan risiko tab stale menimpa state terbaru.

## Hasil tes yang dijalankan
- `npm test`: **48 lulus, 0 gagal**.
  - Quiz/Mastery: 14/14
  - Storage/multi-tab/quota: 4/4
  - Backup state: 5/5
  - JFT content/conjugation: 3/3
  - JFT async reward/recovery: 11/11
  - Compatible regression: 11/11
- JavaScript inline syntax: lulus (termasuk dalam audit unit).
- `npm run test:browser`: **belum berjalan**, karena modul Playwright tidak tersedia di lingkungan ini (`Cannot find module 'playwright'`).
- Pemeriksaan browser fisik iPhone/Android: belum dilakukan.

## Catatan dan batasan
- Tes browser `t02` dan `t07` tetap ditandai usang/tidak dijalankan sesuai catatan Claude; belum diganti dengan tes baru.
- Crash/reload di tengah transaksi reward belum dibuktikan oleh browser test yang berjalan.
- Restore mode Gabung belum memiliki tes eksplisit untuk welcome-state.
- Belum ada verifikasi fisik iPhone Safari/Android Chrome.
- Karena itu Build 17 adalah hasil penggabungan dan audit kode otomatis, **bukan klaim RELEASE READY**.

## Keputusan
**Belum layak disebut RELEASE READY.** Secara audit kode yang berjalan, 48/48 tes lulus; namun rangkaian browser belum dapat dijalankan karena Playwright tidak tersedia. Jalankan `npm install` lalu `npm run test:browser` pada mesin pengujian yang memiliki Chromium/Playwright sebelum keputusan final deploy.
