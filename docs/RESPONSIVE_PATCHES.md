# Responsive patches and apply instructions

The following patches are ready to be applied manually by copying into files or using your own patch/apply workflow. Each patch block shows the target file as a clickable reference and an exact code block to add.

Patch A — Append CSS to [`assets/css/style.css`](assets/css/style.css:1)

Description: Append the mobile-first responsive block to the end of the file. This stacks toolbar controls on mobile, increases touch targets and converts the table to stacked cards on narrow widths.

Add the following (append to end):

/* RESPONSIVE: mobile-first overrides */
:root{
  --bp-sm: 480px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --toolbar-gap-mobile: 0.5rem;
  --toolbar-gap-desktop: 1rem;
}

/* Mobile-first toolbar / actions */
@media (max-width: 767px){
  .meta-bar,
  .action-bar{
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
    padding: 0.6rem 12px;
  }
  .meta-actions,
  .action-group{
    width: 100%;
    display:flex;
    gap:0.5rem;
    flex-wrap:wrap;
    justify-content:flex-start;
  }
  .action-pill,
  .btn,
  .split-action .action-pill{
    min-height:44px; /* touch target */
    padding:10px 12px;
    font-size:0.95rem;
  }
  .search-field{
    width:100%;
    min-width:0;
    margin-top:0.5rem;
  }
  /* Table -> stacked cards */
  .table-wrapper{ margin:0 12px; }
  table thead{ display:none; }
  table, tbody, tr, td, th{ display:block; width:100%; }
  tbody tr{
    display:block;
    padding:12px;
    margin-bottom:10px;
    border-radius:12px;
    border:1px solid rgba(255,255,255,0.03);
    background:var(--surface);
    contain:layout style paint;
  }
  tbody tr td{
    display:flex;
    justify-content:space-between;
    padding:6px 8px;
    align-items:center;
  }
  td.name-cell{ order:1; flex:1; min-width:0; margin-right:10px; }
  td.modified-cell{ order:2; width:auto; white-space:nowrap; color:var(--text-muted); font-size:0.88rem;}
  td.actions-cell{ order:3; display:flex; gap:8px; justify-content:flex-end; }
  .row-action{ width:40px; height:40px; border-radius:10px; }
}

/* Desktop restore */
@media (min-width: 768px){
  .meta-bar, .action-bar{ flex-direction:row; gap:1rem; padding:0 24px; }
  .search-field{ width: auto; min-width:260px; margin-top:0; }
}

Patch B — Insert helper into [`assets/js/index.js`](assets/js/index.js:1)

Description: Add the following snippet before the call to initializeApp() (or near the top, inside DOMContentLoaded). It detects touch capability, adds .touch on <html> and maintains --vh.

Add/insert:

// Mobile viewport & touch detection helpers
(function(){
  try{
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    if (isTouch) document.documentElement.classList.add('touch');
    function setVh(){
      document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
    }
    setVh();
    if (window.visualViewport){
      window.visualViewport.addEventListener('resize', setVh, {passive:true});
    } else {
      window.addEventListener('resize', setVh, {passive:true});
    }
  }catch(e){ /* fail silently */ }
})();

How to apply these patches

- Manual paste:
  - Open [`assets/css/style.css`](assets/css/style.css:1) and append Patch A from "/* RESPONSIVE: mobile-first overrides */" onwards.
  - Open [`assets/js/index.js`](assets/js/index.js:1) and paste Patch B (the helper function) before initializeApp() call.

- Using git (manual patch):
  - You can create files or use your own tooling. Because exact line numbers in your local file may vary, manual paste is safest.

Verification checklist after applying

- Build: none required.
- Test viewports: 360x800, 375x812, 412x915, 768x1024, 1024x1366.
- Confirm toolbar stacking, search full-width, touch targets >= 44px.
- Confirm table rows visually stacked on small widths, and actions reachable.
- Confirm virtual scroll behavior stable (address bar show/hide).
- Run Lighthouse mobile audit and accessibility checks (Axe).

Notes and next steps

- If your renderer does not add `name-cell`, `modified-cell`, `actions-cell` classes, either:
  - Update [`assets/js/modules/uiRenderer.js`](assets/js/modules/uiRenderer.js:1) to add those classes to TDs (recommended), or
  - Modify the CSS selectors to target structural selectors (less explicit).

- If you want, I can now generate apply-ready diffs for the virtual scroll and uiRenderer modules. Provide permission to read those files and I'll prepare patches.

End.