# Contributing to Filemanager

Thank you for your interest in contributing! This guide will help you get started.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Architecture Overview](#architecture-overview)

---

## Development Setup

### Prerequisites

- **PHP 7.4+** (8.x recommended) with extensions: `pdo_sqlite`, `gd`, `mbstring`, `json`, `session`
- **Node.js 16+** and npm (for JS tooling)
- **Laragon** (recommended) or any PHP development server (Apache/Nginx)
- **Composer** (PHP dependency manager)
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Filemanager.git
cd Filemanager

# Install PHP dependencies
composer install

# Install Node.js dependencies
npm install

# Ensure storage directories exist
# (auto-created on first request, but you can create manually)
mkdir -p storage/{files,trash,logs,temp,thumbnails,database}
```

### Running Locally

**With Laragon:**
1. Place the project in `laragon/www/Filemanager`
2. Start Laragon (Apache + PHP)
3. Open `http://localhost/Filemanager/public/`

**With PHP built-in server:**
```bash
php -S localhost:8000 -t public
```

### Default Login

After first access, the database auto-migrates and creates a default admin user:
- **Username:** `admin`
- **Password:** `admin123`

> Change the default password immediately in production.

---

## Project Structure

```
Filemanager/
├── app/                          # PHP application code (PSR-4: App\)
│   ├── Config/
│   │   └── paths.php             # Directory constants
│   ├── Core/
│   │   ├── Auth.php              # Authentication & RBAC
│   │   ├── Database.php          # SQLite PDO wrapper + migrations
│   │   ├── FileManager.php       # Core file operations
│   │   ├── Security.php          # Input sanitization & validation
│   │   ├── TrashManager.php      # Soft delete system
│   │   ├── LogManager.php        # Activity logging
│   │   └── ArchiveManager.php    # ZIP/7z operations
│   ├── Handlers/                 # API request handlers
│   └── Helpers/
│       └── helpers.php           # json_response(), json_error(), etc.
├── public/                       # Web root
│   ├── api.php                   # API router (35+ endpoints)
│   ├── index.php                 # Main application page
│   ├── login.php                 # Login page
│   ├── share.php                 # Public share access page
│   └── assets/
│       ├── css/
│       │   ├── main.css          # CSS entry point (88+ imports)
│       │   ├── base/             # Variables, reset, typography
│       │   ├── components/       # UI components
│       │   ├── layout/           # App layout, sidebar, header
│       │   ├── overlays/         # Modals, dialogs, context menu
│       │   ├── pages/            # Page-specific styles
│       │   └── utilities/        # Helpers, accessibility
│       ├── js/
│       │   ├── index.js          # JS entry point
│       │   └── modules/          # ES6 modules (40+)
│       │       ├── state.js      # Centralized state management
│       │       ├── apiService.js # API client layer
│       │       ├── appInitializer.js # Main app bootstrap
│       │       ├── constants.js  # DOM refs, config, messages
│       │       ├── ui/           # UI modules (command palette, upload, etc.)
│       │       └── handlers/     # Event handler modules
│       └── lang/                 # i18n translation files
│           ├── id.json           # Indonesian
│           └── en.json           # English
├── storage/                      # Runtime data (gitignored)
│   ├── files/                    # User files root
│   ├── trash/                    # Soft-deleted items
│   ├── thumbnails/               # Generated image thumbnails
│   ├── database/                 # SQLite database
│   ├── logs/                     # Activity logs
│   └── temp/                     # Temporary files (chunked uploads)
├── tests/                        # Test suites
│   ├── *.test.js                 # Jest test files
│   ├── Unit/                     # PHPUnit test files
│   ├── setup.js                  # Jest setup
│   └── bootstrap.php             # PHPUnit bootstrap
├── docs/                         # Documentation
│   └── api/
│       └── openapi.yaml          # OpenAPI 3.1 spec
├── jest.config.js
├── phpunit.xml
├── eslint.config.js
├── composer.json
├── package.json
├── ROADMAP.md
├── CHANGELOG.md
└── CONTRIBUTING.md               # This file
```

---

## Coding Standards

### PHP

- **PSR-4** autoloading (`App\` namespace maps to `app/`)
- **PSR-12** coding style (enforced by PHP_CodeSniffer)
- PHP 7.4 compatible syntax (typed properties, arrow functions, null coalescing)
- Handler functions are procedural (not class methods) for simplicity
- Use `json_response()`, `json_success()`, `json_error()` helpers for API responses
- Sanitize all user input via `sanitize_relative_path()`, `Security::sanitizeFilename()`
- All file paths must be validated with `realpath()` + root boundary check

### JavaScript

- **ES6+ modules** (`import`/`export`) — no CommonJS in frontend code
- **ESLint 9** flat config with these key rules:
  - 4-space indentation
  - Single quotes
  - Semicolons required
  - `prefer-const`, `no-var`
  - `eqeqeq` (strict equality)
  - `curly` (always use braces)
- State management via centralized `state.js` (never store state in DOM)
- API calls go through `apiService.js` (never use `fetch()` directly in UI code)
- Toast notifications via `toast.js` globals (`window.showSuccess()`, etc.)
- Non-module scripts (e.g., `modals-handler.js`) use `window.*` for cross-module communication

### CSS

- **7-layer architecture**: base → layout → components → overlays → pages → utilities
- CSS custom properties (variables) in `base/variables.css`
- Dark mode via `[data-theme="dark"]` selector
- Mobile-first responsive design
- BEM-like naming for new components (e.g., `.upload-modal__header`)
- No CSS frameworks — all custom (Tailwind CDN used only for utility classes in legacy code)

### General

- Indonesian language for user-facing strings (with i18n keys)
- English for code comments, variable names, and documentation
- No external runtime dependencies (vanilla JS, no React/Vue/jQuery)
- Minimize DOM queries — cache in `constants.js` `elements` object

---

## Testing

### Running Tests

```bash
# JavaScript tests (Jest)
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
npm run test:verbose        # Verbose output

# PHP tests (PHPUnit)
php vendor/bin/phpunit      # Run all tests
php vendor/bin/phpunit --filter=AuthTest  # Run specific test class
php vendor/bin/phpunit --coverage-text    # With coverage
```

### Writing Tests

**JavaScript (Jest + jsdom):**
- Place test files in `tests/` with `.test.js` suffix
- Import directly from `../public/assets/js/modules/`
- Mock `constants.js` (it references DOM elements not available in jsdom)
- Use `jest.fn()` for callbacks, `jest.useFakeTimers()` for debounce/throttle
- For non-module scripts (toast.js), use `require()` in `beforeEach` with `jest.resetModules()`

**PHP (PHPUnit 9.6):**
- Place test files in `tests/Unit/` with `Test.php` suffix
- Extend `PHPUnit\Framework\TestCase`
- Use `uniqid()` suffixes for test data to avoid conflicts
- Clean up test data in `tearDown()` — don't leave test users/files behind
- Use `markTestSkipped()` for platform-specific tests (e.g., Windows path issues)

### Current Coverage

- **JS**: 215 tests across 5 suites (state, utils, storage, toast, pagination)
- **PHP**: 119 tests across 5 suites (Security, FileManager, Database, Auth, TrashManager)
- **Target**: 60%+ code coverage

---

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`
2. **Follow** the coding standards described above
3. **Write tests** for new functionality
4. **Run** the full test suite and ensure all tests pass:
   ```bash
   npm test
   php vendor/bin/phpunit
   ```
5. **Run** the linter:
   ```bash
   npm run lint
   ```
6. **Update** `CHANGELOG.md` with your changes under `[Unreleased]`
7. **Update** `ROADMAP.md` if your change completes a roadmap item
8. **Submit** a pull request with:
   - Clear title describing the change
   - Description of what was changed and why
   - Screenshots for UI changes
   - Reference to any related issues

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add bulk rename tool with find/replace and numbering modes
fix: context menu positioning outside viewport bounds
docs: add OpenAPI spec for all API endpoints
test: add Auth.php unit tests for RBAC and folder permissions
refactor: extract skeleton renderer into separate module
style: fix ESLint indent warnings in modals-handler.js
```

---

## Architecture Overview

### Request Flow

```
Browser → public/index.php (HTML) → assets/js/index.js → appInitializer.js
                                                              ↓
                                                    initializeApp()
                                                    ├── initAuth()
                                                    ├── setupEventHandlers()
                                                    ├── initUploadManager()
                                                    ├── initCommandPalette()
                                                    ├── initUndoManager()
                                                    ├── initContentSearch()
                                                    ├── initDualPane()
                                                    └── fetchDirectoryWrapper()
                                                              ↓
                                                    apiService.js → fetch()
                                                              ↓
                                              public/api.php → route_request()
                                                              ↓
                                              app/Handlers/*Handler.php
                                                              ↓
                                              app/Core/*.php (business logic)
```

### State Management

All application state lives in `state.js`. Components read state via imports and update via `updateState()`. The `optimisticUpdate()` function enables instant UI feedback with rollback capability.

### API Pattern

All API calls go through `api.php?action=<action>&path=<path>`. The router dispatches to handler functions. Handlers validate input, call Core classes, and return JSON via `json_success()` or `json_error()`.

### Database

SQLite database at `storage/database/filemanager.sqlite`. Auto-created and migrated on first request. Schema managed via numbered migrations in `Database.php`.
