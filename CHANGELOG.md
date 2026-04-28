# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [2.0.0] - 2026-04-28

### Added

#### Phase 1 — Quick Wins
- **Context Menu Cut/Copy/Paste** — Right-click context menu with Cut, Copy, Paste, Rename, Move, Download, Copy Path, Details, Delete. Visual indicator (dimmed/striped) for cut items. Keyboard shortcuts Ctrl+C/X/V. Backend `copy_items()` API with recursive folder copy and auto-rename conflict handling.
- **File/Folder Properties Panel** — Enhanced details overlay with extended metadata: MIME type, created date, permissions (octal + readable/writable badges), children count for folders. Async API fetch for extended details.
- **Folder Size Calculator** — On-demand recursive folder size calculation via "Hitung Ukuran" button in Properties Panel. Returns total size, file count, and folder count.
- **Loading Skeleton UI** — Skeleton placeholder animations for table, grid, and mobile views during directory loading. Replaces spinner for better perceived performance. Polling uses silent mode to avoid flicker.

#### Phase 2 — Core Features
- **Rich File Preview** — Image gallery navigation (prev/next with keyboard arrows, counter badge), Markdown rendered preview (toggle between CodeMirror raw and rendered HTML with built-in converter), Fullscreen mode button with Fullscreen API integration.
- **File Thumbnails** — Server-side thumbnail generation via PHP GD (150x150px JPEG). Cached in `storage/thumbnails/` with ETag/304 support. Lazy loading with `loading="lazy"` and `decoding="async"`. Error fallback to SVG icons. Supported: jpg, jpeg, png, gif, webp, bmp.
- **Upload Progress UI + Drag-to-Upload** — Upload modal with per-file XHR progress bars, cancel/retry/remove per file, overall progress. Full-screen drop zone overlay with drag-and-drop from desktop. Sequential upload with real-time percentage.
- **Command Palette (Ctrl+K)** — VS Code-style command palette with 25+ commands across 7 categories. Fuzzy search with scoring (consecutive/start/separator bonuses). File search mode (type `/` or Tab to search files in current directory). Keyboard navigation, shortcut hints display.
- **Undo/Redo System** — Undo stack (max 20 entries) for delete (trash-restore), move (reverse move), rename (reverse rename), copy (delete copied), bulk-rename (reverse all). Toast notifications with "Undo" action button (6s duration). Ctrl+Z keyboard shortcut.
- **Bulk Rename Tool** — Three rename modes: Find/Replace (with regex and case-sensitive options), Sequential Numbering (configurable pattern/start/step/keep-extension), Prefix/Suffix. Live preview of changes. Accessible via context menu on multi-select (2+ items) and Command Palette.
- **Full-text Content Search (Ctrl+Shift+F)** — Grep-like recursive file content search. Regex support, case-sensitive toggle, extension filtering. Results grouped by file with collapsible headers, line numbers, highlighted matches, context lines. Click to open file. Max 1MB per file, 500 results. Skips binary files and common vendor directories.

#### Phase 3 — Major Features
- **User Authentication** — Session-based auth with bcrypt password hashing (cost 12). Login/register/logout. Rate limiting (5 failed attempts per 15 minutes). RBAC with three roles: admin (full access), editor (read+write), viewer (read-only). Per-folder permissions with most-specific path matching. SQLite database with auto-migration. Default credentials: admin/admin123. User menu dropdown with avatar, change password, logout.
- **File Sharing** — Shareable links with 32-char random tokens. Optional password protection (bcrypt), configurable expiry (1h/6h/24h/7d/30d/never), max download limits. Public access page (`share.php`) with no auth required. Download counter. Share management in context menu and Command Palette. Admin can manage all shares.
- **Dual-Pane Mode** — Split view with independent file browser in right pane. Own state, breadcrumbs, file list, and navigation. Resizable divider (mouse drag + keyboard arrows). Cross-pane drag-and-drop for move (normal) and copy (Ctrl+drag). Toggle via action bar button or Ctrl+\. Hidden on mobile.
- **Internationalization (i18n)** — Multi-language support with JSON translation files. Indonesian (`id.json`) and English (`en.json`) with 200+ keys across 20+ sections. Proxy-based message objects in constants.js for backward compatibility. Language switcher in Settings. Browser language auto-detection. `t(key, params)` function with dot notation and placeholder interpolation.

#### Phase 5 — Developer Experience
- **Expanded Test Coverage** — 334 total tests (215 JS + 119 PHP). New JS test suites: utils (76 tests), storage (32), toast (26), pagination (43). New PHP test suites: Database (21 tests), Auth (40), TrashManager (23). All new tests passing.
- **API Documentation (OpenAPI 3.1)** — Complete Swagger/OpenAPI spec at `docs/api/openapi.yaml` covering all 35+ API endpoints with request/response schemas, authentication, and RBAC documentation.
- **CHANGELOG.md** — This file. Follows Keep a Changelog format.
- **CONTRIBUTING.md** — Contributor guide with setup instructions, coding standards, PR process, and testing requirements.
- **Error Boundary / Global Error UI** — Graceful error states for unhandled errors and network failures with user-friendly error panel and retry functionality.

### Changed
- `composer.json` PHP version constraint updated from `^7.4` to `^7.4 || ^8.0` to support PHP 8.3
- SQLite migration defaults changed from `datetime("now")` to `CURRENT_TIMESTAMP` for PHP 8.3 compatibility
- Toast system extended with action button support (5th parameter `actions` array)
- `constants.js` message objects converted to i18n-aware Proxy-based objects
- `phpunit.xml` coverage expanded to include `app/Handlers` directory

### Fixed
- Keyboard shortcuts now target both `tr[data-item-path]` and `div[data-item-path]` for table and grid/mobile view support

---

## [1.0.0] - 2026-04-01

### Added
- Modular CSS Architecture (42-file, 7-layer system)
- Modular JS Architecture (40 ES6+ modules)
- Trash System (soft delete + restore + auto-cleanup)
- Activity Logging (audit trail + export)
- Batch Operations (multi-select actions)
- Analytics Module (privacy-respecting tracking)
- Security Hardening (XSS prevention, rate limiting, CSRF, path traversal protection)
- Archive Operations (ZIP/7z/RAR create + extract)
- CodeMirror 6 Editor (syntax highlighting, 15 language packages)
- Virtual Scrolling (performance for large directories)
- Toast Notifications (non-blocking feedback)
- Favorites System (bookmark files/folders)
- Client-Side Router (SPA-like navigation)
- Keyboard Shortcuts (full keyboard navigation)
- Dark Mode (complete theme system via CSS variables)
- Responsive Design (mobile, tablet, desktop)
- Accessibility (WCAG 2.1 AA compliance)
- Test Suite (Jest 29 + PHPUnit 9.6)
- Linting (ESLint 9 flat config)
- Grid/Thumbnail View Toggle
- UI/UX Improvements (row density, hover actions, breadcrumb, empty states, pagination)
