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
  async function openOverlayById(overlayId) {
    return page.evaluate((id) => {
      const ov = document.getElementById(id);
      if (!ov) return false;
      try {
        ov.hidden = false;
        ov.setAttribute('aria-hidden', 'false');
        ov.classList.add('visible', 'tw-overlay');
        document.body.classList.add('modal-open');
        const focusable = ov.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) focusable.focus();
        return true;
      } catch (e) {
        // fallback visual open
        ov.style.display = 'block';
        return true;
      }
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