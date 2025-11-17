# File Manager — Analisis Codebase & Tech Stack

Ringkasan singkat dari analisis teknis dan struktur proyek.

## Arsitektur
- Frontend: ES6 modules (vanilla JS)
- Backend: PHP procedural (api.php + lib/)
- Komunikasi: REST JSON

## Tech Stack
- JavaScript (ES6+), HTML5, CSS3 (Tailwind via CDN — CDN-based workflow)
- PHP 7.4+ (file operations & REST API)
- No external JS dependencies; Tailwind loaded from CDN (no local build by default)

## Struktur utama
- api.php — endpoint API
- index.php — UI entry
- assets/js/modules/ — semua modul frontend (uiRenderer, apiService, fileOperations, dll.)
- lib/ — file_manager.php, logger.php
- file/ — direktori kerja untuk file yang dikelola
- logs/activity.json — penyimpanan log aktivitas

## Fitur utama
- Browse, create, rename, move, delete, upload (chunked), preview
- Virtual scrolling + pagination
- Drag & drop, context menu, keyboard accessibility
- Activity logging with filters, export, cleanup
- Optimistic UI updates and request cancellation

## Modul penting (frontend)
- assets/js/index.js — entry & inisialisasi
- assets/js/modules/apiService.js — HTTP / API
- assets/js/modules/fileOperations.js — bisnis logika file
- assets/js/modules/uiRenderer.js — DOM rendering & virtual scroll
- assets/js/modules/state.js — state management

## Backend utama (PHP)
- lib/file_manager.php — sanitasi, resolve_path, CRUD, upload chunking
- lib/logger.php — JSON logger, rotation, cleanup, filtering
- api.php — router tindakan dan validasi input

## Keamanan & Validasi
- sanitize_relative_path untuk mencegah traversal
- resolve_path membatasi akses ke root
- whitelist ekstensi untuk editor
- checks izin tulis dan pembacaan

## Performa & UX
- Virtual scroll untuk daftar besar
- Debounced rendering (~16ms)
- AbortController untuk pembatalan request
- Chunked upload (5MB) untuk file besar

## Catatan migrasi & perbaikan yang disarankan
1. Tambahkan test suite (unit/integration)
2. Pertimbangkan migrasi ke TypeScript untuk type safety
3. Tambahkan build step (bundler) untuk produksi — opsi tersedia jika ingin beralih dari CDN
4. Internationalization (i18n)
5. File thumbnails & versioning (opsional)

## Cara menggunakan README ini
Dokumen ini dihasilkan otomatis sebagai ringkasan analisis. Untuk detail implementasi, buka file terkait di repo.

## Styling workflow (current)
Project saat ini menggunakan Tailwind via CDN. Untuk pengembangan cepat dan migrasi bertahap, utilitas Tailwind tersedia langsung di runtime tanpa langkah build lokal. Ini adalah konfigurasi default proyek saat ini — tidak ada langkah build yang dijalankan pada CI atau oleh developer kecuali Anda memilih untuk mengaktifkannya kembali.

Audit dinamis & safelist
- Saya telah menjalankan audit kelas Tailwind yang dibuat secara dinamis dan menyimpan hasilnya di [`docs/tailwind-dynamic-classes-audit.md`](docs/tailwind-dynamic-classes-audit.md:1).
- Untuk meminimalkan risiko saat (jika) Anda mengaktifkan kembali build lokal, saya juga menambahkan safelist konservatif sementara di [`tailwind.config.js`](tailwind.config.js:1). Safelist ini melindungi kelas yang sering ditambahkan oleh JS (overlay, state flags, pagination, dll.).
- Rekomendasi: pertahankan workflow CDN untuk pengembangan cepat. Bila butuh build lokal (produksi/optimasi), ikuti langkah di bawah dan perbarui safelist sesuai temuan audit.

Cara re-enable build-based workflow (ringkas)
1. Tambahkan/isi `package.json` devDependencies:
   - tailwindcss, postcss, autoprefixer
   - Tambahkan script:
     - "build:css": "tailwindcss -i ./assets/css/tailwind.src.css -o ./assets/css/tailwind.css --minify"
     - "watch:css": "tailwindcss -i ./assets/css/tailwind.src.css -o ./assets/css/tailwind.css --watch"

2. Buat `assets/css/tailwind.src.css`:
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   (Opsional: tambahkan `@import "./style.css";` untuk mempertahankan aturan legacy selama migrasi.)

3. Perbarui `tailwind.config.js`:
   - Pastikan `content` mencakup semua .php dan .js yang menghasilkan markup/kelas.
   - Tambahkan safelist (salin dari [`docs/tailwind-dynamic-classes-audit.md`](docs/tailwind-dynamic-classes-audit.md:1) atau gunakan file JSON yang dihasilkan).
   - Pertimbangkan `safelistPatterns` untuk bracket/arbitrary classes (contoh: /^min-w-\[.*\]$/).

4. Build & verifikasi:
   npm install
   npm run build:css
   - Hasilnya akan berada di `assets/css/tailwind.css`.

5. Ganti pemanggilan CDN di `index.php` menjadi:
   <link rel="stylesheet" href="assets/css/tailwind.css">
   (Pastikan script CDN dihapus untuk menghindari konflik.)

6. Visual QA & cleanup:
   - Lakukan pemeriksaan visual (desktop/mobile).
   - Periksa class yang hilang (console/style) dan tambahkan ke safelist bila diperlukan.
   - Kurangi `assets/css/style.css` langkah demi langkah saat komponen selesai dimigrasi.

Quick copy/paste commands (Windows / cmd):
- Install & build:
  npm install
  npm run build:css

- Watch during development:
  npm run watch:css

Notes & best practices
- Prefer refactor kecil daripada menambahkan safelist yang sangat besar. Jika memungkinkan, ubah innerHTML templates menjadi DOM API/classList.add sehingga kelas terlihat di source.
- Untuk bracket utilities (mis. min-w-[36px]) pertimbangkan mengganti dengan utilitas kustom tersingkat atau menambahkan pola safelist spesifik.
- Simpan daftar kelas dinamis yang ditemukan sebagai JSON (mis. `docs/tailwind-safelist.json`) untuk memudahkan pemeliharaan `tailwind.config.js`.

Jika Anda ingin, saya dapat:
- Menambahkan contoh `package.json` + script build (salinan minimal) ke repo.
- Menambahkan `assets/css/tailwind.src.css` contoh.
- Men-generate `docs/tailwind-safelist.json` lengkap yang bisa langsung disalin ke `tailwind.config.js`.

Catatan: lihat juga audit lengkap di [`docs/tailwind-dynamic-classes-audit.md`](docs/tailwind-dynamic-classes-audit.md:1) untuk daftar kelas dan rekomendasi per-file.

