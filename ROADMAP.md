# Roadmap — Filemanager

> **Created**: 28 April 2026
> **Last Updated**: 29 April 2026
> **Status**: Approved — Phase 1-3 & 5 Complete

---

## Status Legend

| Icon | Status |
|------|--------|
| `[ ]` | Planned |
| `[~]` | In Progress |
| `[x]` | Completed |
| `[-]` | Cancelled / Rejected |

---

## Phase 1 — Quick Wins (Low Effort, High Impact)

> Estimasi: 1-3 hari per item. Bisa dikerjakan tanpa perubahan arsitektur.

### 1.1 Context Menu: Cut, Copy, Paste
- **Status**: `[x]`
- **Effort**: Low-Medium (1-2 hari)
- **Impact**: High
- **Description**: Tambahkan opsi **Cut**, **Copy**, dan **Paste** di context menu (klik kanan). Tidak perlu module clipboard terpisah — gunakan context menu dan state management yang sudah ada. Visual indicator untuk item yang di-cut (dimmed/striped). Keyboard shortcut `Ctrl+C` / `Ctrl+X` / `Ctrl+V` sebagai bonus.
- **Why**: Operasi paling dasar yang diharapkan user di file manager. Saat ini hanya bisa move via overlay.
- **Files**: Update context menu handler, `batchOperations.js`, `keyboardShortcuts.js`, `tables.css` (cut indicator style)

### 1.2 File/Folder Properties Panel
- **Status**: `[x]`
- **Effort**: Low (< 1 hari)
- **Impact**: Medium
- **Description**: Modal seperti "Properties" di Windows Explorer. Muncul saat klik kanan file/folder lalu pilih "Properties". Menampilkan:
  - Nama file, ukuran, tipe (MIME type)
  - Tanggal dibuat & terakhir dimodifikasi
  - Path lengkap
  - Permissions (read/write)
  - Quick actions (rename, move, delete, download)
- **Why**: CSS overlay `details.css` sudah ada tapi belum diimplementasi penuh. Fitur standar file manager.
- **Files**: `overlays/details.css` (update), `modules/ui/detailsRenderer.js` (baru)

### 1.3 Folder Size Calculator
- **Status**: `[x]`
- **Effort**: Low (< 1 hari)
- **Impact**: Medium
- **Description**: Hitung ukuran folder secara rekursif. Tampilkan di **Properties Panel** (1.2). Bisa juga diakses via context menu "Calculate Size".
- **Why**: Fitur standar file manager. Berguna untuk manajemen storage.
- **Dependencies**: Properties Panel (1.2) — ditampilkan di sana
- **Files**: Backend endpoint baru di `FileHandler.php`, frontend di properties panel

### 1.4 Loading Skeleton UI
- **Status**: `[x]`
- **Effort**: Low (< 1 hari)
- **Impact**: Medium
- **Description**: Ganti spinner dengan skeleton placeholder saat loading directory. Perceived performance lebih baik.
- **Why**: UX modern. Skeleton memberikan kesan loading lebih cepat dibanding spinner.
- **Files**: `components/loader.css` (update), `uiRenderer.js` (update)

---

## Phase 2 — Core Features (Medium Effort, High Impact)

> Estimasi: 3-7 hari per item. Fitur-fitur yang secara signifikan meningkatkan kapabilitas.

### 2.1 Rich File Preview System
- **Status**: `[x]`
- **Effort**: Medium (3-5 hari)
- **Impact**: Very High
- **Description**: Preview untuk berbagai tipe file:
  - **Image**: Lightbox dengan zoom/pan (jpg, png, gif, svg, webp)
  - **PDF**: Embedded viewer atau pdf.js
  - **Audio/Video**: HTML5 `<audio>` / `<video>` player
  - **Markdown**: Rendered preview (selain raw edit di CodeMirror)
- **Why**: Fitur paling diharapkan di file manager. Saat ini hanya bisa edit text files via CodeMirror.
- **Dependencies**: Tidak ada dependency eksternal wajib (HTML5 native cukup)
- **Files**: `modules/previewManager.js` (baru), `overlays/preview.css` (update), backend endpoint `raw` sudah ada

### 2.2 File Thumbnails
- **Status**: `[x]`
- **Effort**: Medium (3-5 hari)
- **Impact**: High
- **Description**: Generate dan cache thumbnail untuk image files. Tampilkan di table view (kolom icon) dan grid view. Thumbnail di-generate server-side (PHP GD) dan di-cache agar tidak berat — hanya generate sekali per file, setelah itu serve dari cache.
- **Why**: Grid view sudah ada (`gridRenderer.js`), tapi belum ada thumbnail. Visual browsing sangat penting untuk media files.
- **Dependencies**: PHP `gd` extension (sudah listed di REQUIREMENTS.md sebagai optional)
- **Performance**: Lazy loading + cache di `storage/thumbnails/`. Tidak generate ulang jika sudah ada. Ukuran thumbnail kecil (~150x150px).
- **Files**: Backend `ThumbnailManager.php` (baru), cache di `storage/thumbnails/`, frontend update di `tableRenderer.js` dan `gridRenderer.js`

### 2.3 Upload Progress UI + Drag-to-Upload
- **Status**: `[x]`
- **Effort**: Medium (2-3 hari)
- **Impact**: High
- **Description**:
  - Drop zone visual saat drag file dari desktop
  - Progress bar per-file dan overall
  - Upload queue dengan cancel/retry per file
  - Chunked upload sudah ada di backend, perlu UI yang proper
- **Why**: Upload experience saat ini minimal. Drag-drop (`dragDrop.js`) ada tapi untuk move internal, bukan upload dari desktop.
- **Files**: `modules/uploadManager.js` (baru), `components/upload-progress.css` (baru), update `dragDrop.js`

### 2.4 Command Palette (Ctrl+K)
- **Status**: `[x]`
- **Effort**: Medium (2-3 hari)
- **Impact**: High
- **Description**: Quick-access command palette seperti di VS Code. Tekan `Ctrl+K` → muncul search bar di tengah layar:
  - Ketik nama file → langsung navigate ke file itu (fuzzy search)
  - Ketik "create" → muncul opsi Create File/Folder
  - Ketik "theme" → toggle dark/light mode
  - Ketik "upload" → buka upload dialog
  - Tampilkan keyboard shortcuts yang tersedia
- **Why**: Power user feature. Integrasi natural dengan `keyboardShortcuts.js` dan `router.js` yang sudah ada.
- **Files**: `modules/commandPalette.js` (baru), `overlays/command-palette.css` (baru)

### 2.5 Undo/Redo System
- **Status**: `[x]`
- **Effort**: Medium (2-3 hari)
- **Impact**: High
- **Description**: Undo stack untuk operasi file:
  - Undo delete: restore dari trash (sudah ada infrastruktur)
  - Undo rename: rename balik
  - Undo move: move balik
  - Toast notification dengan tombol "Undo" (`toast.js` sudah ada)
- **Why**: `optimisticUpdate()` dengan rollback di `state.js` sudah 60% jadi. Tinggal extend ke undo stack.
- **Files**: `modules/undoManager.js` (baru), update `state.js`, `toast.js`, `fileOperations.js`

### 2.6 Bulk Rename Tool
- **Status**: `[x]`
- **Effort**: Medium (2-3 hari)
- **Impact**: Medium
- **Description**: Diakses dari **context menu** saat multi-select file → klik kanan → "Bulk Rename". Muncul overlay/modal dengan opsi:
  - Find and replace dalam filename
  - Sequential numbering (photo_001, photo_002...)
  - Prefix/suffix
  - Preview hasil rename sebelum apply
- **Why**: Batch operations sudah ada tapi belum termasuk bulk rename. Sangat berguna untuk foto/dokumen.
- **Files**: `modules/bulkRename.js` (baru), `overlays/bulk-rename.css` (baru), update context menu

### 2.7 Full-text Search
- **Status**: `[x]`
- **Effort**: Medium (3-5 hari)
- **Impact**: Medium-High
- **Description**: Search konten file (bukan hanya nama). Grep-like search dengan:
  - Regex support
  - File type filter
  - Result highlighting
  - Navigate ke file dari hasil search
- **Why**: Filter saat ini hanya by filename. Content search sangat berguna untuk codebase/dokumen.
- **Files**: Backend `SearchHandler.php` (baru), frontend `modules/searchManager.js` (baru)

---

## Phase 3 — Major Features (High Effort, High Impact)

> Estimasi: 1-3 minggu per item. Membutuhkan perubahan arsitektur atau dependency baru.

### 3.1 User Authentication
- **Status**: `[x]`
- **Effort**: High (1-2 minggu)
- **Impact**: Very High
- **Description**: Sistem login dan permission:
  - Login/register/logout
  - Session management (PHP sessions atau JWT)
  - Role-based access: admin, editor, viewer
  - Per-folder permissions
  - Password hashing (bcrypt)
- **Why**: Fondasi untuk multi-user, sharing, dan security. Saat ini siapapun yang akses URL bisa manage semua file.
- **Dependencies**: Database (SQLite untuk simplicity, atau MySQL)
- **Files**: `app/Core/AuthManager.php`, `app/Core/UserManager.php`, migration scripts, login page

### 3.2 File Sharing
- **Status**: `[x]`
- **Effort**: High (1 minggu)
- **Impact**: High
- **Description**: Generate shareable links untuk file/folder:
  - Public link dengan optional password
  - Expiry date
  - Download-only atau view-only permission
  - Share management UI
- **Why**: Project ini memang file manager — sharing adalah fitur inti yang diharapkan. Memungkinkan kolaborasi dan distribusi file.
- **Dependencies**: User Authentication (3.1)
- **Files**: `app/Core/ShareManager.php`, `app/Handlers/ShareHandler.php`, share page

### 3.3 Dual-Pane Mode
- **Status**: `[x]`
- **Effort**: High (1-2 minggu)
- **Impact**: High
- **Description**: Split view menampilkan dua direktori side-by-side (ala Total Commander):
  - Independent navigation per pane
  - Drag-drop antar pane untuk copy/move
  - Toggle via button di action bar (sebelah toggle grid/list) atau shortcut `Ctrl+\`
  - Klik sekali → split 2 panel, klik lagi → kembali single panel
- **Why**: Power user feature. Membuat operasi copy/move jauh lebih intuitif.
- **Files**: Layout restructuring, `modules/paneManager.js` (baru), CSS layout updates

### 3.4 Internationalization (i18n)
- **Status**: `[x]`
- **Effort**: High (1-2 minggu)
- **Impact**: Medium
- **Description**: Multi-language support:
  - Extract semua hardcoded strings (termasuk yang mixed Indonesian/English saat ini)
  - Language files (JSON): `en`, `id`, dll
  - Language switcher di settings
  - RTL support (optional)
- **Why**: Codebase saat ini mix bahasa Indonesia dan English (contoh: `"Root directory tidak ditemukan"`). i18n menyelesaikan ini sekaligus membuka ke audience global.
- **Files**: `locales/en.json`, `locales/id.json`, `modules/i18n.js` (baru), update semua string references

---

## Phase 4 — Advanced / Long-term (Very High Effort)

> Estimasi: 2-4 minggu per item. Ditunda untuk saat ini.

### 4.1 Cloud Storage Integration
- **Status**: `[ ]` (Ditunda)
- **Effort**: Very High (2-4 minggu)
- **Impact**: Medium
- **Description**: Abstraction layer untuk storage backend:
  - Local filesystem (current)
  - Amazon S3
  - Google Drive
  - Dropbox
  - Storage adapter pattern
- **Why**: Memungkinkan manage file di cloud. Diinginkan tapi ditunda karena effort sangat tinggi.
- **Dependencies**: SDK masing-masing provider, storage abstraction layer
- **Files**: `app/Core/StorageAdapter.php` (interface), implementasi per provider

### 4.2 TypeScript Migration
- **Status**: `[ ]`
- **Effort**: Very High (2-4 minggu)
- **Impact**: Medium
- **Description**: Migrasi 40+ JS modules ke TypeScript secara incremental:
  - Setup `tsconfig.json` dengan `allowJs: true`
  - Migrasi per-module, mulai dari `state.js`, `apiService.js`, `constants.js`
  - Type definitions untuk state, API responses, file items
  - Update build pipeline (esbuild sudah support TS)
- **Why**: Type safety, better IDE support, catch bugs at compile time.
- **Deployment**: Tetap bisa pakai Laragon. TypeScript di-compile ke JavaScript biasa saat build via esbuild. Yang di-deploy tetap file `.js`. Laragon tidak perlu tahu soal TypeScript.
- **Strategy**: Incremental — rename `.js` ke `.ts` satu per satu, mulai dari modules tanpa DOM dependency.

---

## Phase 5 — Developer Experience & Code Quality

> Ongoing improvements, bisa dikerjakan paralel dengan fitur lain.

### 5.1 Expand Test Coverage
- **Status**: `[x]`
- **Effort**: Medium (ongoing)
- **Impact**: High
- **Description**: Tambah unit test untuk module-module yang belum ada test-nya. Saat ini hanya 3 test files (`state.test.js`, `FileManagerTest.php`, `SecurityTest.php`) untuk 40+ JS modules dan 11 PHP files. Target:
  - `apiService.js` — critical path, mock fetch
  - `fileOperations.js` — core business logic
  - `batchOperations.js` — multi-select operations
  - `TrashManager.php` — trash lifecycle
  - `ArchiveManager.php` — archive operations
  - Integration tests untuk API endpoints
- **Target**: 60%+ code coverage

### 5.2 API Documentation (OpenAPI)
- **Status**: `[x]`
- **Effort**: Low-Medium (2-3 hari)
- **Impact**: Medium
- **Description**: OpenAPI/Swagger spec untuk 20+ API endpoints di `api.php`. Auto-generate documentation.
- **Why**: Frontend-backend contract. Memudahkan contributor memahami API.
- **Files**: `docs/api/openapi.yaml`, optional Swagger UI page

### 5.3 CHANGELOG.md
- **Status**: `[x]`
- **Effort**: Low (< 1 hari)
- **Impact**: Low-Medium
- **Description**: Changelog mengikuti [Keep a Changelog](https://keepachangelog.com/) format. Track semua perubahan per versi.
- **Files**: `CHANGELOG.md`

### 5.4 CONTRIBUTING.md
- **Status**: `[x]`
- **Effort**: Low (< 1 hari)
- **Impact**: Low-Medium
- **Description**: Panduan kontribusi: setup development environment, coding standards, PR process, testing requirements.
- **Files**: `CONTRIBUTING.md`

### 5.5 Error Boundary / Global Error UI
- **Status**: `[x]`
- **Effort**: Low-Medium (1-2 hari)
- **Impact**: Medium
- **Description**: Graceful error state saat terjadi error fatal. `errorHandler.js` sudah ada dengan categories dan severity, tapi perlu UI yang proper untuk user-facing errors.
- **Files**: Update `errorHandler.js`, `components/error-boundary.css` (baru)

---

## Rejected / Skipped Items

> Item yang dipertimbangkan tapi tidak akan dikerjakan.

| # | Item | Reason |
|---|------|--------|
| — | Docker Support | Skip — tidak diperlukan saat ini |
| — | CI/CD Pipeline | Skip — tidak diperlukan saat ini |
| — | File Versioning | Tidak perlu |
| — | Service Worker & Offline | Tidak perlu — limited value untuk file manager |
| — | Plugin/Extension System | Tidak perlu — premature untuk saat ini |

---

## Already Completed

> Fitur-fitur yang sudah selesai diimplementasi.

- [x] Modular CSS Architecture (42-file, 7-layer system)
- [x] Modular JS Architecture (40 ES6+ modules)
- [x] Trash System (soft delete + restore + auto-cleanup)
- [x] Activity Logging (audit trail + export)
- [x] Batch Operations (multi-select actions)
- [x] Analytics Module (privacy-respecting tracking)
- [x] Security Hardening (XSS prevention, rate limiting, CSRF, path traversal protection)
- [x] Archive Operations (ZIP/7z/RAR create + extract)
- [x] CodeMirror 6 Editor (syntax highlighting, 15 language packages)
- [x] Virtual Scrolling (performance untuk large directories)
- [x] Toast Notifications (non-blocking feedback)
- [x] Favorites System (bookmark files/folders)
- [x] Client-Side Router (SPA-like navigation)
- [x] Keyboard Shortcuts (full keyboard navigation)
- [x] Dark Mode (complete theme system via CSS variables)
- [x] Responsive Design (mobile, tablet, desktop)
- [x] Accessibility (WCAG 2.1 AA compliance)
- [x] Test Suite (Jest 29 + PHPUnit 9.6)
- [x] Linting (ESLint 9 + PHP_CodeSniffer PSR-12)
- [x] Grid/Thumbnail View Toggle (grid view + toggle UI)
- [x] UI/UX Improvements (row density, hover actions, breadcrumb, empty states, pagination)
- [x] Context Menu Cut/Copy/Paste (Phase 1.1)
- [x] File/Folder Properties Panel (Phase 1.2)
- [x] Folder Size Calculator (Phase 1.3)
- [x] Loading Skeleton UI (Phase 1.4)
- [x] Rich File Preview — Gallery Nav + Markdown + Fullscreen (Phase 2.1)
- [x] File Thumbnails — PHP GD + lazy load + cache (Phase 2.2)
- [x] Upload Progress UI + Drag-to-Upload (Phase 2.3)
- [x] Command Palette — Ctrl+K (Phase 2.4)
- [x] Undo/Redo System (Phase 2.5)
- [x] Bulk Rename Tool (Phase 2.6)
- [x] Full-text Content Search — Ctrl+Shift+F (Phase 2.7)
- [x] User Authentication — RBAC + SQLite (Phase 3.1)
- [x] File Sharing — Shareable links + password + expiry (Phase 3.2)
- [x] Dual-Pane Mode — Ctrl+\ (Phase 3.3)
- [x] Internationalization — i18n with ID/EN (Phase 3.4)
- [x] Expanded Test Coverage — 334 tests (Phase 5.1)
- [x] API Documentation — OpenAPI 3.1 spec (Phase 5.2)
- [x] CHANGELOG.md (Phase 5.3)
- [x] CONTRIBUTING.md (Phase 5.4)
- [x] Error Boundary / Global Error UI (Phase 5.5)

---

## Priority Summary

| Phase | Items | Estimated Total |
|-------|-------|-----------------|
| Phase 1 (Quick Wins) | 4 items | 3-5 hari |
| Phase 2 (Core Features) | 7 items | 3-5 minggu |
| Phase 3 (Major Features) | 4 items | 4-7 minggu |
| Phase 4 (Advanced) | 2 items | 4-8 minggu |
| Phase 5 (DX/Quality) | 5 items | 2-3 minggu |
| **Total** | **22 items** | — |

---

## Dependency Graph

```
Phase 1 (independent, bisa paralel)
  1.1 Context Menu Cut/Copy/Paste
  1.2 Properties Panel ──> 1.3 Folder Size (tampilkan di panel)
  1.4 Skeleton UI

Phase 2 (mostly independent)
  2.1 Rich Preview
  2.2 Thumbnails ──> depends on grid view (sudah done)
  2.3 Upload Progress
  2.4 Command Palette
  2.5 Undo System
  2.6 Bulk Rename (via context menu multi-select)
  2.7 Full-text Search

Phase 3 (has dependencies)
  3.1 Authentication ──> 3.2 File Sharing (requires auth)
  3.3 Dual-Pane Mode
  3.4 i18n

Phase 4 (deferred)
  4.1 Cloud Storage (ditunda)
  4.2 TypeScript Migration (incremental, deploy tetap via Laragon)
```

---

## Notes

- Phase 1-2 bisa dikerjakan paralel karena independent satu sama lain.
- Phase 3 memiliki dependency chain: Authentication (3.1) harus selesai sebelum Sharing (3.2).
- Cloud Storage (4.1) diinginkan tapi ditunda — akan dikerjakan setelah Phase 3 selesai.
- TypeScript migration (4.2) incremental, deploy tetap pakai Laragon (compile TS ke JS via esbuild).
- File ini akan di-update seiring progress. Gunakan status legend di atas.
