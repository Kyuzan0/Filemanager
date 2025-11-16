# PR: chore(tw-mig): modal fixes + tailwind compat tweaks (visual baseline captured)

## Summary
- Added overlay open-count guard to prevent premature removal of body.modal-open.
- Tailwind compatibility CSS tweaks: dialog sizing, stronger focus-visible fallback, backdrop/pointer-event timing.

## Files changed
- [`assets/js/modules/modals.js`](assets/js/modules/modals.js:1)
- [`assets/css/tailwind-compat.css`](assets/css/tailwind-compat.css:1)

## Visual baseline
- Baseline screenshots were captured locally to `./screens/baseline/` on the machine that ran the runner.
- This repository currently ignores `screens/` in .gitignore so screenshots were not committed.

## How to include screenshots in the PR (optional)
1. Force-add screenshots and push:
   git add -f screens/baseline && git commit -m "chore: add visual baseline screenshots" && git push origin tw-mig
2. Then open a PR normally (GitHub UI) or with gh:
   gh pr create --title "chore(tw-mig): modal fixes + tailwind compat tweaks (visual baseline)" --body "..." --base main --head tw-mig

## Suggested PR body (copy/paste)
Summary:
- Added overlay open-count guard to prevent premature removal of body.modal-open.
- Tailwind compatibility CSS tweaks: dialog sizing, stronger focus-visible fallback, backdrop/pointer-event timing.

Files changed:
- [`assets/js/modules/modals.js`](assets/js/modules/modals.js:1)
- [`assets/css/tailwind-compat.css`](assets/css/tailwind-compat.css:1)

Notes:
- Baseline screenshots available locally at `./screens/baseline/` (not committed due to .gitignore).
- Visual QA checklist: see [`docs/VISUAL_QA.md`](docs/VISUAL_QA.md:1)

What to review:
- Modal open/close behavior and focus trapping.
- Modal visual appearance across breakpoints (mobile/tablet/desktop).

## Reviewer checklist
- [ ] Verify modals open and close without body scroll leakage.
- [ ] Verify focus lands inside the dialog and is restored on close.
- [ ] Confirm backdrop blocks underlying UI and no pointer-event leaks occur during transitions.
- [ ] Inspect screenshots in `./screens/baseline/` for visual regressions.

## Next steps (after PR)
- If visual regressions are found, create targeted apply_diff patches and re-run the screenshot runner.

-- End of template