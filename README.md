# File Manager — Modern Web-Based File Management System

**Version:** 3.1 (Modular API Architecture)
**Date:** December 9, 2025
**Status:** ✅ Production Ready

📚 **[Documentation](docs/README.md)** | 📖 **[API Reference](docs/API.md)** | 🏗️ **[Architecture](docs/ARCHITECTURE.md)** | 📋 **[Requirements](REQUIREMENTS.md)** | 🤝 **[Contributing](docs/CONTRIBUTING.md)**

---

## 🎯 Overview

A modern, full-featured web-based file manager built with vanilla JavaScript and PHP. Features include file browsing, upload/download, drag & drop, virtual scrolling, dark mode, trash system, activity logging, analytics, security hardening, and comprehensive file operations.

---

## 🏗️ Arsitektur

### Frontend
- **Architecture:** Modular ES6+ JavaScript (Vanilla JS)
- **CSS System:** 30-module modular CSS architecture (6-layer design)
- **State Management:** Centralized state with pubsub pattern
- **UI Framework:** Tailwind CSS (via CDN) + Custom modular CSS
- **Icons:** RemixIcon CDN

### Backend
- **Language:** PHP 7.4+
- **Architecture:** Procedural with library abstraction
- **API:** RESTful JSON endpoints
- **File Operations:** Chunked uploads, sanitized paths, security validation

### Communication
- **Protocol:** HTTP REST with JSON
- **Request Handling:** Fetch API with AbortController
- **Error Handling:** Structured error responses with proper HTTP codes

---

## 💻 Tech Stack

### Core Technologies
- **JavaScript:** ES6+ modules, async/await, Promises
- **HTML5:** Semantic markup, accessibility features
- **CSS3:** Modular architecture (30 files), CSS variables, dark mode
- **PHP:** 7.4+ with modern file handling
- **Tailwind CSS:** CDN-based for rapid development

### No External Dependencies
- ✅ Zero JavaScript frameworks or libraries
- ✅ Vanilla JS for maximum performance
- ✅ Native browser APIs (Fetch, File, Clipboard, etc.)
- ✅ Lightweight footprint (~100KB total JS)

---

## 📁 Struktur Proyek

```
Filemanager/
├── index.php              # Main HTML entry point
├── api.php                # RESTful API endpoint router
│
├── assets/
│   ├── css/               # 🎨 Modular CSS (30 files)
│   │   ├── main.css       # CSS orchestration (31 imports)
│   │   ├── core/          # Variables, reset, base (3 files)
│   │   ├── layout/        # App shell, sidebar, topbar (4 files)
│   │   ├── components/    # Buttons, cards, forms, tables (10 files)
│   │   ├── overlays/      # Modal-specific styles (9 files)
│   │   ├── themes/        # Dark mode system (1 file)
│   │   ├── utilities/     # Animations, helpers, responsive (3 files)
│   │   └── style.css.backup # Original CSS backup
│   │
│   └── js/                # 📜 JavaScript modules
│       ├── index.js       # Application entry point
│       ├── modules/       # 15 modular components
│       │   ├── appInitializer.js    # App initialization
│       │   ├── apiService.js        # HTTP/API layer
│       │   ├── fileOperations.js    # File business logic
│       │   ├── uiRenderer.js        # DOM rendering + virtual scroll
│       │   ├── state.js             # State management
│       │   ├── eventHandlers.js     # Event binding
│       │   ├── dragDrop.js          # Drag & drop
│       │   ├── modals.js            # Modal management
│       │   ├── logManager.js        # Activity logging
│       │   ├── storage.js           # LocalStorage persistence
│       │   ├── utils.js             # Utility functions
│       │   ├── constants.js         # Config & constants
│       │   ├── debug.js             # Debug helpers
│       │   ├── fileIcons.js         # Icon mapping
│       │   └── moveOverlay.js       # Move dialog
│       │
│       ├── enhanced-ui.js    # Legacy compatibility layer
│       ├── modals-handler.js # Legacy modal handler
│       └── log-handler.js    # Legacy log handler
│

├── lib/                   # 🔧 PHP Backend Library
│   ├── file_manager.php   # Core file operations + Security
│   ├── trash_manager.php  # Trash system operations
│   ├── archive_manager.php # ZIP/7z/RAR archive handling
│   ├── log_manager.php    # Activity logging system
│   │
│   └── handlers/          # 📦 API Request Handlers (Modular)
│       ├── helpers.php        # Common utility functions
│       ├── raw_handler.php    # Raw file streaming (media preview)
│       ├── system_handler.php # System requirements & 7-zip status
│       ├── logs_handler.php   # Activity logs operations
│       ├── trash_handler.php  # Trash bin operations
│       ├── file_handler.php   # File/folder CRUD operations
│       └── archive_handler.php # Compression/extraction
│
├── bin/                   # 📦 Bundled Binaries
│   ├── windows/           # Windows 7-Zip (7z.exe + 7z.dll)
│   ├── linux/             # Linux p7zip (7za)
│   ├── setup-7zip.php     # Auto-setup script
│   └── README.md          # Binary setup documentation
│
├── partials/              # 📄 HTML Partials
│   ├── table.php          # File table structure
│   ├── overlays.php       # Modal dialogs (no inline CSS)
│   └── action-bar.php     # Action buttons
│
├── file/                  # 📂 User file storage directory
├── logs/                  # 📊 Activity logs (JSON)
│   └── activity.json      # Activity log storage
├── .trash/                # 🗑️ Trash storage (soft delete)
│
├── docs/                  # 📚 Comprehensive Documentation
│   ├── README.md          # Quick start & feature overview (NEW)
│   ├── ARCHITECTURE.md    # System architecture guide (NEW)
│   ├── API.md             # Complete API reference (NEW)
│   ├── CONTRIBUTING.md    # Developer contribution guide (NEW)
│   └── [legacy docs...]   # Previous documentation files
│
└── CHANGELOG.md           # 📝 Version history (NEW)
```


---

## ✨ Features

### Core File Operations
| Feature | Description |
|---------|-------------|
| 📁 **Browse & Navigate** | Breadcrumb navigation, folder traversal |
| ➕ **Create** | New files and folders with validation |
| ✏️ **Rename** | In-place renaming with conflict detection |
| 📦 **Move** | Drag & drop or dialog-based file moving |
| 🗑️ **Delete** | Soft delete with trash system |
| 📤 **Upload Files** | Chunked uploads (5MB chunks) for large files |
| 📂 **Upload Folders** | Upload entire folder with subfolder structure |
| 📥 **Download** | Direct file downloads |
| 👁️ **Preview** | Text, image, video, audio, PDF preview |
| ✏️ **Edit** | Built-in code editor with syntax highlighting |

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

## 🎨 CSS Architecture (Modular System)

### 6-Layer Architecture

**Completed:** November 25, 2025 (Phase 1-10, 100%)

```
Layer 1: CORE (Foundation)
├── variables.css - CSS custom properties (light/dark themes)
├── reset.css     - CSS reset & normalization
└── base.css      - Base element styling

Layer 2: LAYOUT (Structure)
├── app.css       - App container & main wrapper
├── sidebar.css   - Sidebar navigation
├── topbar.css    - Header/top navigation
└── footer.css    - Footer area

Layer 3: COMPONENTS (UI Elements)
├── buttons.css       - Button styles & variants
├── cards.css         - Card containers
├── tables.css        - Data table styling
├── forms.css         - Form inputs & controls
├── modals.css        - Modal dialogs
├── badges.css        - Badge components
├── icons.css         - Icon styling
├── context-menu.css  - Right-click menu
├── loader.css        - Loading indicators
└── navigation.css    - Breadcrumb navigation

Layer 4: OVERLAYS (Modal Content)
├── create.css        - Create file/folder modal
├── preview.css       - File preview modal
├── confirm.css       - Confirmation dialogs
├── rename.css        - Rename modal
├── unsaved.css       - Unsaved changes modal
├── move.css          - Move/relocate modal
├── log.css           - Activity log viewer
├── settings.css      - Settings dialog
└── context-menu.css  - Context menu overlay

Layer 5: THEMES (Theming System)
└── dark.css - Dark mode with 50+ overrides

Layer 6: UTILITIES (Helpers & Responsive)
├── animations.css - 8 @keyframes + animation utilities
├── helpers.css    - Utility classes (display, flex, spacing, etc.)
└── responsive.css - All media queries & breakpoints
```

### CSS Metrics
- **Total Files:** 30 modular CSS files + 1 orchestration
- **Main Entry:** `main.css` (69 lines, 31 @imports)
- **Original:** 3,404 lines monolithic → Now organized into layers
- **Inline CSS:** 0 (100% removed from PHP files)
- **Dark Mode:** Consolidated theme system
- **Visual Regressions:** 0 (100% backward compatible)

### Design System
- **CSS Variables:** Light/dark theme with semantic naming
- **Responsive:** Mobile-first (640px, 768px, 1024px, 1280px)
- **Animations:** 8 keyframes (spin, pulse, fade, slide, bounce, shake)
- **Naming:** BEM convention (block__element--modifier)

**Documentation:** See `docs/CSS_ARCHITECTURE.md` for complete details

---

## 📜 JavaScript Architecture (Modular ES6+)

### Frontend Modules (15 Files)

**Main Entry Point:**
- `index.js` - Application initialization and error handling

**Core Modules:**
- `appInitializer.js` - App setup, DOM binding, initial load
- `state.js` - Centralized state management with pubsub
- `apiService.js` - HTTP layer with AbortController
- `fileOperations.js` - Business logic for all file operations
- `uiRenderer.js` - DOM rendering, virtual scrolling, item display

**UI Modules:**
- `eventHandlers.js` - Event binding and delegation
- `modals.js` - Modal lifecycle management
- `dragDrop.js` - Drag & drop with visual feedback
- `moveOverlay.js` - File move dialog
- `logManager.js` - Activity log viewer with filters

**Utility Modules:**
- `utils.js` - Helper functions (format dates, sizes, etc.)
- `storage.js` - LocalStorage abstraction
- `constants.js` - Configuration and constants
- `fileIcons.js` - File type to icon mapping
- `debug.js` - Debug utilities and logging

### JavaScript Metrics
- **Total Modules:** 15 ES6 modules
- **Total Lines:** ~4,500 lines of well-documented code
- **Architecture:** Modular with clear separation of concerns
- **Dependencies:** Zero external libraries
- **Bundle Size:** ~100KB (unminified)

### Key Patterns
- **State Management:** Centralized with pubsub notifications
- **API Communication:** Promise-based with proper error handling
- **UI Updates:** Optimistic updates with server reconciliation
- **Performance:** Virtual scrolling, debouncing, request cancellation
- **Code Quality:** JSDoc comments, consistent naming, error handling

---

## 🔧 Backend (PHP)

### Architecture

The backend uses a **modular handler architecture** where `api.php` acts as a lightweight router that delegates requests to specialized handler modules:

```
api.php (Router)
    ↓
lib/handlers/
├── file_handler.php     → File/folder CRUD operations
├── trash_handler.php    → Trash bin operations  
├── logs_handler.php     → Activity log operations
├── archive_handler.php  → Compress/extract operations
├── system_handler.php   → System info & requirements
├── raw_handler.php      → Media streaming
└── helpers.php          → Shared utilities
```

### API Endpoints (`api.php`)

**File Management:**
```php
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
```php
POST api.php?action=compress            # Create ZIP archive
POST api.php?action=extract             # Extract archive
GET  api.php?action=zip-contents&path=...  # List archive contents
```

**Trash Operations:**
```php
GET  api.php?action=trash-list          # List trash items
POST api.php?action=trash-restore       # Restore from trash
POST api.php?action=trash-delete        # Permanently delete
POST api.php?action=trash-empty         # Empty trash
POST api.php?action=trash-cleanup       # Cleanup old items
```

**Logs & System:**
```php
GET  api.php?action=logs                # Get activity logs
POST api.php?action=logs-cleanup        # Cleanup old logs
GET  api.php?action=logs-export         # Export logs (JSON/CSV)
GET  api.php?action=system-requirements # Check system requirements
GET  api.php?action=7zip-status         # Check 7-Zip availability
```

### Folder Upload Parameters

When uploading folders, include these additional POST parameters:
- `folderUpload=true` - Flag to indicate folder upload mode
- `relativePaths` - JSON array of relative paths (from `webkitRelativePath`)
- `files[]` - Array of files to upload

The backend automatically creates subfolder structure based on relative paths.

### Core Libraries

**`lib/file_manager.php`** - File Operations
- `list_directory()` - List files with metadata
- `create_item()` - Create files/folders
- `rename_item()` - Rename with validation
- `move_item()` - Move files/folders
- `delete_item()` - Delete with recursion
- `handle_upload()` - Chunked upload processing
- `upload_files_with_folders()` - Upload with folder structure preservation
- `read_text_file()` - Read editable files
- `save_text_file()` - Save with backup
- `sanitize_relative_path()` - Path sanitization
- `resolve_path()` - Prevent directory traversal

**`lib/logger.php`** - Activity Logging
- `log_activity()` - Write activity logs
- `read_logs()` - Read logs with filtering
- `filter_logs()` - Filter by action, date, user
- `cleanup_old_logs()` - Remove logs older than X days
- `rotate_logs()` - Log file rotation
- `export_logs()` - Export as JSON/CSV

### Security Features
- ✅ **Path Sanitization** - `sanitize_relative_path()` prevents traversal
- ✅ **Root Restriction** - `resolve_path()` limits access to `file/` directory
- ✅ **Extension Whitelist** - Only allowed extensions for editing
- ✅ **Dangerous Extension Blocking** - Prevents upload of executable files
- ✅ **File Size Limits** - Configurable max upload size by file type
- ✅ **MIME Validation** - File type verification
- ✅ **Input Validation** - All inputs sanitized and validated
- ✅ **XSS Prevention** - HTML escaping and sanitization
- ✅ **Rate Limiting** - Session-based rate limiting for API calls
- ✅ **CSRF Protection** - Token-based request validation
- ✅ **Security Audit Logging** - Track security events
- ✅ **Error Handling** - Proper HTTP status codes and error messages

---

## 🚀 Performance & Optimization

### Frontend Optimizations
- **Virtual Scrolling** - Renders only visible items (40px row height)
- **Debounced Rendering** - 16ms debounce for smooth updates
- **Request Cancellation** - AbortController cancels obsolete requests
- **Lazy Loading** - Load files on-demand
- **Event Delegation** - Efficient event handling
- **LocalStorage Cache** - Persist state across sessions

### Backend Optimizations
- **Chunked Uploads** - 5MB chunks for large files
- **Streaming Downloads** - Memory-efficient file delivery
- **File Metadata Cache** - Avoid redundant stat() calls
- **Log Rotation** - Prevent log file bloat
- **Efficient Sorting** - Server-side sorting for large directories

### Load Performance
- **First Paint:** < 1s
- **Interactive:** < 1.5s
- **Bundle Size:** ~100KB JS + ~20KB CSS (gzipped)
- **HTTP Requests:** Minimal (CDN + local assets)

---

## 🎯 Keamanan & Validasi

### Path Security
```php
// Prevent directory traversal
$sanitized = sanitize_relative_path($userInput);
$resolved = resolve_path($root, $sanitized);
// Result: Limited to $root directory only
```

### File Validation
- **Extension Whitelist:** Only `.txt`, `.md`, `.json`, `.csv`, `.html`, `.css`, `.js`, `.php` editable
- **MIME Type Check:** Server-side MIME validation
- **Size Limits:** Configurable max file size (default: 50MB)
- **Filename Sanitization:** Remove dangerous characters

### Input Sanitization
- **Path Inputs:** `sanitize_relative_path()` + `resolve_path()`
- **File Names:** Special character filtering
- **JSON Payloads:** `json_decode()` with error handling
- **SQL-Free:** No database = no SQL injection risk

---

## 📱 Responsive & Accessibility

### Responsive Design
- **Mobile (< 640px):** Stacked layout, hidden sidebar, touch-optimized
- **Tablet (640-1024px):** Compact layout, optimized spacing
- **Desktop (1024px+):** Full layout with sidebar

### Accessibility Features
- **Keyboard Navigation:** Full keyboard support
- **ARIA Labels:** Proper accessibility attributes
- **Focus Management:** Visible focus states
- **Screen Reader:** Semantic HTML and labels
- **Color Contrast:** WCAG AA compliant
- **Touch Targets:** 44px minimum on mobile

### Dark Mode
- **Activation:** `data-theme="dark"` attribute
- **Persistence:** LocalStorage saves preference
- **CSS Variables:** All colors via variables
- **Complete Coverage:** All components themed

---

## 📚 Documentation

### Quick Start
| Document | Description |
|----------|-------------|
| 📚 **[docs/README.md](docs/README.md)** | Quick start guide and feature overview |
| 🏗️ **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | System architecture and design patterns |
| 📖 **[docs/API.md](docs/API.md)** | Complete API reference with examples |
| 📋 **[REQUIREMENTS.md](REQUIREMENTS.md)** | System requirements and dependencies |
| 🤝 **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** | Developer contribution guidelines |
| 📝 **[CHANGELOG.md](CHANGELOG.md)** | Version history and release notes |

### Legacy Documentation
| Document | Description |
|----------|-------------|
| [DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) | Navigation guide |
| [CSS_ARCHITECTURE.md](docs/CSS_ARCHITECTURE.md) | 6-layer CSS system |
| [BUILD_GUIDE.md](docs/BUILD_GUIDE.md) | Development workflow |
| [NAMING_CONVENTIONS.md](docs/NAMING_CONVENTIONS.md) | BEM standards |
| [COMPONENT_CATALOG.md](docs/COMPONENT_CATALOG.md) | Component reference |

---

## 🛠️ Setup & Installation

### Requirements

> 📋 **See [REQUIREMENTS.md](REQUIREMENTS.md) for detailed system requirements**

- **PHP:** 7.4 or higher
- **Web Server:** Apache, Nginx, or PHP built-in server
- **Browser:** Modern browser with ES6+ support
- **Optional:** 7-Zip for multi-format archive extraction (.7z, .rar, .tar.gz)

### Installation

1. **Clone or download the repository**
   ```bash
   git clone https://github.com/Kyuzan0/Filemanager.git
   cd Filemanager
   ```

2. **Set up web server**
   ```bash
   # Using PHP built-in server (development)
   php -S localhost:8000
   
   # Or configure Apache/Nginx virtual host
   ```

3. **Create file directory**
   ```bash
   mkdir -p file logs
   chmod 755 file logs
   ```

4. **Access the application**
   ```
   Open browser: http://localhost:8000
   ```

### Configuration

**File Permissions:**
```bash
chmod 755 file/          # User file storage
chmod 755 logs/          # Activity logs
chmod 644 api.php        # API endpoint
chmod 644 index.php      # Main page
```

**PHP Settings** (optional optimization):
```ini
upload_max_filesize = 50M
post_max_size = 50M
max_execution_time = 300
memory_limit = 256M
```

---

## 🧪 Testing & Quality Assurance

### Automated Testing
- ✅ HTTP 200 OK verification
- ✅ All CSS files load correctly
- ✅ No console errors
- ✅ Dark mode toggle functional
- ✅ Responsive breakpoints verified

### Manual Testing Checklist
- [x] File upload (small & large files)
- [x] File download
- [x] Create files/folders
- [x] Rename operations
- [x] Move operations (drag & drop + dialog)
- [x] Delete operations
- [x] File preview (text & media)
- [x] Context menu
- [x] Keyboard navigation
- [x] Mobile responsiveness
- [x] Dark mode toggle
- [x] Activity logging
- [x] Virtual scrolling performance

### Quality Metrics
- **Visual Regressions:** 0
- **Feature Loss:** 0
- **Console Errors:** 0
- **404 Errors:** 0
- **Accessibility:** WCAG AA compliant
- **Performance:** < 1.5s interactive time

---

## 🔄 Development Workflow

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

## 🔄 Development Workflow

### CSS Development
```bash
# Edit any CSS module in assets/css/
# Changes are automatically available via main.css
# No build step required for development
```

### JavaScript Development
```bash
# Edit modules in assets/js/modules/
# ES6 imports automatically resolve
# Browser must support ES6 modules
```

### Testing
```bash
# Open in browser
# Check console for errors
# Test all features manually
# Verify dark mode toggle
# Test responsive breakpoints
```

### Deployment
```bash
# 1. Upload all files to server
# 2. Set file/logs/ permissions (755)
# 3. Verify PHP version (7.4+)
# 4. Test access in browser
# 5. Monitor logs/ directory
```

---

## 📖 Tailwind CSS Integration

### Current Setup (CDN)
```html
<!-- In index.php -->
<script src="https://cdn.tailwindcss.com"></script>
```

**Pros:**
- Zero build step required
- Instant development workflow
- No dependencies to manage
- Easy setup for beginners

**Cons:**
- Larger bundle size
- No PurgeCSS optimization
- Limited customization

### Production Build (Recommended)

**If you want optimized production build:**

1. **Install Tailwind**
   ```bash
   npm install -D tailwindcss
   npx tailwindcss init
   ```

2. **Configure `tailwind.config.js`**
   ```javascript
   module.exports = {
     content: ["./**/*.{html,js,php}"],
     theme: { extend: {} },
     plugins: [],
     darkMode: 'class',
   }
   ```

3. **Create input CSS**
   ```css
   /* assets/css/tailwind-input.css */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

4. **Build command**
   ```bash
   npx tailwindcss -i ./assets/css/tailwind-input.css \
                   -o ./assets/css/tailwind.css \
                   --minify --watch
   ```

5. **Update index.php**
   ```html
   <!-- Replace CDN with: -->
   <link rel="stylesheet" href="assets/css/tailwind.css">
   ```

**Result:** Bundle size reduction from ~3MB (CDN) to ~50KB (purged)

---

## 🎯 Project Structure Details

### Main Files
```
Filemanager/
├── index.php              # Main HTML page (uses main.css)
├── api.php                # REST API router
├── tailwind.config.js     # Tailwind configuration (optional)
└── Readme.md              # This file
```

### Assets
```
assets/
├── css/
│   ├── main.css           # CSS entry point (69 lines, 31 imports)
│   ├── core/              # Foundation (variables, reset, base)
│   ├── layout/            # Structure (app, sidebar, topbar, footer)
│   ├── components/        # UI elements (10 files)
│   ├── overlays/          # Modals (9 files)
│   ├── themes/            # Dark mode
│   ├── utilities/         # Helpers & responsive
│   ├── archive/           # Version backups (empty)
│   └── style.css.backup   # Original monolithic CSS (preserved)
│
└── js/
    ├── index.js           # Entry point
    ├── modules/           # 15 ES6 modules
    ├── enhanced-ui.js     # Legacy compatibility
    ├── log-handler.js     # Legacy log viewer
    └── modals-handler.js  # Legacy modal handler
```

### Backend
```
lib/
├── file_manager.php       # File operations, sanitization, upload
├── trash_manager.php      # Trash system operations
├── archive_manager.php    # ZIP/7z/RAR archive handling
├── log_manager.php        # Activity logging system
│
└── handlers/              # API Request Handlers (Modular)
    ├── helpers.php        # Common utility functions (JSON parsing, responses)
    ├── raw_handler.php    # Raw file streaming for media preview
    ├── system_handler.php # System requirements & 7-zip status
    ├── logs_handler.php   # Activity logs (list, cleanup, export)
    ├── trash_handler.php  # Trash operations (list, restore, delete, empty)
    ├── file_handler.php   # File/folder CRUD (create, upload, save, delete, rename, move, list)
    └── archive_handler.php # Compression/extraction operations
```

### Data
```
file/                      # User file storage (uploaded files here)
logs/                      # Activity logs (JSON format)
partials/                  # HTML partials (no inline CSS)
```

### Documentation
```
docs/
├── DOCUMENTATION_INDEX.md              # Start here
├── PROJECT_COMPLETE_SUMMARY.md         # Executive summary
├── CSS_ARCHITECTURE.md                 # CSS system details
├── BUILD_GUIDE.md                      # Development guide
├── NAMING_CONVENTIONS.md               # BEM standards
├── COMPONENT_CATALOG.md                # Component reference
├── MIGRATION_GUIDE.md                  # Migration steps
├── CSS_MODULARIZATION_TRACKER.md       # Project history
└── PHASE_9_VERIFICATION_REPORT.md      # Testing results
```

---

## 🌟 Future Enhancements (Roadmap)

### Planned Features
- [ ] **Unit Testing** - Add Jest/PHPUnit test coverage
- [ ] **TypeScript Migration** - Type safety for JavaScript modules
- [ ] **File Thumbnails** - Image previews in file list
- [ ] **File Versioning** - Track file history and rollback
- [ ] **Internationalization (i18n)** - Multi-language support
- [ ] **User Authentication** - Login system and permissions
- [ ] **File Sharing** - Generate shareable links
- [ ] **Full-text Search** - Search file content
- [ ] **Compression** - Zip/unzip files
- [ ] **Cloud Storage** - S3, Google Drive integration

### Performance Improvements
- [ ] **Service Worker** - Offline support and caching
- [ ] **Code Splitting** - Dynamic module imports
- [ ] **Image Optimization** - WebP conversion
- [ ] **CDN Integration** - Asset delivery optimization

### DevOps
- [ ] **Docker Support** - Containerized deployment
- [ ] **CI/CD Pipeline** - Automated testing and deployment
- [ ] **Monitoring** - Error tracking integration
- [ ] **Backup System** - Automated file backups

### Recently Completed ✅
- [x] **Trash System** - Soft delete with restore (Phase 3)
- [x] **Activity Logging** - Complete audit trail (Phase 3)
- [x] **Batch Operations** - Multi-select actions (Phase 3)
- [x] **Documentation** - Comprehensive docs (Phase 4)
- [x] **Analytics Module** - Privacy-respecting tracking (Phase 4)
- [x] **Security Module** - XSS prevention, validation (Phase 4)
- [x] **Rate Limiting** - API abuse prevention (Phase 4)

---

## 🤝 Contributing

Contributions are welcome! See **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** for detailed guidelines.

### Quick Start
1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Follow coding standards** (see CONTRIBUTING.md)
4. **Test thoroughly** (manual testing checklist)
5. **Commit changes** (`git commit -m 'feat: add amazing feature'`)
6. **Push to branch** (`git push origin feature/amazing-feature`)
7. **Open Pull Request**

### Code Style
| Language | Standard |
|----------|----------|
| CSS | BEM convention, see `docs/NAMING_CONVENTIONS.md` |
| JavaScript | ES6+ with JSDoc comments |
| PHP | PSR-12 coding standards |

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

## 📞 Contact & Support

- **Author:** Kyuzan0
- **Repository:** [https://github.com/Kyuzan0/Filemanager](https://github.com/Kyuzan0/Filemanager)
- **Issues:** Report bugs via GitHub Issues
- **Documentation:** See `docs/DOCUMENTATION_INDEX.md`

---

## 🎉 Credits & Acknowledgments

### Technologies Used
- **Tailwind CSS** - Utility-first CSS framework
- **RemixIcon** - Open-source icon library
- **PHP** - Server-side scripting
- **Modern JavaScript (ES6+)** - Frontend architecture

### Project History
- **Version 1.0** - Monolithic CSS (3,404 lines)
- **Version 2.0** - Modular CSS architecture (30 files, 6 layers)
  - Completed: November 25, 2025
  - 10-phase modularization project
  - 100% backward compatible
- **Version 2.1** - Folder upload support
  - Completed: December 5, 2025
  - Chunked uploads with folder structure preservation
- **Version 3.0** - Phase 4 Complete (Current)
  - Completed: December 6, 2025
  - Trash system with restore
  - Activity logging with export
  - Comprehensive documentation
  - Analytics module (privacy-respecting)
  - Security hardening

### Special Thanks
- All contributors and testers
- Open-source community for tools and libraries

---

**Built with ❤️ using modern web technologies**

