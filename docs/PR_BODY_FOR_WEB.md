PR: chore(tw-mig): Tailwind migration - uiRenderer finalization + compat tweaks

Summary:
- Finalized conservative Tailwind migration changes for the file list renderer and virtual scroll.
- Preserved icon provider classes and appended Tailwind utilities to icon elements.
- Reconciled runtime virtual-scroll itemHeight with computed row height during render.
- Applied conservative Tailwind utilities to action buttons and cells to avoid breaking legacy layouts.

Files changed:
- assets/js/modules/uiRenderer.js
- assets/js/modules/modals.js
- assets/css/tailwind-compat.css
- assets/js/modules/logManager.js
- assets/js/modules/pagination.js
- assets/js/modules/moveOverlay.js

Concise changelog:
- uiRenderer: preserve icon classes and add Tailwind utilities to icon elements; measure first-row height and update virtual-scroll itemHeight at runtime.
- Modals: overlay open-count guard and backdrop/focus accessibility tweaks.
- Compatibility CSS: small fixes to smooth Tailwind preflight collisions.
- Conservative JS updates: converted safe className assignments to classList.add(...) across modules.

Visual baseline:
- Baseline screenshots were captured locally to ./screens/baseline/ (not committed; screens/ is ignored by .gitignore).

How to test (manual smoke):
1. Start local server: start "php-server" /B php -S localhost:8000 -t .
2. Open http://localhost:8000 and navigate to the file list.
3. Verify row hover states, action buttons, icon rendering, and virtual scrolling rendering with no gaps/overlap.
4. Open modals and confirm focus trap and backdrop behavior.

Compare URL:
https://github.com/Kyuzan0/Filemanager/compare/main...tw-mig?expand=1

Ready-to-paste PR body: copy the content above and paste into the GitHub PR body field.