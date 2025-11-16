# File Manager — Analisis Codebase & Tech Stack

Ringkasan singkat dari analisis teknis dan struktur proyek.

## Arsitektur
- Frontend: ES6 modules (vanilla JS)
- Backend: PHP procedural (api.php + lib/)
- Komunikasi: REST JSON

## Tech Stack
- JavaScript (ES6+), HTML5, CSS3 (Tailwind CDN sedang migrasi)
- PHP 7.4+ (file operations & REST API)
- No external JS dependencies; Tailwind via CDN

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
3. Tambahkan build step (bundler) untuk produksi
4. Internationalization (i18n)
5. File thumbnails & versioning (opsional)

## Cara menggunakan README ini
Dokumen ini dihasilkan otomatis sebagai ringkasan analisis. Untuk detail implementasi, buka file terkait di repo.

