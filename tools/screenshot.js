const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const breakpoints = [375, 768, 1024, 1366];
  const page = await context.newPage();
  const baseUrl = process.env.BASE_URL || 'http://localhost:8000';

  console.log('Opening', baseUrl);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  // Ensure output dirs
  const fs = require('fs');
  const path = require('path');
  const outDir = path.join(process.cwd(), 'screens', 'baseline');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const overlays = [
    'preview-overlay',
    'confirm-overlay',
    'create-overlay',
    'rename-overlay',
    'log-overlay',
    'unsaved-overlay',
    'settings-overlay'
  ];

  // generic helper to open overlay visually
  // Enhanced: try element by id first; if not found, attempt to call known global open functions
  // (openPreviewOverlay, openConfirmOverlay, openCreateOverlay, openRenameOverlay, openLogOverlay,
  //  openUnsavedOverlay, openSettings). As a last resort try to reveal any [role="dialog"] element.
  async function openOverlayById(overlayId) {
    return page.evaluate(async (id) => {
      const fnMap = {
        'preview-overlay': 'openPreviewOverlay',
        'confirm-overlay': 'openConfirmOverlay',
        'create-overlay': 'openCreateOverlay',
        'rename-overlay': 'openRenameOverlay',
        'log-overlay': 'openLogOverlay',
        'unsaved-overlay': 'openUnsavedOverlay',
        'settings-overlay': 'openSettings'
      };

      // Known trigger selectors that commonly open each overlay.
      const triggerMap = {
        'preview-overlay': ['#btn-preview', '[data-trigger="preview"]', '.btn-preview', '[data-action="preview"]'],
        'confirm-overlay': ['#btn-delete-selected', '.btn-confirm', '[data-action="confirm"]'],
        'create-overlay': ['#btn-create', '#trigger-create', '[data-action="create"]', '.btn-add'],
        'rename-overlay': ['.btn-rename', '#btn-rename', '[data-action="rename"]'],
        'log-overlay': ['#btn-logs', '.btn-logs', '[data-action="logs"]'],
        'unsaved-overlay': ['#unsaved-open', '[data-action="unsaved"]'],
        'settings-overlay': ['#btn-settings', '#settings-btn', '[data-action="settings"]']
      };

      // PRE-ACTION: ensure a file/row is selected where overlays depend on selection
      try {
        const firstRow = document.querySelector('tr[data-path], .file-row, .item-row, .row');
        if (firstRow) {
          try {
            // click row to focus/select
            firstRow.click();
            await new Promise((r) => setTimeout(r, 150));
            // click a checkbox inside the row if present to simulate selection
            const cb = firstRow.querySelector('input[type="checkbox"], .select-checkbox');
            if (cb && !cb.checked) {
              cb.click();
              await new Promise((r) => setTimeout(r, 150));
            }

            // Also attempt to set the application selection state (debug helper) so overlay
            // openers that rely on state.selected / state.itemMap work deterministically.
            try {
              const pathAttr = firstRow.getAttribute && firstRow.getAttribute('data-path');
              const selectedPath = pathAttr || '/example.txt';

              // If debugModules is available, import state module and set selection using its API
              if (window.debugModules && typeof window.debugModules.getState === 'function') {
                try {
                  const mod = await window.debugModules.getState();
                  // mod may export functions or the state object; try common APIs
                  if (mod && typeof mod.updateState === 'function') {
                    try { mod.updateState({ selected: new Set([selectedPath]) }); } catch (_) { /* ignore */ }
                  } else if (mod && typeof mod.setStateValue === 'function') {
                    try { mod.setStateValue('selected', new Set([selectedPath])); } catch (_) { /* ignore */ }
                  } else if (mod && mod.state) {
                    try { mod.state.selected = new Set([selectedPath]); } catch (_) { /* ignore */ }
                  }
                } catch (e) {
                  /* ignore errors from dynamic import */
                }
              } else if (window.state && typeof window.state === 'object') {
                // Fallback: directly mutate global state if exposed
                try { window.state.selected = new Set([ selectedPath ]); } catch (e) { /* ignore */ }
              }
            } catch (e) {
              /* ignore debug state set errors */
            }
          } catch (e) {
            /* ignore row selection errors */
          }
        }
      } catch (e) { /* ignore */ }

      // 1) Try element by id (visual reveal)
      const ov = document.getElementById(id);
      if (ov) {
        try {
          ov.hidden = false;
          ov.setAttribute('aria-hidden', 'false');
          ov.classList.add('visible', 'tw-overlay');
          document.body.classList.add('modal-open');
          const focusable = ov.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (focusable) focusable.focus();
          return true;
        } catch (e) {
          try { ov.style.display = 'block'; return true; } catch (_) { /* ignore */ }
        }
      }

      // 1.5) Try clicking known trigger elements for this overlay
      const triggers = triggerMap[id] || [];
      for (const sel of triggers) {
        try {
          const el = document.querySelector(sel);
          if (el) {
            el.click();
            // give the page a small moment to update the DOM after the click
            await new Promise((r) => setTimeout(r, 300));
            if (document.getElementById(id) || document.querySelector('[role="dialog"], .overlay, .modal, [data-overlay]')) {
              return true;
            }
          }
        } catch (e) {
          // ignore and continue trying other selectors
        }
      }

      // 1.6) Try clicking common menu toggles / dropdowns which may contain overlay triggers
      const menuToggles = document.querySelectorAll('.splitAction, .split-action, .menu-toggle, .dropdown-toggle, [data-toggle="menu"]');
      for (const mt of menuToggles) {
        try {
          mt.click();
          await new Promise((r) => setTimeout(r, 250));
          // try clicking first actionable item inside the menu
          const menuItem = mt.parentElement?.querySelector('button[data-action], a[data-action], li button, li a');
          if (menuItem) {
            menuItem.click();
            await new Promise((r) => setTimeout(r, 300));
            if (document.getElementById(id)) return true;
          }
        } catch (e) { /* ignore */ }
      }

      // 1.7) Try interacting with the first file row action buttons (preview/rename/etc)
      const firstRowBtnContainer = document.querySelector('tr[data-path] .row-actions, .file-row .row-actions, .item-row .row-actions, tr[data-path], .file-row, .item-row');
      if (firstRowBtnContainer) {
        const rowBtns = Array.from(firstRowBtnContainer.querySelectorAll('button, a'));
        const keywords = ['preview', 'rename', 'create', 'logs', 'unsaved', 'settings', 'confirm', 'delete'];
        for (const btn of rowBtns) {
          try {
            const text = (btn.getAttribute('aria-label') || btn.title || btn.textContent || '').toLowerCase();
            const cls = (btn.className || '').toLowerCase();
            if (keywords.some(k => text.includes(k) || cls.includes(k))) {
              btn.click();
              await new Promise((r) => setTimeout(r, 300));
              if (document.getElementById(id)) return true;
            }
          } catch (e) { /* ignore */ }
        }
      }

      // 1.8) Try opening context menu on the first row and clicking likely menu items
      try {
        const row = document.querySelector('tr[data-path], .file-row, .item-row');
        if (row) {
          const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, view: window });
          row.dispatchEvent(evt);
          await new Promise((r) => setTimeout(r, 250));
          const cmItem = document.querySelector('.context-menu [data-action], .context-menu button, .context-menu a, [role="menu"] [data-action]');
          if (cmItem) {
            cmItem.click();
            await new Promise((r) => setTimeout(r, 300));
            if (document.getElementById(id)) return true;
          }
        }
      } catch (e) { /* ignore */ }

      // 2) Try calling a global open function if available (no params)
      const fnName = fnMap[id];
      if (fnName && typeof window[fnName] === 'function') {
        try {
          const res = window[fnName]();
          // await if it returns a promise
          if (res && typeof res.then === 'function') {
            await res;
          }
          await new Promise((r) => setTimeout(r, 200));
          if (document.getElementById(id) || document.querySelector('[role="dialog"], .overlay, .modal, [data-overlay]')) {
            return true;
          }
        } catch (e) {
          // ignore and continue to next attempts
        }

        // 2.1) Try calling with simple, safe parameters when appropriate
        try {
          if (id === 'create-overlay') {
            // many implementations accept a kind ('file'|'folder')
            if (typeof window[fnName] === 'function') {
              const res2 = window[fnName]('file');
              if (res2 && typeof res2.then === 'function') await res2;
              await new Promise((r) => setTimeout(r, 200));
              if (document.getElementById(id)) return true;
            }
          }
          if (id === 'rename-overlay') {
            // some apps accept an item object; pass a minimal stub
            if (typeof window[fnName] === 'function') {
              const res3 = window[fnName]({ name: 'example.txt', path: '/example.txt' });
              if (res3 && typeof res3.then === 'function') await res3;
              await new Promise((r) => setTimeout(r, 200));
              if (document.getElementById(id)) return true;
            }
          }
        } catch (e) {
          // ignore parameterized attempts
        }
      }

      // 2.2) Try dataset-based triggers (data-action / data-trigger)
      try {
        const short = id.replace('-overlay', '');
        const dataEl = document.querySelector(`[data-action="${short}"], [data-trigger="${short}"], [data-open="${short}"]`);
        if (dataEl) {
          dataEl.click();
          await new Promise((r) => setTimeout(r, 300));
          if (document.getElementById(id)) return true;
        }
      } catch (e) { /* ignore */ }

      // 3) Try revealing the first dialog-like element as a fallback (visual reveal)
      const dialog = document.querySelector('[role="dialog"], .overlay, .modal, [data-overlay]');
      if (dialog) {
        try {
          dialog.hidden = false;
          dialog.setAttribute('aria-hidden', 'false');
          dialog.classList.add('visible', 'tw-overlay');
          document.body.classList.add('modal-open');
          const focusable = dialog.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (focusable) focusable.focus();
          return true;
        } catch (e) {
          try { dialog.style.display = 'block'; return true; } catch (_) { /* ignore */ }
        }
      }

      return false;
    }, overlayId);
  }

  for (const width of breakpoints) {
    await page.setViewportSize({ width, height: 900 });
    // capture main page
    const pagePath = path.join(outDir, `page-${width}.png`);
    await page.screenshot({ path: pagePath, fullPage: true });
    console.log('Saved', pagePath);

    // capture overlays
    for (const id of overlays) {
      const opened = await openOverlayById(id);
      if (!opened) {
        console.log('Overlay not found:', id);
        continue;
      }
      // wait for possible animations
      await page.waitForTimeout(300);
      const overlayPath = path.join(outDir, `${id}-${width}.png`);
      // try to screenshot overlay element
      const success = await page.evaluate((id) => {
        const ov = document.getElementById(id);
        return !!ov;
      }, id);
      if (success) {
        try {
          const el = await page.$(`#${id}`);
          if (el) {
            await el.screenshot({ path: overlayPath });
            console.log('Saved', overlayPath);
          } else {
            await page.screenshot({ path: overlayPath });
            console.log('Saved (full)', overlayPath);
          }
        } catch (e) {
          await page.screenshot({ path: overlayPath });
          console.log('Fallback saved full page for', id);
        }
      }

      // close overlay visually
      await page.evaluate((id) => {
        const ov = document.getElementById(id);
        if (!ov) return;
        try {
          ov.hidden = true;
          ov.setAttribute('aria-hidden', 'true');
          ov.classList.remove('visible', 'tw-overlay');
        } catch (e) {
          ov.style.display = 'none';
        }
      }, id);
    }
  }

  // capture file list / key components
  const targets = ['file-list', 'items-table', 'main-table', 'file-table', 'file-list-container'];
  for (const t of targets) {
    const exists = await page.$(`#${t}`);
    if (!exists) continue;
    const rectPath = path.join(outDir, `${t}.png`);
    try {
      await exists.screenshot({ path: rectPath });
      console.log('Saved', rectPath);
    } catch (e) {
      console.log('Failed capturing', t, e);
    }
  }

  await browser.close();
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});