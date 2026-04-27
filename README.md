# File Manager — Modern Web-Based File Management System

**License:** MIT
**Author:** [Kyuzan0](https://github.com/Kyuzan0)
**Repository:** [https://github.com/Kyuzan0/Filemanager](https://github.com/Kyuzan0/Filemanager)

---

## 🎯 Overview

A modern, full-featured web-based file manager built with vanilla JavaScript (ES6+ modules) and PHP. Features include file browsing, upload/download, drag & drop, virtual scrolling, dark mode, trash system, activity logging, analytics, archive operations, code editing (CodeMirror 6), security hardening, and comprehensive file operations.

---

## 🏗️ Architecture

### Frontend
- **Architecture:** Modular ES6+ JavaScript (40 modules across 3 directories)
- **CSS System:** 42-file modular CSS architecture (7-layer design)
- **State Management:** Centralized state with pubsub pattern
- **UI Framework:** Tailwind CSS (via CDN) + Custom modular CSS
- **Code Editor:** CodeMirror 6 (bundled via esbuild, 15 language packages)
- **Icons:** RemixIcon CDN + custom SVG icons module

### Backend
- **Language:** PHP 7.4+
- **Architecture:** Namespaced OOP with PSR-4 autoloading (`App\` → `app/`)
- **API:** RESTful JSON endpoints via `api.php` router
- **File Operations:** Chunked uploads, sanitized paths, security validation

### Communication
- **Protocol:** HTTP REST with JSON
- **Request Handling:** Fetch API with AbortController
- **Error Handling:** Structured error responses with proper HTTP codes

---

## 💻 Tech Stack

### Core Technologies
| Technology | Details |
|---|---|
| **JavaScript** | ES6+ modules, async/await, Promises |
| **HTML5** | Semantic markup, accessibility features |
| **CSS3** | 42-file modular architecture, CSS variables, dark mode |
| **PHP** | 7.4+ with namespaced OOP (PSR-4) |
| **Tailwind CSS** | CDN-based utility framework |
| **CodeMirror 6** | Code editor with 15 language modes (bundled via esbuild) |

### Dev Tooling
| Tool | Purpose |
|---|---|
| **ESLint 9** | JavaScript linting (flat config, ES2020) |
| **PHP_CodeSniffer** | PHP linting (PSR-12) |
| **Jest 29** | JavaScript unit testing (jsdom, babel-jest) |
| **PHPUnit 9.6** | PHP unit testing |
| **esbuild** | CodeMirror bundle builder |
| **Babel** | ES6+ transpilation (for Jest compatibility) |
| **.editorconfig** | UTF-8, LF line endings, 4-space indent |

### CodeMirror 6 Language Support
JavaScript, PHP, CSS, HTML, JSON, Markdown, Python, SQL, XML, YAML, C/C++ — plus autocomplete, search, and syntax highlighting via `@lezer/highlight`.

---

## 📁 Project Structure

```
Filemanager/
├── public/                        # 🌐 Web-accessible files (document root)
│   ├── index.php                  # Main HTML entry point
│   ├── api.php                    # RESTful API endpoint router
│   ├── .htaccess                  # Apache configuration
│   │
│   ├── assets/
│   │   ├── css/                   # 🎨 Modular CSS (42 files)
│   │   │   ├── main.css           # CSS orchestration (77 lines, 41 @imports)
│   │   │   ├── core/              # Variables, reset, base (3 files)
│   │   │   ├── layout/            # App, sidebar, topbar, action-bar, footer (5 files)
│   │   │   ├── components/        # Buttons, cards, tables, forms, modals, badges, icons,
│   │   │   │                      #   context-menu, loader, navigation, toast, enhanced-ui (12 files)
│   │   │   ├── overlays/          # Create, preview, confirm, rename, unsaved, move, delete,
│   │   │   │                      #   download, details, log, settings, trash, context-menu,
│   │   │   │                      #   shortcuts (14 files)
│   │   │   ├── themes/            # Dark mode system (1 file)
│   │   │   ├── pages/             # Trash, logs page styles (2 files)
│   │   │   └── utilities/         # Animations, helpers, responsive, accessibility (4 files)
│   │   │
│   │   └── js/                    # 📜 JavaScript
│   │       ├── index.js           # Application entry point (1102 lines)
│   │       ├── modules/           # 40 ES6 modules
│   │       │   ├── ui/            # UI sub-modules (4 files)
│   │       │   ├── handlers/      # Handler sub-modules (4 files)
│   │       │   └── *.js           # 32 root modules
│   │       ├── vendor/            # CodeMirror 6 bundle (codemirror.min.js)
│   │       ├── sidebar.js         # Sidebar controller
│   │       ├── trash.js           # Trash page controller
│   │       ├── logs.js            # Logs page controller
│   │       ├── enhanced-ui.js     # Legacy compatibility
│   │       ├── modals-handler.js  # Legacy modal handler
│   │       └── log-handler.js     # Legacy log handler
│   │
│   └── partials/                  # 📄 PHP Partials (13 files)
│       ├── sidebar.php            # Sidebar navigation
│       ├── table.php              # File table structure
│       ├── overlays.php           # Modal dialogs
│       ├── action-bar.php         # Action toolbar
│       ├── settings-modal.php     # Settings dialog
│       ├── trash-overlay.php      # Trash overlay
│       ├── logs/                  # Log partials
│       │   ├── modal.php
│       │   ├── toolbar.php
│       │   └── table.php
│       └── trash/                 # Trash partials
│           ├── toolbar.php
│           ├── table.php
│           ├── detail-modal.php
│           └── confirm-modal.php
│
├── app/                           # 🔧 Application Code (not web-accessible)
│   ├── Core/                      # Core business logic classes
│   │   ├── FileManager.php        # File operations & security
│   │   ├── TrashManager.php       # Trash system operations
│   │   ├── ArchiveManager.php     # ZIP/7z/RAR archive handling
│   │   ├── LogManager.php         # Activity logging system
│   │   └── Security.php           # Path sanitization & validation
│   │
│   ├── Handlers/                  # 📦 API Request Handlers
│   │   ├── FileHandler.php        # File/folder CRUD operations
│   │   ├── TrashHandler.php       # Trash bin operations
│   │   ├── ArchiveHandler.php     # Compression/extraction
│   │   ├── LogHandler.php         # Activity logs operations
│   │   ├── RawHandler.php         # Raw file streaming (media preview)
│   │   └── SystemHandler.php      # System requirements & status
│   │
│   ├── Helpers/
│   │   └── helpers.php            # Common utility functions
│   │
│   └── Config/
│       └── paths.php              # Centralized path constants
│
├── storage/                       # 📂 User Data Storage
│   ├── files/                     # User file storage directory
│   ├── trash/                     # 🗑️ Trash storage (soft delete)
│   ├── logs/                      # 📊 Activity logs (JSON)
│   └── temp/                      # Temporary files
│
├── bin/                           # 📦 Bundled Binaries & Setup
│   ├── setup.php                  # OS detection & binary setup
│   ├── setup-7zip.php             # 7-Zip configuration
│   ├── windows/                   # Windows 7-Zip (7z.exe + 7z.dll)
│   └── linux/                     # Linux p7zip (7za)
│
├── build/                         # 🔨 Build Artifacts
│   └── codemirror-bundle.js       # esbuild source for CodeMirror bundle
│
├── tests/                         # 🧪 Test Suite
│   ├── state.test.js              # Jest: state module tests
│   ├── setup.js                   # Jest setup configuration
│   ├── bootstrap.php              # PHPUnit bootstrap
│   └── Unit/
│       ├── FileManagerTest.php    # PHPUnit: FileManager tests
│       └── SecurityTest.php       # PHPUnit: Security tests
│
├── autoload.php                   # PSR-4 class autoloader
├── bootstrap.php                  # Application initialization
├── package.json                   # npm dependencies & scripts
├── composer.json                  # PHP dependencies (php ^7.4)
├── eslint.config.js               # ESLint 9 flat config
├── phpunit.xml                    # PHPUnit configuration
├── phpcs.xml                      # PHP_CodeSniffer (PSR-12)
├── jest.config.js                 # Jest configuration
├── babel.config.js                # Babel (for Jest)
├── tailwind.config.js             # Tailwind CSS config (CDN marker)
├── .editorconfig                  # Editor configuration
├── .gitignore                     # Git ignore rules
└── Readme.md                      # This file
```

---

## ✨ Features

### Core File Operations
| Feature | Description |
|---------|-------------|
| 📁 **Browse & Navigate** | Breadcrumb navigation, folder traversal, router-based navigation |
| ➕ **Create** | New files and folders with validation |
| ✏️ **Rename** | In-place renaming with conflict detection |
| 📦 **Move** | Drag & drop or dialog-based file moving |
| 🗑️ **Delete** | Soft delete with trash system |
| 📤 **Upload Files** | Chunked uploads (5MB chunks) for large files |
| 📂 **Upload Folders** | Upload entire folder with subfolder structure |
| 📥 **Download** | Direct file downloads |
| 👁️ **Preview** | Text, image, video, audio, PDF preview |
| ✏️ **Code Editor** | CodeMirror 6 with syntax highlighting for 11 languages |
| 📦 **Archive Operations** | Create/extract ZIP, 7z, RAR archives |
| ⭐ **Favorites** | Bookmark frequently accessed files/folders |

### UI/UX Features
| Feature | Description |
|---------|-------------|
| 🚀 **Virtual Scrolling** | Smooth performance with 1000+ files |
| 📄 **Pagination** | Hybrid pagination with configurable page size |
| 🖱️ **Drag & Drop** | File moving with visual feedback |
| 📋 **Context Menu** | Right-click operations |
| ⌨️ **Keyboard Shortcuts** | Full keyboard navigation |
| 🌙 **Dark Mode** | Complete dark theme with CSS variables |
| 📱 **Responsive Design** | Mobile, tablet, desktop optimized |
| 👆 **Touch Support** | 44px minimum touch targets |
| ♿ **Accessibility** | WCAG 2.1 AA compliant |
| 🔔 **Toast Notifications** | Non-blocking user feedback |
| 🔄 **Render Optimization** | Debounced rendering for smooth updates |

### Advanced Features
| Feature | Description |
|---------|-------------|
| 🗑️ **Trash System** | Soft delete with restore capability |
| 📊 **Activity Logging** | Complete audit trail with filters |
| 📈 **Analytics** | Privacy-respecting usage analytics (local only) |
| 🔒 **Security** | Input validation, XSS prevention, rate limiting |
| 📤 **Log Export** | JSON/CSV export capabilities |
| ⚡ **Optimistic UI** | Instant feedback before server response |
| 🔗 **State Persistence** | LocalStorage for preferences |
| 📦 **Batch Operations** | Multi-select with bulk actions |
| 🔍 **Search & Filter** | Real-time file search |
| 📊 **Sort** | By name, type, date, size |
| 🔀 **Client-Side Router** | SPA-like navigation without page reloads |
| 🐛 **Debug Utilities** | Built-in debug logging module |

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | Create new file |
| `Ctrl + Shift + N` | Create new folder |
| `Ctrl + U` | Upload files |
| `Ctrl + A` | Select all items |
| `Ctrl + F` | Focus search |
| `Delete` | Delete selected items |
| `Enter` | Open selected item |
| `Escape` | Close modal / Deselect all |
| `↑ / ↓` | Navigate items |
| `Ctrl + Click` | Toggle item selection |
| `Shift + Click` | Range selection |

---

## 🎨 CSS Architecture (7-Layer Modular System)

### Layer Overview

```
Layer 1: CORE (Foundation) — 3 files
├── variables.css     - CSS custom properties (light/dark themes)
├── reset.css         - CSS reset & normalization
└── base.css          - Base element styling

Layer 2: LAYOUT (Structure) — 5 files
├── app.css           - App container & main wrapper
├── sidebar.css       - Sidebar navigation
├── topbar.css        - Header/top navigation
├── action-bar.css    - Action toolbar
└── footer.css        - Footer area

Layer 3: COMPONENTS (UI Elements) — 12 files
├── buttons.css       - Button styles & variants
├── cards.css         - Card containers
├── tables.css        - Data table styling
├── forms.css         - Form inputs & controls
├── modals.css        - Modal dialogs
├── badges.css        - Badge components
├── icons.css         - Icon styling
├── context-menu.css  - Right-click menu
├── loader.css        - Loading indicators
├── navigation.css    - Breadcrumb navigation
├── toast.css         - Toast notifications
└── enhanced-ui.css   - Enhanced UI components

Layer 4: OVERLAYS (Modal Content) — 14 files
├── create.css        - Create file/folder modal
├── preview.css       - File preview modal
├── confirm.css       - Confirmation dialogs
├── rename.css        - Rename modal
├── unsaved.css       - Unsaved changes modal
├── move.css          - Move/relocate modal
├── delete.css        - Delete confirmation
├── download.css      - Download dialog
├── details.css       - File details panel
├── log.css           - Activity log viewer
├── settings.css      - Settings dialog
├── trash.css         - Trash overlay
├── context-menu.css  - Context menu overlay
└── shortcuts.css     - Keyboard shortcuts overlay

Layer 5: THEMES (Theming System) — 1 file
└── dark.css          - Dark mode with CSS variable overrides

Layer 6: PAGES (Page-Specific Styles) — 2 files
├── trash.css         - Trash page styles
└── logs.css          - Logs page styles

Layer 7: UTILITIES (Helpers & Responsive) — 4 files
├── animations.css    - @keyframes & animation utilities
├── helpers.css       - Utility classes (display, flex, spacing, etc.)
├── responsive.css    - All media queries & breakpoints
└── accessibility.css - Accessibility-specific styles
```

### CSS Metrics
- **Total Files:** 41 modular CSS files + 1 orchestration (`main.css`)
- **Main Entry:** `main.css` (77 lines, 41 `@import` statements)
- **Architecture:** 7-layer separation of concerns
- **Dark Mode:** Consolidated theme system via CSS variables
- **Naming:** BEM convention (block__element--modifier)

### Design System
- **CSS Variables:** Light/dark theme with semantic naming
- **Responsive:** Mobile-first breakpoints (640px, 768px, 1024px, 1280px)
- **Animations:** Keyframes (spin, pulse, fade, slide, bounce, shake)

---

## 📜 JavaScript Architecture (40 ES6+ Modules)

### Entry Point
- `index.js` — Application initialization, error handling, module orchestration (1102 lines)

### Module Organization

**UI Sub-Modules** (`modules/ui/`) — 4 files
| Module | Purpose |
|--------|---------|
| `breadcrumbRenderer.js` | Breadcrumb navigation rendering |
| `tableRenderer.js` | File table rendering |
| `statusRenderer.js` | Status bar rendering |
| `overlayRenderer.js` | Overlay/modal rendering |

**Handler Sub-Modules** (`modules/handlers/`) — 4 files
| Module | Purpose |
|--------|---------|
| `formHandlers.js` | Form submission handling |
| `keyboardHandlers.js` | Keyboard event handling |
| `fileHandlers.js` | File operation event handling |
| `dragHandlers.js` | Drag & drop event handling |

**Core Modules** (`modules/`) — 32 files
| Module | Purpose |
|--------|---------|
| `appInitializer.js` | App setup, DOM binding, initial load |
| `state.js` | Centralized state management with pubsub |
| `apiService.js` | HTTP layer with AbortController |
| `fileOperations.js` | Business logic for all file operations |
| `uiRenderer.js` | DOM rendering, virtual scrolling, item display |
| `constants.js` | Configuration and constants |
| `utils.js` | Helper functions (format dates, sizes, etc.) |
| `router.js` | Client-side routing |
| `security.js` | Frontend security utilities |
| `errorHandler.js` | Global error handling |
| `eventHandlers.js` | Event binding and delegation |
| `modals.js` | Modal lifecycle management |
| `dragDrop.js` | Drag & drop with visual feedback |
| `moveOverlay.js` | File move dialog |
| `logManager.js` | Activity log viewer with filters |
| `storage.js` | LocalStorage abstraction |
| `fileIcons.js` | File type to icon mapping |
| `svgIcons.js` | SVG icon definitions |
| `debug.js` | Debug utilities and logging |
| `batchOperations.js` | Multi-select bulk actions |
| `analytics.js` | Privacy-respecting usage analytics |
| `accessibility.js` | Accessibility features |
| `codemirror-editor.js` | CodeMirror 6 integration |
| `favorites-manager.js` | Favorites/bookmarks system |
| `keyboardShortcuts.js` | Keyboard shortcut bindings |
| `pagination.js` | Advanced pagination |
| `pagination-simple.js` | Simple pagination variant |
| `renderOptimizer.js` | Render performance optimization |
| `systemRequirements.js` | System requirements checker |
| `toast.js` | Toast notification system |
| `virtualScroll.js` | Virtual scrolling engine |
| `wordWrapToggle.js` | Code editor word wrap toggle |

**Standalone Controllers**
| File | Purpose |
|------|---------|
| `sidebar.js` | Sidebar controller |
| `trash.js` | Trash page controller |
| `logs.js` | Logs page controller |

**Legacy Files** (maintained for backward compatibility)
| File | Purpose |
|------|---------|
| `enhanced-ui.js` | Legacy UI enhancements |
| `modals-handler.js` | Legacy modal handler |
| `log-handler.js` | Legacy log handler |

**Vendor**
| File | Purpose |
|------|---------|
| `vendor/codemirror.min.js` | CodeMirror 6 bundle (built via esbuild) |

### Key Patterns
- **State Management:** Centralized with pubsub notifications
- **API Communication:** Promise-based with AbortController cancellation
- **UI Updates:** Optimistic updates with server reconciliation
- **Performance:** Virtual scrolling, debounced rendering, request cancellation
- **Routing:** Client-side router for SPA-like navigation

---

## 🔧 Backend (PHP)

### Architecture

The backend uses a **namespaced OOP architecture** with PSR-4 autoloading. `public/api.php` acts as a lightweight router that delegates requests to specialized handler classes:

```
public/api.php (Router)
    ↓ (loads bootstrap.php & autoload.php)
    ↓
app/Handlers/                          (namespace: App\Handlers)
├── FileHandler.php     → File/folder CRUD operations
├── TrashHandler.php    → Trash bin operations
├── LogHandler.php      → Activity log operations
├── ArchiveHandler.php  → Compress/extract operations
├── SystemHandler.php   → System info & requirements
└── RawHandler.php      → Media streaming
    ↓ (uses)
app/Core/                              (namespace: App\Core)
├── FileManager.php     → Core file operations
├── TrashManager.php    → Trash management
├── ArchiveManager.php  → ZIP/7z operations
├── LogManager.php      → Activity logging
└── Security.php        → Path & input validation
    ↓ (supported by)
app/Helpers/helpers.php → Common utility functions
app/Config/paths.php    → Centralized path constants
```

### API Endpoints (`api.php`)

**File Management:**
```
GET  api.php?action=list&path=...       # List directory
POST api.php?action=create              # Create file/folder
POST api.php?action=rename              # Rename item
POST api.php?action=move                # Move items
POST api.php?action=delete              # Delete (move to trash)
POST api.php?action=upload              # Upload files (chunked)
GET  api.php?action=content&path=...    # Read file content
POST api.php?action=save                # Save file content
GET  api.php?action=raw&path=...        # Stream raw file (media preview)
```

**Archive Operations:**
```
POST api.php?action=compress            # Create ZIP archive
POST api.php?action=extract             # Extract archive
GET  api.php?action=zip-contents&path=...  # List archive contents
```

**Trash Operations:**
```
GET  api.php?action=trash-list          # List trash items
POST api.php?action=trash-restore       # Restore from trash
POST api.php?action=trash-delete        # Permanently delete
POST api.php?action=trash-empty         # Empty trash
POST api.php?action=trash-cleanup       # Cleanup old items
```

**Logs & System:**
```
GET  api.php?action=logs                # Get activity logs
POST api.php?action=logs-cleanup        # Cleanup old logs
GET  api.php?action=logs-export         # Export logs (JSON/CSV)
GET  api.php?action=system-requirements # Check system requirements
GET  api.php?action=7zip-status         # Check 7-Zip availability
```

### Core Classes

**`App\Core\FileManager`** — File Operations
- `list_directory()` — List files with metadata
- `create_file()` / `create_folder()` — Create files/folders
- `rename_item()` — Rename with validation
- `move_items()` — Move files/folders
- `delete_single_path()` / `delete_paths()` — Delete with recursion
- `upload_files()` / `upload_chunk()` — Chunked upload processing
- `upload_files_with_folders()` — Upload with folder structure preservation
- `read_text_file()` / `write_text_file()` — Read/write editable files
- `sanitize_relative_path()` — Path sanitization
- `resolve_path()` — Prevent directory traversal

**`App\Core\Security`** — Security Utilities
- `sanitizeRelativePath()` — Clean and validate paths
- `isPathWithinRoot()` — Prevent directory traversal
- `sanitizeFilename()` — Clean filename input
- `isExtensionAllowed()` — Validate file extensions
- `setSecurityHeaders()` — Set HTTP security headers

**`App\Core\TrashManager`** — Trash Operations
- Soft delete with metadata preservation
- Restore to original location
- Permanent deletion
- Auto-cleanup of old items

**`App\Core\ArchiveManager`** — Archive Operations
- ZIP creation and extraction
- 7z/RAR support via bundled binaries
- Archive content listing

**`App\Core\LogManager`** — Activity Logging
- `log_activity()` — Write activity logs
- `read_logs()` — Read logs with filtering
- `cleanup_old_logs()` — Remove logs older than X days
- `export_logs()` — Export as JSON/CSV

### Security Features
- **Path Sanitization** — `sanitize_relative_path()` prevents traversal
- **Root Restriction** — `resolve_path()` limits access to storage directory
- **Extension Whitelist** — Only allowed extensions for editing
- **Dangerous Extension Blocking** — Prevents upload of executable files
- **File Size Limits** — Configurable max upload size
- **MIME Validation** — File type verification
- **Input Validation** — All inputs sanitized and validated
- **XSS Prevention** — HTML escaping and sanitization
- **Rate Limiting** — Session-based rate limiting for API calls
- **CSRF Protection** — Token-based request validation
- **Security Audit Logging** — Track security events
- **Security Headers** — HTTP security headers set automatically

---

## 🚀 Performance & Optimization

### Frontend Optimizations
- **Virtual Scrolling** — Renders only visible items (40px row height)
- **Render Optimizer** — Dedicated module for debounced rendering (16ms)
- **Request Cancellation** — AbortController cancels obsolete requests
- **Lazy Loading** — Load files on-demand
- **Event Delegation** — Efficient event handling
- **LocalStorage Cache** — Persist state across sessions

### Backend Optimizations
- **Chunked Uploads** — 5MB chunks for large files
- **Streaming Downloads** — Memory-efficient file delivery
- **Log Rotation** — Prevent log file bloat
- **Efficient Sorting** — Server-side sorting for large directories

### PHP Configuration
```ini
upload_max_filesize = 100M
post_max_size = 100M
max_execution_time = 300
memory_limit = 256M
```

---

## 📱 Responsive & Accessibility

### Responsive Design
- **Mobile (< 640px):** Stacked layout, hidden sidebar, touch-optimized
- **Tablet (640-1024px):** Compact layout, optimized spacing
- **Desktop (1024px+):** Full layout with sidebar

### Accessibility Features
- **Keyboard Navigation:** Full keyboard support with shortcuts overlay
- **ARIA Labels:** Proper accessibility attributes
- **Focus Management:** Visible focus states
- **Screen Reader:** Semantic HTML and labels
- **Color Contrast:** WCAG AA compliant
- **Touch Targets:** 44px minimum on mobile
- **Dedicated CSS:** `accessibility.css` for a11y-specific styles

### Dark Mode
- **Activation:** `data-theme="dark"` attribute
- **Persistence:** LocalStorage saves preference
- **CSS Variables:** All colors via variables
- **Complete Coverage:** All components themed

---

## 🛠️ Setup & Installation

### Requirements
- **PHP:** 7.4 or higher
- **Web Server:** Apache, Nginx, or PHP built-in server
- **Browser:** Modern browser with ES6+ module support
- **Optional:** 7-Zip for multi-format archive extraction (.7z, .rar, .tar.gz)
- **Optional (Dev):** Node.js for linting, testing, and CodeMirror bundle rebuilds

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kyuzan0/Filemanager.git
   cd Filemanager
   ```

2. **Set up web server** (point document root to `public/`)
   ```bash
   # Using PHP built-in server (development)
   php -S localhost:8000 -t public

   # Or configure Apache/Nginx virtual host with document root = public/
   ```

3. **Verify storage directories exist**
   ```bash
   # Storage directories are auto-created, but you can verify:
   ls storage/
   # Should contain: files/, trash/, logs/, temp/
   ```

4. **Install dev dependencies** (optional, for linting/testing)
   ```bash
   npm install          # JS tooling (ESLint, Jest, esbuild)
   composer install     # PHP tooling (PHPUnit, PHP_CodeSniffer)
   ```

5. **Access the application**
   ```
   Open browser: http://localhost:8000
   ```

---

## 🧪 Testing & Quality

### Automated Tests

**JavaScript (Jest):**
```bash
npx jest                    # Run JS tests
npx jest --coverage         # With coverage report
```

**PHP (PHPUnit):**
```bash
./vendor/bin/phpunit        # Run PHP tests
```

### Linting

**JavaScript (ESLint 9):**
```bash
npx eslint public/assets/js/
```

**PHP (PHP_CodeSniffer — PSR-12):**
```bash
./vendor/bin/phpcs app/
```

### Test Coverage
- **Jest:** Configured with 10% coverage threshold (jsdom environment)
- **PHPUnit:** Coverage on `app/Core/` classes

### Build

**Rebuild CodeMirror bundle:**
```bash
npx esbuild build/codemirror-bundle.js --bundle --minify --outfile=public/assets/js/vendor/codemirror.min.js
```

---

## 🌟 Roadmap

### Planned
- [ ] **TypeScript Migration** — Type safety for JavaScript modules
- [ ] **File Thumbnails** — Image previews in file list
- [ ] **File Versioning** — Track file history and rollback
- [ ] **Internationalization (i18n)** — Multi-language support
- [ ] **User Authentication** — Login system and permissions
- [ ] **File Sharing** — Generate shareable links
- [ ] **Full-text Search** — Search file content
- [ ] **Cloud Storage** — S3, Google Drive integration
- [ ] **Service Worker** — Offline support and caching
- [ ] **Docker Support** — Containerized deployment
- [ ] **CI/CD Pipeline** — Automated testing and deployment

### Completed
- [x] **Modular CSS Architecture** — 42-file, 7-layer system
- [x] **Modular JS Architecture** — 40 ES6+ modules
- [x] **Trash System** — Soft delete with restore
- [x] **Activity Logging** — Complete audit trail with export
- [x] **Batch Operations** — Multi-select actions
- [x] **Analytics Module** — Privacy-respecting tracking
- [x] **Security Hardening** — XSS prevention, rate limiting, CSRF
- [x] **Archive Operations** — ZIP/7z/RAR create and extract
- [x] **CodeMirror 6 Editor** — Syntax highlighting for 11 languages
- [x] **Virtual Scrolling** — Performance with large directories
- [x] **Toast Notifications** — Non-blocking user feedback
- [x] **Favorites System** — Bookmark files and folders
- [x] **Client-Side Router** — SPA-like navigation
- [x] **Keyboard Shortcuts** — Full keyboard navigation
- [x] **Dark Mode** — Complete theme system
- [x] **Responsive Design** — Mobile, tablet, desktop
- [x] **Accessibility** — WCAG 2.1 AA compliance
- [x] **Test Suite** — Jest + PHPUnit
- [x] **Linting** — ESLint 9 + PHP_CodeSniffer

---

## 🤝 Contributing

Contributions are welcome!

### Quick Start
1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Follow coding standards** (see below)
4. **Run linters** (`npx eslint .` and `./vendor/bin/phpcs app/`)
5. **Run tests** (`npx jest` and `./vendor/bin/phpunit`)
6. **Commit changes** (`git commit -m 'feat: add amazing feature'`)
7. **Push to branch** (`git push origin feature/amazing-feature`)
8. **Open Pull Request**

### Code Style
| Language | Standard |
|----------|----------|
| CSS | BEM convention (block__element--modifier) |
| JavaScript | ES6+ modules, JSDoc comments, ESLint 9 |
| PHP | PSR-12 (PHP_CodeSniffer), PSR-4 autoloading |

---

## 📄 License

**MIT License**

Copyright (c) 2025 Kyuzan0

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**Built with modern web technologies — vanilla JS, PHP, and zero framework overhead.**
