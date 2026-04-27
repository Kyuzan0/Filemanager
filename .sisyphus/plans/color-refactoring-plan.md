# Color Refactoring Plan — Filemanager

## Objective

Replace ~1,450+ hardcoded color values across CSS (30+ files), JS (20 files), and PHP (3 files) with CSS custom properties from `core/variables.css`. Eliminate `[data-theme="dark"]` override blocks that exist solely to re-hardcode colors. Preserve exact visual appearance.

---

## Current State

### Existing Variable System (`public/assets/css/core/variables.css`)

102 custom properties, dual theme (`:root` light + `[data-theme="dark"]`).

**Available tokens:**
- Backgrounds: `--bg`, `--bg-secondary`
- Components: `--card`, `--card-border`
- Text: `--text`, `--text-secondary`, `--muted`
- Accent: `--accent`, `--accent-rgb`, `--accent-light`, `--accent-light-rgb`, `--accent-hover`, `--accent-hover-rgb`, `--accent-bg`
- Status: `--danger`, `--warning`, `--success` (each with `-bg` and `-border` variants)
- Info: `--info-bg`, `--info-border`
- Surfaces: `--surface-hover`, `--surface-active`, `--surface-overlay`, `--surface-overlay-light`
- Borders: `--border`, `--border-light`, `--border-focus`
- Glass: `--glass`, `--glass-light`
- Shadows: `--shadow-sm`, `--shadow`, `--shadow-lg`
- Focus: `--focus-ring`
- Radius: `--radius`, `--radius-sm`, `--radius-lg`
- Transitions: `--transition`, `--transition-slow`
- Z-index: `--z-dropdown` through `--z-toast`

### What's Missing (Needs Adding)

The current variable set lacks tokens for:
1. **File-type icon colors** — 20+ category pairs (bg + foreground) used in `tableRenderer.js` and `fileIcons.js`
2. **Log action badge colors** — 6 action types × 2 (bg + text) used in `log.css`
3. **CodeMirror syntax colors** — 14 token types × 2 themes
4. **Brand/language colors** — 70+ entries in `fileIcons.js` (JS=#F7DF1E, TS=#3178C6, etc.)
5. **Additional semantic grays** — intermediate shades between existing tokens

---

## Strategy

### Guiding Principles

1. **Zero visual regression** — every replacement must produce the exact same rendered color
2. **Semantic naming** — variables describe purpose, not color value
3. **Minimal new variables** — reuse existing tokens wherever possible; only add what's truly needed
4. **Theme-aware by default** — new variables must have both light and dark values
5. **CSS-first** — JS should read from CSS variables via `getComputedStyle()`, not define its own colors
6. **Incremental** — each phase is independently shippable and testable

### Color Mapping Strategy

For hardcoded values, map to existing variables using this priority:
1. **Exact match** → direct replacement (e.g., `#f0ebe4` → `var(--bg)`)
2. **Close semantic match** → use nearest existing variable (e.g., any light gray background → `var(--bg-secondary)`)
3. **No match exists** → add new variable to `variables.css` with both light/dark values

---

## Phase 1: Extend Variable System

**File:** `public/assets/css/core/variables.css`

### 1A. Add File-Type Icon Color Variables

These replace the hardcoded pairs in `tableRenderer.js` `getIconColors()` and map to CSS classes.

```css
/* File Type Icon Colors */
--icon-folder-bg: #fef3c7;
--icon-folder: #f59e0b;
--icon-image-bg: #fee2e2;
--icon-image: #dc2626;
--icon-pdf-bg: #fecaca;
--icon-pdf: #ea580c;
--icon-doc-bg: #dbeafe;
--icon-doc: #0284c7;
--icon-spreadsheet-bg: #dcfce7;
--icon-spreadsheet: #16a34a;
--icon-code-bg: #fef08a;
--icon-code: #ca8a04;
--icon-archive-bg: #f3e8ff;
--icon-archive: #7c3aed;
--icon-video-bg: #fce7f3;
--icon-video: #db2777;
--icon-audio-bg: #e0e7ff;
--icon-audio: #4f46e5;
--icon-font-bg: #f1f5f9;
--icon-font: #475569;
--icon-data-bg: #ccfbf1;
--icon-data: #0d9488;
--icon-config-bg: #f5f5f4;
--icon-config: #78716c;
--icon-default-bg: #f3f4f6;
--icon-default: #6b7280;
```

Dark mode variants (softer, lower contrast):
```css
[data-theme="dark"] {
  --icon-folder-bg: rgba(245, 158, 11, 0.15);
  --icon-folder: #fbbf24;
  /* ... pattern for all types ... */
}
```

### 1B. Add Log Action Badge Variables

```css
/* Log Action Badges */
--badge-create-bg: var(--success-bg);
--badge-create: var(--success);
--badge-delete-bg: var(--danger-bg);
--badge-delete: var(--danger);
--badge-move-bg: var(--info-bg);
--badge-move: var(--accent);
--badge-rename-bg: var(--warning-bg);
--badge-rename: var(--warning);
--badge-upload-bg: #f3e8ff;
--badge-upload: #7c3aed;
--badge-download-bg: #e0e7ff;
--badge-download: #4f46e5;
```

### 1C. Add CodeMirror Syntax Variables

```css
/* Code Editor Syntax */
--syntax-keyword: #9333ea;
--syntax-string: #16a34a;
--syntax-number: #ea580c;
--syntax-comment: #9ca3af;
--syntax-variable: #4a3f35;
--syntax-function: #0284c7;
--syntax-type: #0891b2;
--syntax-operator: #c98a7a;
--syntax-tag: #dc2626;
--syntax-attribute: #d97706;
--syntax-property: #7c3aed;
--syntax-constant: #b08968;
--syntax-regexp: #be185d;
--syntax-punctuation: #6d5f52;
--syntax-definition: #0369a1;

/* Code Editor Chrome */
--editor-bg: var(--card);
--editor-gutter: var(--bg-secondary);
--editor-selection: rgba(var(--accent-rgb), 0.2);
--editor-cursor: var(--text);
--editor-active-line: var(--surface-hover);
--editor-line-number: var(--muted);
```

### 1D. Add Missing Utility Variables

```css
/* Additional surfaces */
--bg-tertiary: #e0d8cc;        /* Third-level background */
--text-inverse: #ffffff;        /* White text on dark backgrounds */
--text-on-accent: #ffffff;      /* Text on accent-colored backgrounds */

/* Scrollbar */
--scrollbar-track: var(--bg-secondary);
--scrollbar-thumb: var(--border);
--scrollbar-thumb-hover: var(--muted);
```

**Verification:** After adding variables, run the app and confirm no visual change (variables are only defined, not yet consumed).

---

## Phase 2: CSS Overlay Files (Highest Impact)

**Target files** (ordered by instance count):
1. `overlays/log.css` (~100+ instances)
2. `overlays/preview.css` (~80+ instances)
3. `overlays/move.css` (~50+ instances)
4. `overlays/delete.css` (~40+ instances)
5. `overlays/details.css` (~40+ instances)
6. `overlays/download.css` (~40+ instances)
7. `overlays/rename.css` (~30+ instances)

### Approach per file:

1. **Map each hardcoded color** to the nearest CSS variable
2. **Replace in light-mode rules** with `var(--token)`
3. **Remove `[data-theme="dark"]` override blocks** that only existed to re-hardcode the dark variant — the variable already handles both themes
4. **Keep `[data-theme="dark"]` blocks** that do genuinely different layout/structural changes (not just color swaps)

### Common Mapping Table (for overlay files):

| Hardcoded Value | Replacement |
|---|---|
| `#f9fafb`, `#f8fafc` | `var(--bg)` or `var(--bg-secondary)` |
| `#ffffff`, `#fff` | `var(--card)` |
| `#f3f4f6`, `#f1f5f9` | `var(--bg-secondary)` |
| `#e5e7eb`, `#e2e8f0` | `var(--border)` |
| `#d1d5db`, `#cbd5e1` | `var(--border)` |
| `#9ca3af`, `#94a3b8` | `var(--muted)` |
| `#6b7280`, `#64748b` | `var(--text-secondary)` |
| `#374151`, `#475569` | `var(--text)` |
| `#1f2937`, `#1e293b` | `var(--text)` |
| `#111827`, `#0f172a` | `var(--text)` |
| `rgba(0,0,0,0.5)` | `var(--surface-overlay)` |
| `rgba(0,0,0,0.3)` | `var(--surface-overlay-light)` |
| `rgba(255,255,255,0.*)` | `var(--glass)` or `var(--glass-light)` |
| Green tones (`#10b981`, `#16a34a`, `#22c55e`, `#dcfce7`) | `var(--success)`, `var(--success-bg)` |
| Red tones (`#dc2626`, `#ef4444`, `#f87171`, `#fee2e2`) | `var(--danger)`, `var(--danger-bg)` |
| Yellow tones (`#f59e0b`, `#d97706`, `#fbbf24`, `#fef3c7`) | `var(--warning)`, `var(--warning-bg)` |
| Purple tones (`#8b5cf6`, `#9333ea`, `#a855f7`) | `var(--accent)` |
| Blue tones (`#6366f1`, `#4f46e5`, `#3b82f6`) | `var(--accent)` (or new `--info` if needed) |

### Verification per file:
- Visual comparison: light mode before/after
- Visual comparison: dark mode before/after
- Check that removed `[data-theme="dark"]` blocks don't break dark mode

---

## Phase 3: CSS Component & Layout Files

**Target files:**
1. `components/enhanced-ui.css` (~60+ instances)
2. `pages/logs.css` (~50+ instances)
3. `layout/sidebar.css` (~40+ instances)
4. `utilities/accessibility.css` (~40+ instances)
5. `components/tables.css` (~30+ instances)
6. `components/icons.css` (~20+ instances)
7. `layout/action-bar.css` (~20+ instances)
8. `utilities/responsive.css` (~20+ instances)
9. Remaining CSS files with <20 instances each

### Same approach as Phase 2. Same mapping table applies.

### Special consideration for `accessibility.css`:
- High-contrast mode colors may intentionally use specific values for WCAG compliance
- **Do NOT replace** colors inside `@media (prefers-contrast: high)` or `.high-contrast` selectors unless the variable provides equivalent contrast ratios
- Document any colors left hardcoded with a comment: `/* a11y: intentional hardcoded value for contrast */`
- **`accessibility.css` is EXCLUDED from color variable migration** — all its hardcoded colors are intentional for a11y compliance

### Special consideration for `action-bar.css`:
- Contains 10+ hardcoded button colors (`#6366f1`, `#06b6d4`, `#10b981`, etc.) for action buttons
- Map to existing accent/status variables or add new semantic button variables if needed
- This file is explicitly included in Phase 3 scope

### Tailwind CDN Classes:
- Tailwind is loaded via CDN (no build step) — Tailwind utility color classes (`bg-blue-500`, `text-gray-600`, etc.) are **left as-is**
- Only hardcoded hex/rgb values in CSS/JS/PHP are migrated to CSS custom properties
- Tailwind classes and CSS variables coexist; no conflict

---

## Phase 4: `themes/dark.css` Cleanup

**File:** `public/assets/css/themes/dark.css` (~462 lines)

After Phases 2-3, many `[data-theme="dark"]` overrides in individual files will be removed. `dark.css` itself also has hardcoded values.

### Approach:
1. Replace hardcoded colors in `dark.css` with CSS variables
2. Identify rules that are now redundant (because the component file already uses variables that auto-switch)
3. Remove redundant rules
4. Keep rules that provide genuinely different dark-mode structure/layout

### Expected outcome:
- `dark.css` shrinks significantly (possibly 50%+)
- Remaining rules are structural dark-mode differences, not color overrides

---

## Phase 5: JavaScript Layer

### 5A. `tableRenderer.js` — File Icon Colors

**Current:** `getIconColors()` returns hardcoded `{backgroundColor, color}` objects.

**Target:** Read from CSS variables.

```javascript
// Before
function getIconColors(type) {
  const colors = { folder: { backgroundColor: '#fef3c7', color: '#f59e0b' }, ... };
  return colors[type] || colors.default;
}

// After
function getIconColors(type) {
  const style = getComputedStyle(document.documentElement);
  return {
    backgroundColor: style.getPropertyValue(`--icon-${type}-bg`).trim() || style.getPropertyValue('--icon-default-bg').trim(),
    color: style.getPropertyValue(`--icon-${type}`).trim() || style.getPropertyValue('--icon-default').trim()
  };
}
```

**Performance note:** Cache `getComputedStyle` result. Invalidate on theme change.

```javascript
let _cachedStyle = null;
let _cachedTheme = null;

function getCSSVar(name) {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  if (!_cachedStyle || _cachedTheme !== currentTheme) {
    _cachedStyle = getComputedStyle(document.documentElement);
    _cachedTheme = currentTheme;
  }
  return _cachedStyle.getPropertyValue(name).trim();
}
```

### 5B. `fileIcons.js` — SVG Icon Colors

**Current:** `itemTypeIcons` has 70+ entries with hardcoded brand colors.

**Decision point:** Brand colors (JS yellow #F7DF1E, TS blue #3178C6, PHP purple #777BB4) are **intentionally specific** — they represent the language's official brand. These should NOT be replaced with theme variables.

**Action:**
- **Keep brand colors hardcoded** in `fileIcons.js` — they are constants, not theme-dependent
- **Move them to a `const BRAND_COLORS = {}` object** at the top of the file for maintainability
- **Replace non-brand colors** (base page color `#e2e8f0`, category fallback colors) with CSS variable reads

### 5C. `codemirror-editor.js` — Syntax Theme

**Current:** `darkColors` and `lightColors` objects with 14 hardcoded values each.

**Target:** Read from CSS variables defined in Phase 1C.

```javascript
// Before
const lightColors = { keyword: '#9333ea', string: '#16a34a', ... };

// After
function getSyntaxColors() {
  return {
    keyword: getCSSVar('--syntax-keyword'),
    string: getCSSVar('--syntax-string'),
    // ... all 14 tokens
  };
}
```

**Note:** CodeMirror themes are created once at init. Need to recreate on theme toggle. Check if existing theme-switch handler already does this.

### 5D. Other JS Files

| File | Action |
|---|---|
| `js/enhanced-ui.js` | Replace badge color logic with CSS classes that use variables. **Deduplicate** color definitions that overlap with `tableRenderer.js` — extract shared color logic into a common utility or have `enhanced-ui.js` consume the same CSS variables as `tableRenderer.js` |
| `modules/moveOverlay.js` | Replace fallback colors with CSS variable reads |
| `modules/appInitializer.js` | Replace toast colors with CSS variable reads |
| `modules/fileOperations.js` | Replace inline style colors with CSS classes |
| `js/dragHandlers.js` | Replace hardcoded drag indicator color with CSS variable read |
| `index.js` | Replace dynamic style colors with CSS variable reads |
| `trash.js` | Replace toast colors with CSS variable reads |

> **Note:** `enhanced-ui.js` is in the root `js/` folder, not `modules/`. Path: `public/assets/js/enhanced-ui.js`

### Verification:
- All file type icons render correctly in both themes
- CodeMirror syntax highlighting works in both themes
- Theme toggle doesn't break any JS-driven colors
- No `#` hex values remain in JS files (except brand colors in `fileIcons.js`)

---

## Phase 6: PHP Inline Styles

**Target files:**
1. `partials/trash/detail-modal.php`
2. `partials/trash/confirm-modal.php`
3. `index.php`

### Approach:
- Replace inline `style="color: #94a3b8"` with CSS classes
- Add corresponding classes to appropriate CSS files
- For `index.php` anti-flash hack (`#0f1419`), replace with `var(--bg)` or the dark-mode bg variable

### Verification:
- Trash modals render correctly
- No inline `style` attributes with color values remain in PHP files

---

## Phase 7: Final Cleanup & Validation

1. **Global search** for remaining hardcoded colors:
   - `grep -r '#[0-9a-fA-F]{3,8}' --include='*.css' --include='*.js'`
   - `grep -r 'rgb(' --include='*.css' --include='*.js'`
   - `grep -r 'rgba(' --include='*.css' --include='*.js'`
   
2. **Categorize remaining hits:**
   - Brand colors (intentional) → add comment `/* brand: intentional */`
   - Accessibility colors (intentional) → add comment `/* a11y: intentional */`
   - SVG/image data URIs → leave as-is
   - Missed instances → fix

3. **Remove unused variables** from `variables.css` if any were added but never consumed

4. **Test matrix:**
   - [ ] Light mode: full app walkthrough
   - [ ] Dark mode: full app walkthrough
   - [ ] Theme toggle: no flash, no broken colors
   - [ ] File listing: all icon types render correctly
   - [ ] Code editor: syntax highlighting in both themes
   - [ ] All overlays: log, preview, move, delete, details, download, rename
   - [ ] Trash page: modals render correctly
   - [ ] Accessibility: high-contrast mode still works

---

## Execution Order & Dependencies

```
Phase 1 (variables.css)     ← MUST be first, all others depend on it
    ↓
Phase 2 (overlay CSS)       ← Can run in parallel with Phase 3
Phase 3 (component CSS)     ← Can run in parallel with Phase 2
    ↓
Phase 4 (dark.css cleanup)  ← Depends on Phases 2+3 completion
    ↓
Phase 5 (JavaScript)        ← Depends on Phase 1 (needs variables defined)
Phase 6 (PHP)               ← Independent, can run anytime after Phase 1
    ↓
Phase 7 (validation)        ← MUST be last
```

## Estimated Scope

| Phase | Files | Est. Changes | Risk |
|-------|-------|-------------|------|
| 1 | 1 | ~80 new variables | Low |
| 2 | 7 | ~380 replacements | Medium |
| 3 | 8+ | ~260 replacements | Medium |
| 4 | 1 | ~100 removals | Medium |
| 5 | 9 | ~300 replacements | High (JS runtime) |
| 6 | 3 | ~15 replacements | Low |
| 7 | 0 | Validation only | — |

**Total: ~1,130 color replacements + ~80 new variables + ~100 dark.css removals**
