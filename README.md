# Kotoba Card v1.4.17

Complete interface refresh release. Original Sakura Night background artwork and purple/lavender/pink/gold visual identity are preserved; navigation, panels, quiz and study layouts are refreshed. Deploy the contents of this folder to the GitHub Pages repository root. Existing local user data is retained by the current storage model; as with any update, export a backup before deployment.

<div align="center">

<img src="assets/logo.png" alt="Kotoba Card – Japanese Study" width="320">

### Belajar sedikit, maju setiap hari. 🌸
Flashcard kosakata Jepang bertema malam sakura. Ringan, offline, dan siap dibungkus jadi APK.

![HTML5](https://img.shields.io/badge/HTML5-0b1030?style=for-the-badge&logo=html5&logoColor=ffd21f)
![PWA](https://img.shields.io/badge/PWA-ready-7c3ac4?style=for-the-badge)
![Offline](https://img.shields.io/badge/Offline-didukung-ffd21f?style=for-the-badge&labelColor=0b1030)
![No Dependencies](https://img.shields.io/badge/dependencies-0-f4a6d6?style=for-the-badge&labelColor=0b1030)

<img src="assets/preview.jpg" alt="Tampilan Kotoba Card" width="260">

</div>

---

## ✨ Fitur

- 📁 **Folder kosakata**: kelompokkan kata per bab atau topik (kanji, furigana, arti).
- 🃏 **Flashcard** dengan animasi balik kartu dan jadwal ulang otomatis (spaced repetition).
- 🎮 **Kuis** pilihan ganda: *Tebak Arti* dan *Tebak Kanji*, plus mode latih ulang kata yang salah.
- 📊 **Statistik** belajar: akurasi dan waktu belajar.
- 🔤 **Pilihan font Jepang** (rounded, mincho, tulisan tangan) dan ukuran huruf.
- 💾 **Data tersimpan di perangkat** (localStorage). Tanpa akun, tanpa server.
- 📴 **Bisa offline** berkat service worker.
- 🌙 **Tema malam sakura**: kaca buram, cahaya ungu, aksen kuning, kelopak sakura jatuh.

## 🚀 Cara pakai

### Jalankan lokal
Buka `index.html` di browser. Untuk uji PWA/offline, jalankan server lokal:

```bash
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

### Pasang di GitHub Pages
1. Upload semua isi folder ini ke repo (`index.html` harus di root).
2. **Settings → Pages → Deploy from a branch → `main` / `(root)` → Save**.
3. Buka `https://USERNAME.github.io/NAMA-REPO/`.

### Jadi APK
Bungkus URL GitHub Pages-mu (atau folder ini) memakai Capacitor, Cordova, atau konverter web-to-APK. Manifest dan ikon 192/512 sudah disiapkan.

## 🗂️ Struktur

```
├── index.html              # aplikasi (HTML + CSS + JS)
├── manifest.webmanifest    # konfigurasi PWA
├── sw.js                   # service worker (cache offline)
└── assets/
    ├── header.webp         # ilustrasi banner
    ├── bg.webp             # latar pagoda & sakura
    ├── logo.png            # logo Kotoba Card
    ├── icon-192.png        # ikon aplikasi
    └── icon-512.png
```

## 🎨 Kustomisasi

| Ingin mengganti | Lakukan |
|---|---|
| Ilustrasi / latar / logo | Timpa file di `assets/` dengan nama yang sama |
| Warna tema | Ubah variabel di `:root` pada blok CSS `Kotoba Card — sakura night theme` |
| Kosakata awal | Ubah data `folders` di fungsi `load()` pada `index.html` |
| Versi cache offline | Naikkan `kotoba-v3` di `sw.js` setiap kali file berubah |

> **Catatan font:** font Jepang dimuat dari Google Fonts. Saat offline, aplikasi memakai font Jepang bawaan perangkat.

## 📝 Lisensi & kredit

Ilustrasi dan logo adalah milik pemilik proyek. Tambahkan lisensi kode (misalnya MIT) sesuai kebutuhanmu.

<div align="center">

**Satu kartu, satu langkah lebih dekat.** 🌸

</div>


## v1.4.20 — Integrasi Bunpou
- Modul belajar Bunpou terpisah dengan 73 pola, rumus, penjelasan, contoh, bacaan, dan terjemahan.
- Pencarian materi, kuis 10 soal, status penguasaan, dan review terjadwal.
- Progres Bunpou ikut ekspor/impor backup (gabung/timpa).
- Fitur Latih dan scheduler dari basis v1.4.19 tetap dipertahankan.
