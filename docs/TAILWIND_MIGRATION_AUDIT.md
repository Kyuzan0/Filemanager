# Tailwind Migration Audit: Bootstrap Usage Report

- Branch: tw-mig
- Date: 2025-11-16
- Scope: Identify all Bootstrap usage (CDN/assets, CSS classes, HTML attributes like data-*, and Bootstrap JS usage) to guide migration to Tailwind CDN.

## Executive summary
- No Bootstrap CDN or bootstrap.min.js references found in the primary entry point and inspected files.
- No Bootstrap JS API usage detected in core JS modules (no new bootstrap.*, no Bootstrap.Modal, no .modal()/.dropdown() plugin usage).
- The repo defines and uses many Bootstrap-like class names (.btn, .btn-primary, .container, .row, etc.) in its own CSS and in test pages — these naming collisions are the primary migration effort.
- No data-bs-* / data-toggle / data-target occurrences found in core app files; project uses custom attributes like data-action and data-kind.

## Findings

### CDN / asset references
- Bootstrap CDN found: Tidak.
  - Checked main entry: [`index.php`](index.php:485)
  - No https?://...bootstrap...css or ...bootstrap...js references located in the primary HTML entry.

### Files defining or using Bootstrap-like CSS classes
- [`assets/css/style.css`](assets/css/style.css:2916): defines many Bootstrap-like classes and utilities.
  - Example: `.btn` definition at [`assets/css/style.css`](assets/css/style.css:2916)
  - Example: `.btn-primary` definition at [`assets/css/style.css`](assets/css/style.css:2930)
  - This file is the primary source of global button styles and utilities that will conflict with Bootstrap/Tailwind naming.
- [`test/integration-test.html`](test/integration-test.html:20): contains `.container` and `.btn-*` style definitions and usages (examples at lines shown in file).
- [`test/performance-benchmark.html`](test/performance-benchmark.html:21): contains `.container`, `.btn` and variants.
- [`test/drag-drop-performance-benchmark.html`](test/drag-drop-performance-benchmark.html:21): similar `.container` and `.btn` use.
- [`index.php`](index.php:30): app markup uses many semantic classes (e.g. `action-pill`, `row-actions`, overlays). These are not Bootstrap imports but some tokens (like "row" inside `row-actions`) may match broad Bootstrap-class regexes.
- Multiple docs and example pages reference `.row`, `.pagination`, `.btn` etc. These occur mainly in `docs/` and `test/` directories.

#### Per-class summary (sampled from repo scan)
- .btn / .btn-primary / .btn-secondary / .btn-danger
  - Where: `assets/css/style.css` (definitions), `test/*.html` (usages)
  - Example lines: [`assets/css/style.css`](assets/css/style.css:2916), [`test/integration-test.html`](test/integration-test.html:63)
  - Estimated occurrences (across scanned files): .btn ≈ 30+, .btn-primary ≈ 10+, .btn-secondary ≈ 8+ (includes definitions + usages in tests/docs). These are estimates from the scan output; see "Next steps" to produce exact counts.
- .container
  - Where: `test/*.html`, some docs
  - Example: [`test/performance-benchmark.html`](test/performance-benchmark.html:21)
  - Estimated occurrences: ≈ 4 files (mostly test pages & examples).
- .row / related (e.g., `.row-actions`)
  - Where: `assets/css/style.css` (`.row-actions`), docs, JS class names
  - Example: [`assets/css/style.css`](assets/css/style.css:896) (`.row-actions`)
- .form-control / .input-group / .navbar / .modal / .dropdown
  - Where: Not found consistently as library classes in core app; mostly mentioned in docs or test examples, not used as part of Bootstrap library.

### HTML attributes related to Bootstrap
- data-bs-* / data-toggle / data-target
  - Result: No occurrences found in core app files inspected (checked `index.php`, `assets/js/modules/*`).
  - Project instead uses attributes such as `data-action` and `data-kind` (example: [`index.php`](index.php:60)).

### Bootstrap JS usage (runtime)
- Patterns searched: `new bootstrap.*`, `Bootstrap.Modal`, `.modal(`, `.dropdown(`
- Result: No Bootstrap JS API usage detected in core JS modules. Core modal behaviour is implemented by project JS (`assets/js/modules/modals.js`) and UI modules (e.g. [`assets/js/modules/uiRenderer.js`](assets/js/modules/uiRenderer.js:1)).

## Initial prioritization & recommendations
1. Verify CDN presence across other branches/CI pages (if any) and remove/replace with Tailwind CDN if found — Effort: S (small).
2. Migrate button system: replace global `.btn*` definitions in [`assets/css/style.css`](assets/css/style.css:2916) by mapping to Tailwind utilities or component classes; then update usages — Effort: M.
3. Migrate modal overlays: ensure `modal-open` body class behaviour is preserved (JS currently toggles `modal-open`); reimplement overlays with Tailwind utilities or component classes — Effort: M.
4. Migrate layout utilities used in tests/docs (`.container`, `.row`, `.col-*`) — Effort: S.
5. Run a global naming-collision audit and decide strategy (rename project classes, prefix, or adopt Tailwind components) — Effort: M/L depending on scope.

## Next steps (recommended sequence)
1. Run an automated repo-wide grep to produce exact per-class occurrence counts (CSV or JSON) for the Bootstrap-class regex set.
2. Protect critical pages by running visual regression tests before/after CSS changes.
3. Start migration with `assets/css/style.css`:
   - Replace or namespace `.btn*` styles and convert core page usages to Tailwind.
4. Migrate modal components (JS + CSS) ensuring ARIA attributes and `modal-open` behavior preserved.
5. Update `test/` pages and docs to use Tailwind utilities or updated component classes.
6. Open PRs per area: (a) CSS normalization (buttons/utilities), (b) modal migration, (c) layout utilities and small docs/test updates.

## Files referenced in this audit
- [`index.php`](index.php:1)
- [`assets/css/style.css`](assets/css/style.css:2916)
- [`assets/js/modules/uiRenderer.js`](assets/js/modules/uiRenderer.js:1)
- Example additional files found by the scan: [`assets/js/modules/modals.js`](assets/js/modules/modals.js:1), [`test/integration-test.html`](test/integration-test.html:319)

## How to update this report
1. Edit this file: [`docs/TAILWIND_MIGRATION_AUDIT.md`](docs/TAILWIND_MIGRATION_AUDIT.md:1)
2. Commit to branch `tw-mig`:
   - git checkout tw-mig && git add docs/TAILWIND_MIGRATION_AUDIT.md && git commit -m "docs: add Tailwind migration audit"
3. Optionally attach a CSV of exact grep counts and link it from this report.

## Notes & caveats
- This audit used semantic + regex scans and manual inspection of the primary files requested. Some per-class counts above are estimates from the scan output; run the repo-wide grep/count step (Next steps item #1) for exact numbers.
- No code changes were made; only this report file was created.

----
End of report.