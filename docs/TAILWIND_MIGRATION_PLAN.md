# Tailwind Migration Plan

Branch: tw-mig  
Author: migration-team  
Date: 2025-11-16

Summary

A practical, prioritized plan to migrate the repository from Bootstrap-like class usage to Tailwind (CDN or build). The plan uses the findings in the audit and progress tracker to prioritize work so frontend developers can execute component-by-component migrations with minimal regressions.

Context & references

- Audit: [`docs/TAILWIND_MIGRATION_AUDIT.md`](docs/TAILWIND_MIGRATION_AUDIT.md:1)  
- Progress tracker: [`docs/TAILWIND_MIGRATION_PROGRESS.md`](docs/TAILWIND_MIGRATION_PROGRESS.md:1)  
- Key entry files: [`index.php`](index.php:1), [`assets/css/style.css`](assets/css/style.css:1), [`assets/js/modules/uiRenderer.js`](assets/js/modules/uiRenderer.js:1)

Prioritized components / areas (10 items)

1. Global button system (.btn*)
- Why: Central styling collisions in [`assets/css/style.css`](assets/css/style.css:2916) define `.btn`, `.btn-primary`, etc. High surface area across templates and tests.
- Mapping examples:
  - `.btn` -> `inline-flex items-center px-4 py-2 rounded`
  - `.btn-primary` -> `bg-blue-600 text-white hover:bg-blue-700`
  - `.btn-secondary` -> `bg-gray-600 text-white hover:bg-gray-700`
  - `.btn-outline` -> `border border-current bg-transparent`
- Effort: M (refactor global CSS and update usages)
- Risks / notes: Existing `.btn*` contains bespoke focus/disabled states — keep parity for accessibility.

2. Modals & overlays
- Why: Project JS toggles `modal-open` and implements modals in [`assets/js/modules/modals.js`](assets/js/modules/modals.js:1); visual and behavior correctness is critical.
- Mapping examples:
  - Modal wrapper -> `fixed inset-0 flex items-center justify-center z-50`
  - Backdrop -> `fixed inset-0 bg-black bg-opacity-50`
  - Dialog -> `bg-white rounded shadow-lg max-w-lg w-full p-4`
- Effort: M (CSS + verify JS behavior)
- Risks / notes: Tailwind CDN provides no JS; preserve project modal JS (focus trap, scroll lock).

3. Layout: container / row / col grid
- Why: Many `container`, `row`, `col-*` usages (layout of file list, headers, forms).
- Mapping examples:
  - `.container` -> `container mx-auto px-4`
  - `.row` -> `flex flex-wrap -mx-2`
  - `.col-md-6` -> `w-full md:w-1/2 px-2`
- Effort: S (class replacements; can be automated)
- Risks / notes: Existing CSS selectors that rely on `.row > .col` margin collapse must be checked.

4. Global utilities & helpers (spacing, text-align, display)
- Why: Project uses utility-like names and some custom display helpers; consistent mapping reduces breakage.
- Mapping examples:
  - `m-2` -> `m-2` (Tailwind equivalent)
  - `text-center` -> `text-center`
  - `d-none` -> `hidden`, `d-block` -> `block`
- Effort: S
- Risks / notes: Non-standard utilities will need compatibility rules or codemods.

5. Forms (form-control, selects, inputs)
- Why: Inputs need accessible styles and consistent spacing; global CSS currently styles inputs.
- Mapping examples:
  - `.form-control` -> `block w-full px-3 py-2 border rounded focus:outline-none focus:ring`
  - `.form-inline` -> `flex items-center space-x-2`
- Effort: M
- Risks / notes: Error/validation states must be mapped and tested.

6. Input groups & button groups
- Why: Search bars, inline controls require grouped styling and correct border/radius handling.
- Mapping examples:
  - `.input-group` -> `flex items-stretch`
  - Prepend button -> `inline-flex items-center px-3 border bg-gray-100`
- Effort: S
- Risks / notes: Preserve seamless borders and corner radius between elements.

7. Navigation bar / header (navbar)
- Why: Header + responsive toggles affect many pages; project uses custom toggles (no Bootstrap JS).
- Mapping examples:
  - `.navbar` -> `flex items-center justify-between p-4 bg-white shadow`
  - `.navbar-toggler` -> `md:hidden inline-flex items-center`
- Effort: M
- Risks / notes: Keep existing JS for collapse/toggle behavior; test mobile breakpoints.

8. Pagination & lists
- Why: Used in file listing; visual consistency important for navigation and QA.
- Mapping examples:
  - `.pagination` -> `flex items-center space-x-2`
  - `.page-item.active` -> `bg-blue-600 text-white rounded`
- Effort: S
- Risks / notes: Server-rendered templates must be updated carefully.

9. Badges & labels
- Why: Small UI tokens (status, counts) appear widely; easy wins for Tailwind.
- Mapping examples:
  - `.badge` -> `inline-block text-xs px-2 py-1 rounded bg-gray-200`
  - `.badge-success` -> `bg-green-100 text-green-800`
- Effort: S
- Risks / notes: Ensure color tokens align with design system.

10. Dropdowns / tooltips / small JS-driven components
- Why: Interaction components appear in UI; audit shows no Bootstrap.js usage but classes exist in tests.
- Mapping examples:
  - `.dropdown-menu` -> `absolute bg-white shadow rounded mt-1`
  - `.dropdown-item` -> `block px-4 py-2 hover:bg-gray-100`
- Effort: M
- Risks / notes: Maintain project JS for open/close actions; test keyboard navigation.

Strategic migration approach — ordered steps

1. Prepare branch & backups
   - Work exclusively on branch: tw-mig
   - Keep `assets/css/style.css` as source of truth until validated
2. Run a repo-wide occurrence count (grep) for Bootstrap-like classes (CSV) to size work
3. CDN experiment: include Tailwind CDN on a protected staging page (not production) to inspect collisions
4. Set up Tailwind base (preflight) evaluation — verify Preflight does not remove required resets
5. Migrate global CSS in phases starting from largest impact areas (buttons, utilities)
6. Migrate layout (container/row/cols)
7. Migrate forms and input groups
8. Migrate interactive components (modals, dropdowns), verifying JS behaviors
9. QA: visual regression tests, accessibility checks, cross-browser testing
10. If using build approach, remove compatibility CSS, configure purge/content, and finalize

Implementation details & tooling suggestions

Approach 1 — Fast
- Tailwind via CDN (script/link to Tailwind Play CDN)
- Use Tailwind utility classes directly in templates and maintain a small compatibility CSS that re-declares old selectors (.btn, .container, etc.) mapped to Tailwind utilities
- Pros:
  - Very quick to start; no build changes
  - Good for small teams or quick demos
- Cons:
  - Larger final CSS (no purge), potential collisions
  - No @apply, limited custom theming
- When to choose:
  - Short timeline, limited CI access, incremental migration desired

Approach 2 — Pro
- Install Tailwind via npm, integrate PostCSS or build pipeline, configure tailwind.config.js, use @apply to extract repeated utility patterns into components, configure content/purge paths, safelist legacy classes if needed
- Pros:
  - Small final CSS via purge, reusable components via @apply, theme tokens and consistency
- Cons:
  - Setup time and CI changes required
- When to choose:
  - Long-term project maintenance, production performance targets, centralized theme control

For each approach — extra suggestions
- Fast: add compatibility file `assets/css/tailwind-compat.css` with simple mappings to reduce breakage during incremental rollout.
- Pro: create `tailwind.config.js` with safelist for dynamically generated classes and legacy class names used by server templates.

Commit & PR strategy

- Split work into small, focused PRs by component/area (e.g., `buttons`, `layout`, `forms`, `modals`)
- PR checklist:
  - Short description and changed files
  - Before/after screenshots (visual regression)
  - Accessibility checks (focus, aria attributes)
  - Notes about compatibility CSS or safelists
- Recommended PR size: small enough to review visually in 10–20 minutes
- Tools for visual regression: Percy, Playwright image comparisons, or headless Chrome screenshots recorded in PR
- For CDN swap: use guarded/feature-flagged include and separate PR for final removal of compatibility CSS

Quick mapping cheatsheet

- Container / layout:
  - `.container` -> `container mx-auto px-4`
  - `.row` -> `flex flex-wrap -mx-2`
  - `.col-*-*` -> `w-full md:w-1/2 px-2` (example)
- Buttons:
  - `.btn` -> `inline-flex items-center px-4 py-2 rounded`
  - `.btn-primary` -> `bg-blue-600 text-white hover:bg-blue-700`
  - `.btn-outline` -> `border border-current bg-transparent`
- Spacing:
  - `m-1..m-4` -> `m-1..m-4`
  - `p-*` -> `p-*`
- Text alignment:
  - `.text-left` -> `text-left`, `.text-center` -> `text-center`
- Display utils:
  - `.d-none` -> `hidden`, `.d-block` -> `block`, `.d-flex` -> `flex`
- Forms:
  - `.form-control` -> `block w-full px-3 py-2 border rounded`
- Input group:
  - `.input-group` -> `flex items-stretch`
- Badges:
  - `.badge` -> `inline-block text-xs px-2 py-1 rounded`
- Navbar:
  - `.navbar` -> `flex items-center justify-between p-4`
- Pagination:
  - `.pagination` -> `flex space-x-2 items-center`

Prioritized 1–3 week sprint plan (example)

Week 1 — Setup & Global styles (goal: CDN swap + buttons)
- Add Tailwind CDN on a staging/experimental page only
- Create compatibility layer for `.btn*` and global utilities
- Migrate `.btn` usages in core templates
- PR: CDN swap + button system with visual tests

Week 2 — Layout & lists (goal: container/row/cols, pagination)
- Migrate container/row/col to Tailwind utilities
- Update file list, pagination, and badges
- PRs: Layout migration + pagination (visual tests)

Week 3 — Forms & interactive components (goal: modals, dropdowns)
- Migrate forms, input groups, navbar adjustments
- Migrate modals and verify `modal-open` handling remains correct
- Full QA: visual regression, accessibility, cross-browser

Implementation checklist (practical tips)

- Run repo-wide grep for Bootstrap-like class occurrences and export CSV (size work)
- Use codemods or scripted search/replace for consistent mappings; keep a mapping table to apply uniformly
- Keep `assets/css/style.css` as compatibility fallback during phased migration
- Start with server-rendered templates and core pages, then update `test/` pages and example docs
- Add safelist entries in Tailwind config if using the build approach for dynamic classes

Risk register & mitigation

- Naming collisions between project CSS and Tailwind: mitigate by namespacing compatibility CSS or renaming project-specific classes in phases
- JS-driven behaviors (modals, dropdowns): preserve project JS and adapt class toggles where necessary
- Performance (if using CDN): plan for pro approach with purge to reduce CSS size for production

References

- Audit: [`docs/TAILWIND_MIGRATION_AUDIT.md`](docs/TAILWIND_MIGRATION_AUDIT.md:1)  
- Progress tracker: [`docs/TAILWIND_MIGRATION_PROGRESS.md`](docs/TAILWIND_MIGRATION_PROGRESS.md:1)  
- Entry files: [`index.php`](index.php:1), [`assets/css/style.css`](assets/css/style.css:1), [`assets/js/modules/uiRenderer.js`](assets/js/modules/uiRenderer.js:1)

Notes

- This document is a planning artifact only. Do not modify code files as part of this planning step.

End.