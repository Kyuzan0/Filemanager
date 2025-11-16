# Tailwind Migration Progress Tracker

Branch: tw-mig
Created: 2025-11-16T13:46:36+07:00
Created by: migration-team

## Purpose

This document centralizes the migration status and checklist for moving the project from Bootstrap (CDN) to Tailwind (CDN). Use this tracker to record progress, decisions, and steps; update manually via commits to the migration branch or via automated updates.

## High-level summary

The migration branch is [`tw-mig`](tw-mig:1). The goal is to replace Bootstrap's CSS/JS usage with Tailwind CDN and adapt styles/components to Tailwind utility classes while preserving accessibility and responsive behavior.

## Progress checklist

- [x] Create migration branch (user already created)
- [x] Create progress tracker for migration (this checklist)
- [x] Confirm the migration branch name — tw-mig
- [x] Audit codebase for Bootstrap usage
- [x] Produce prioritized migration plan
- [x] Replace Bootstrap CDN with Tailwind CDN
- [x] Create/update global styles to complement Tailwind
- [x] Create/insert tailwind compatibility file and link ([`assets/css/tailwind-compat.css`](assets/css/tailwind-compat.css:1))
- [-] Migrate layout & core components
- [ ] Replace Bootstrap JS-dependent features
- [ ] Responsive & accessibility pass
- [ ] Visual QA & regression testing
- [ ] Commit changes incrementally
- [ ] Open PR and address feedback
- [ ] Update project docs with migration notes and final summary

## Recent actions

- Tailwind CDN added to [`index.php`](index.php:1) and minimal config set.
- Compatibility CSS moved to [`assets/css/tailwind-compat.css`](assets/css/tailwind-compat.css:1) and linked from [`index.php`](index.php:1).
- Minimal fallbacks appended to [`assets/css/style.css`](assets/css/style.css:1) earlier during initial testing (moved to compat file).
- Audit and migration plan created at [`docs/TAILWIND_MIGRATION_AUDIT.md`](docs/TAILWIND_MIGRATION_AUDIT.md:1) and [`docs/TAILWIND_MIGRATION_PLAN.md`](docs/TAILWIND_MIGRATION_PLAN.md:1).

## Next steps (immediate)
1. Migrate layout & core components (in order of priority):
   - Header & top action bars (update markup/classes in [`index.php`](index.php:1) and renderer in [`assets/js/modules/uiRenderer.js`](assets/js/modules/uiRenderer.js:1)) — Effort: S
   - File list & table rows (renderer) — Effort: M
   - Pagination & status bars ([`assets/js/modules/pagination.js`](assets/js/modules/pagination.js:1)) — Effort: S
   - Sidebar / Overlays (modals/preview/confirm) — Effort: M
2. For each component:
   - Create a small PR that replaces classes in markup/renderer only (no behavior changes).
   - Include before/after screenshots in PR description.
   - Sync this tracker and call `update_todo_list` to update central checklist.

## How to work on a component (recommended workflow)
- Branch from `tw-mig` per component: e.g., `tw-mig/header`, `tw-mig/filelist`.
- Keep commits small (class updates only) and reference this tracker.
- If behavior needs JS changes, open a follow-up PR only after markup migrations are stable.
- Use Tailwind CDN utilities initially; consider migrating to npm-based Tailwind in a later task.

## Notes / How to update
- Edit this file directly and commit changes to the migration branch [`tw-mig`](tw-mig:1).
- When marking checklist items, add a short note and link to the PR.
- Keep the file minimal and actionable; avoid long narratives.

## Relevant files / references
- [`index.php`](index.php:1)
- [`assets/css/style.css`](assets/css/style.css:1)
- [`assets/css/tailwind-compat.css`](assets/css/tailwind-compat.css:1)
- [`assets/js/modules/uiRenderer.js`](assets/js/modules/uiRenderer.js:1)
- [`assets/js/modules/pagination.js`](assets/js/modules/pagination.js:1)
- [`docs/TAILWIND_MIGRATION_AUDIT.md`](docs/TAILWIND_MIGRATION_AUDIT.md:1)
- [`docs/TAILWIND_MIGRATION_PLAN.md`](docs/TAILWIND_MIGRATION_PLAN.md:1)

## Last updated

2025-11-16T18:29:41+07:00