# Visual QA & Regression Checklist

Purpose:
- Verify visual and accessibility stability after migrating styles to Tailwind utilities.
- Produce prioritized CSS fixes and small patch diffs for quick follow-ups.

Scope:
- Focus areas: modals/overlays, file list rows, action buttons, pagination, badges, forms.
- Primary files to inspect: [`assets/js/modules/modals.js`](assets/js/modules/modals.js:1), [`assets/js/modules/uiRenderer.js`](assets/js/modules/uiRenderer.js:1), [`assets/js/modules/pagination.js`](assets/js/modules/pagination.js:1), [`assets/css/tailwind-compat.css`](assets/css/tailwind-compat.css:1), [`assets/css/style.css`](assets/css/style.css:1).

Prerequisites:
- Start local dev server (example): php -S localhost:8000 -t .
- Open page in target browser(s) at http://localhost:8000
- Have git branch `tw-mig` checked out so you can capture before/after easily.

Baseline screenshot plan (capture each view with device breakpoints):
1) Modals
   - Open Confirm/Preview/Create/Rename/Log modals.
   - Capture at widths: 375px (mobile), 768px (tablet), 1366px (desktop).
   - Files: [`assets/js/modules/modals.js`](assets/js/modules/modals.js:1), [`assets/css/tailwind-compat.css`](assets/css/tailwind-compat.css:1)
2) File list rows
   - Default list and selection states (selected, hover, focused).
   - Virtual scroll view with many items.
   - File: [`assets/js/modules/uiRenderer.js`](assets/js/modules/uiRenderer.js:1)
3) Action buttons & header
   - Primary/secondary/outline states and disabled states.
   - File: [`index.php`](index.php:1) + [`assets/css/style.css`](assets/css/style.css:1)
4) Pagination
   - Many pages, first/last/active states on different screen sizes.
   - File: [`assets/js/modules/pagination.js`](assets/js/modules/pagination.js:1)
5) Forms & inputs in modals
   - Focus ring, error state, placeholder text, input widths.
   - Files: [`assets/css/tailwind-compat.css`](assets/css/tailwind-compat.css:1), [`assets/css/style.css`](assets/css/style.css:1)

How to capture programmatically (Playwright - recommended):
- Example script (save as tools/screenshot.js) and run with node/playwright.
- Steps:
  - Open modal by clicking its trigger or run the internal function via DevTools.
  - Wait for overlay `.visible`.
  - Take screenshot: page.screenshot({ path: `screens/modals-${breakpoint}.png`, fullPage: false })
- Use breakpoints list: [375, 768, 1024, 1366]
- Store screenshots in `screens/baseline/` for comparison.

Manual checklist for each screenshot:
- [ ] Dialog width & padding consistent with design tokens
- [ ] Backdrop opacity & z-index correct (not blocking other UI)
- [ ] Focus outline visible on first interactive control inside dialog
- [ ] Body scroll locked when modal open (body.modal-open => overflow hidden)
- [ ] Buttons have visible hover & active states and accessible contrast
- [ ] No layout shifts on open/close

Priority list of likely visual regressions and proposed fixes
1) Modal dialog overflow on small screens
   - Problem: dialog uses fixed width and overflows viewport on mobile.
   - Quick fix: ensure dialog has max-width and margin (already added in [`assets/css/tailwind-compat.css`](assets/css/tailwind-compat.css:1)).
   - Patch suggestion (example):
     - Add to [`assets/css/tailwind-compat.css`](assets/css/tailwind-compat.css:1) (already applied): `.modal { max-width: 48rem; margin: 1rem; max-height: 90vh; overflow: auto; }`

2) Focus ring / keyboard visibility gaps
   - Problem: custom `.btn` focus vs Tailwind's focus-visible differences.
   - Fix: provide fallback focus-visible styles in [`assets/css/tailwind-compat.css`](assets/css/tailwind-compat.css:1) (already applied). If further contrast needed, tweak outline color.

3) Body scroll not locked consistently
   - Problem: some code paths remove `modal-open` incorrectly or overlays stacked cause scroll leak.
   - Check: when opening multiple overlays ensure `document.body.classList.add('modal-open')` happens only when first overlay opens; closing must remove only when no overlays open.
   - Action: audit close functions in [`assets/js/modules/modals.js`](assets/js/modules/modals.js:1) and add defensive checks (already mostly present). If issues remain, change `document.body.classList` logic to count open overlays (small state counter).

4) Backdrop pointer-events & timing
   - Problem: clicking backdrop sometimes passes events to underlying UI.
   - Fix: in [`assets/css/tailwind-compat.css`](assets/css/tailwind-compat.css:1) ensure `.tw-overlay[aria-hidden="true"] { pointer-events: none; }` and visible overlays `pointer-events: auto` (already added).
   - If transitions cause brief pointer leak, add `pointer-events: none` to child dialog until `visible` class added.

5) Button spacing & alignment differences
   - Problem: action button group alignment changed when Tailwind utilities applied.
   - Fix: ensure `.row-actions` or `.action-pill` replacements include `inline-flex items-center gap-2 justify-end`.

Sample small patch diffs to apply (examples to convert manually or via apply_diff):
- Tailwind compat tweaks (already applied) — if further needed, add:
  - Increase dialog max-width for `log` modal: change `.log-dialog` max-width to `64rem`.
  - Improve `.btn-primary` hover shadow for better affordance.

Accessibility checks (keyboard + screen reader):
- [ ] All dialogs have role="dialog" and aria-modal="true" — verify in DOM after opening. (Added in [`assets/js/modules/modals.js`](assets/js/modules/modals.js:1).)
- [ ] Focus trap works (Tab/Shift+Tab stays inside dialog) — manually test keyboard navigation.
- [ ] Focus restoration to previously focused element after modal close — verify using `open`/`close` flows.
- [ ] Escape closes current top-most modal — check stacked modal behavior.
- [ ] Screen reader announcements: Ensure dialog has an accessible label (aria-label or h2 with id + aria-labelledby).

Regression test flow
1. Capture baseline screenshots of current `tw-mig` branch (screens/baseline).
2. Apply small CSS patches locally (one at a time).
3. Rebuild / reload and capture screenshots to `screens/after-patch-<id>`.
4. Compare visually (pixel diff) and list any remaining regressions.

Suggested tools & commands
- Playwright (recommended) to script screenshots:
  - npx playwright install
  - node tools/screenshot.js
- Image diff: `npx pixelmatch-cli baseline.png after.png diff.png --threshold 0.1`
- Alternative: use Percy or other visual CI service for PR-level comparisons.

Deliverables I will prepare if you want me to proceed:
- A Playwright script to capture the list above and upload images to `screens/` (I can create `tools/screenshot.js`).
- A prioritized set of small apply_diff patches for quick fixes (1-3 files at a time).
- A PR description template with before/after screenshots and checklist.

Next action (choose one):
- I will create the Playwright screenshot runner (`tools/screenshot.js`) and sample config.
- I will prepare 2-3 small apply_diff patches (recommended fixes) and run them locally (create diffs here).
- I will generate a PR description file placeholder `docs/PR_TW_MIG_TEMPLATE.md`.
