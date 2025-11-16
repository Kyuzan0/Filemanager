/**
 * File Manager Application - Main Entry Point
 * 
 * Ini adalah file utama aplikasi File Manager yang telah direfaktor
 * menjadi arsitektur modular untuk meningkatkan keterbacaan,
 * modularitas, dan kemudahan perawatan.
 * 
 * Struktur Modular:
 * - state.js: Manajemen state aplikasi
 * - constants.js: Konstanta dan konfigurasi
 * - utils.js: Fungsi utilitas
 * - fileIcons.js: Manajemen ikon file
 * - apiService.js: Layanan API
 * - modals.js: Manajemen modal
 * - uiRenderer.js: Rendering UI
 * - dragDrop.js: Drag & drop functionality
 * - fileOperations.js: Operasi file
 * - eventHandlers.js: Event handlers
 * - logManager.js: Manajemen log
 * - moveOverlay.js: Move overlay functionality
 * - appInitializer.js: Inisialisasi aplikasi
 */

// Import modul-modul yang diperlukan
import { initializeApp } from './modules/appInitializer.js';
import { config } from './modules/constants.js';

/**
 * Inisialisasi aplikasi saat DOM dimuat
 */
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi aplikasi
    initializeApp().catch(error => {
        console.error('Failed to initialize application:', error);
        
        // Tampilkan pesan error kepada pengguna
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('app-error');
        errorDiv.innerHTML = `
            <div class="error-content">
                <h2>Application Error</h2>
                <p>Failed to initialize the File Manager application.</p>
                <p>Please refresh the page to try again.</p>
                <button onclick="window.location.reload()">Refresh Page</button>
            </div>
        `;
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            font-family: Arial, sans-serif;
        `;
        
        const errorContent = errorDiv.querySelector('.error-content');
        errorContent.style.cssText = `
            background: #333;
            padding: 30px;
            border-radius: 8px;
            text-align: center;
            max-width: 400px;
        `;
        
        errorContent.querySelector('h2').style.cssText = `
            margin-top: 0;
            color: #ff6b6b;
        `;
        
        errorContent.querySelector('button').style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
        `;
        
        document.body.appendChild(errorDiv);
    });

    // -------- Settings UI wiring (toggle debug) --------
    try {
        const btnSettings = document.getElementById('btn-settings');
        const settingsOverlay = document.getElementById('settings-overlay');
        const settingsClose = document.getElementById('settings-close');
        const settingsSave = document.getElementById('settings-save');
        const settingsCancel = document.getElementById('settings-cancel');
        const toggleDebug = document.getElementById('toggle-debug');
        const toggleLabel = document.querySelector('label[for="toggle-debug"].toggle');

        // Read saved preference (localStorage key: filemanager_debug)
        const saved = (() => {
            try {
                return localStorage.getItem('filemanager_debug');
            } catch (e) { return null; }
        })();

        const initialDebug = (saved !== null) ? (saved === 'true') : (typeof config !== 'undefined' ? !!config.debugMode : true);

        // Ensure config mirrors saved value
        if (typeof config !== 'undefined') {
            config.debugMode = initialDebug;
            // Backwards compatibility: some modules check config.debug
            config.debug = initialDebug;
        }

        // Helper to update visual state of the custom toggle
        function setToggleState(enabled) {
            if (toggleDebug) {
                toggleDebug.checked = !!enabled;
            }
            if (toggleLabel) {
                toggleLabel.setAttribute('aria-checked', !!enabled);
                toggleLabel.classList.toggle('is-on', !!enabled);
                // make it focusable for keyboard users
                toggleLabel.tabIndex = 0;
            }
        }

        // Initialize UI state
        setToggleState(initialDebug);

        // Make label clickable / keyboard operable to behave like a switch
        if (toggleLabel) {
            // Click toggles the switch
            toggleLabel.addEventListener('click', (ev) => {
                ev.preventDefault();
                const newVal = !(toggleDebug && toggleDebug.checked);
                setToggleState(newVal);
            });

            // Keyboard support (Space / Enter)
            toggleLabel.addEventListener('keydown', (ev) => {
                if (ev.key === ' ' || ev.key === 'Enter') {
                    ev.preventDefault();
                    const newVal = !(toggleDebug && toggleDebug.checked);
                    setToggleState(newVal);
                }
            });
        }

        const openSettings = () => {
            if (settingsOverlay) {
                settingsOverlay.hidden = false;
                settingsOverlay.setAttribute('aria-hidden', 'false');
                // focus first interactive control for accessibility
                (toggleLabel || settingsClose)?.focus();
                document.body.classList.add('modal-open');
            }
        };

        const closeSettings = () => {
            if (settingsOverlay) {
                settingsOverlay.hidden = true;
                settingsOverlay.setAttribute('aria-hidden', 'true');
                document.body.classList.remove('modal-open');
            }
        };

        if (btnSettings) btnSettings.addEventListener('click', openSettings);
        if (settingsClose) settingsClose.addEventListener('click', closeSettings);
        if (settingsCancel) settingsCancel.addEventListener('click', closeSettings);

        if (settingsSave) {
            settingsSave.addEventListener('click', () => {
                const enabled = !!(toggleDebug && toggleDebug.checked);
                try {
                    localStorage.setItem('filemanager_debug', enabled ? 'true' : 'false');
                } catch (e) { /* ignore */ }

                if (typeof config !== 'undefined') {
                    config.debugMode = enabled;
                    config.debug = enabled;
                }

                // Immediate feedback to console (will respect new setting)
                if (!enabled) {
                    // Clear development debug lines that still log directly (best-effort)
                    if (console && console.clear) {
                        console.clear();
                    }
                } else {
                    console.log('Debug logging enabled');
                }

                closeSettings();
            });
        }

        // Close overlay when clicking outside dialog
        if (settingsOverlay) {
            settingsOverlay.addEventListener('click', (e) => {
                if (e.target === settingsOverlay) {
                    closeSettings();
                }
            });
        }
    } catch (e) {
        // Non-fatal: settings UI failed to initialize
        console.warn('Settings UI initialization failed:', e);
    }

    // Fallback: ensure settings button opens overlay even if initialization partially failed
    // Use a small, robust helper and attach both click and keyboard handlers directly to the button.
    function safeOpenSettings() {
        const settingsOverlay = document.getElementById('settings-overlay');
        if (!settingsOverlay) return;

        // Ensure the toggle UI reflects the saved preference (or config) so ARIA state is correct
        const toggleDebug = document.getElementById('toggle-debug');
        const toggleLabel = document.querySelector('label[for="toggle-debug"].toggle');
        const saved = (() => {
            try { return localStorage.getItem('filemanager_debug'); } catch (e) { return null; }
        })();
        const enabled = (saved !== null) ? (saved === 'true') : (typeof config !== 'undefined' ? !!config.debugMode : false);

        if (toggleDebug) {
            toggleDebug.checked = !!enabled;
        }
        if (toggleLabel) {
            toggleLabel.setAttribute('aria-checked', !!enabled);
            toggleLabel.classList.toggle('is-on', !!enabled);
        }

        settingsOverlay.hidden = false;
        settingsOverlay.setAttribute('aria-hidden', 'false');
        // focus first interactive control for accessibility
        (toggleLabel || document.getElementById('settings-close'))?.focus();
        document.body.classList.add('modal-open');
    }

    // Click anywhere inside the settings button (including SVG/span) will open the overlay
    document.addEventListener('click', (event) => {
        const btn = event.target && event.target.closest && event.target.closest('#btn-settings');
        if (btn) {
            safeOpenSettings();
        }
    });

    // Keyboard support: open with Enter or Space when the button is focused
    const btnFallback = document.getElementById('btn-settings');
    if (btnFallback) {
        btnFallback.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                safeOpenSettings();
            }
        });

        // Defensive click attach in case initial setup failed earlier
        btnFallback.addEventListener('click', (ev) => {
            ev.preventDefault();
            safeOpenSettings();
        });
    }
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Log error untuk debugging
    if (window.logger) {
        window.logger.error('Unhandled promise rejection', event.reason);
    }
});

/**
 * Handle global errors
 */
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Log error untuk debugging
    if (window.logger) {
        window.logger.error('Global error', event.error);
    }
});

// Export untuk debugging (hanya di development)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    // Export modul untuk debugging di console
    window.debugModules = {
        // Import modul secara dinamis untuk debugging
        getState: () => import('./modules/state.js'),
        getConstants: () => import('./modules/constants.js'),
        getUtils: () => import('./modules/utils.js'),
        getFileIcons: () => import('./modules/fileIcons.js'),
        getApiService: () => import('./modules/apiService.js'),
        getModals: () => import('./modules/modals.js'),
        getUiRenderer: () => import('./modules/uiRenderer.js'),
        getDragDrop: () => import('./modules/dragDrop.js'),
        getFileOperations: () => import('./modules/fileOperations.js'),
        getEventHandlers: () => import('./modules/eventHandlers.js'),
        getLogManager: () => import('./modules/logManager.js'),
        getMoveOverlay: () => import('./modules/moveOverlay.js'),
        getAppInitializer: () => import('./modules/appInitializer.js'),
        getStorage: () => import('./modules/storage.js')
    };
    
    console.log('Debug modules available at window.debugModules');
    console.log('Storage module included for testing');

    // Test helper for automated visual QA.
    // Usage (from tools/screenshot.js or console): await window.__testOpenOverlay('create-overlay', { kind: 'file' });
    // Enhanced: accepts overlay-specific params to open overlays that require context (item, kind, paths, message).
    window.__testOpenOverlay = async function(id, params = {}) {
        try {
            const fnMap = {
                'preview-overlay': 'openPreviewOverlay',
                'confirm-overlay': 'openConfirmOverlay',
                'create-overlay': 'openCreateOverlay',
                'rename-overlay': 'openRenameOverlay',
                'log-overlay': 'openLogOverlay',
                'unsaved-overlay': 'openUnsavedOverlay',
                'settings-overlay': 'openSettings'
            };

            // 0) If there's an explicit helper defined elsewhere prefer it
            if (typeof window.__testOpenOverlayCustom === 'function') {
                try {
                    const ok = await window.__testOpenOverlayCustom(id, params);
                    if (ok) return true;
                } catch (e) { /* ignore */ }
            }

            // Overlay-specific, parameterized attempts (most deterministic)
            if (id === 'preview-overlay') {
                // prefer passing an item when available
                const item = params.item || params || { name: 'example.txt', path: '/example.txt' };
                const tryFns = ['openPreviewOverlay', 'openMediaPreview', 'openPreview'];
                for (const name of tryFns) {
                    if (typeof window[name] === 'function') {
                        try {
                            const res = window[name](item);
                            if (res && typeof res.then === 'function') await res;
                            await new Promise((r) => setTimeout(r, 250));
                            if (document.getElementById(id)) return true;
                        } catch (e) { /* ignore */ }
                    }
                }
            }

            if (id === 'rename-overlay') {
                const item = params.item || { name: 'example.txt', path: '/example.txt' };
                if (typeof window.openRenameOverlay === 'function') {
                    try {
                        const res = window.openRenameOverlay(item);
                        if (res && typeof res.then === 'function') await res;
                        await new Promise((r) => setTimeout(r, 200));
                        if (document.getElementById(id)) return true;
                    } catch (e) { /* ignore */ }
                }
            }

            if (id === 'create-overlay') {
                const kind = params.kind || 'file';
                if (typeof window.openCreateOverlay === 'function') {
                    try {
                        const res = window.openCreateOverlay(kind);
                        if (res && typeof res.then === 'function') await res;
                        await new Promise((r) => setTimeout(r, 200));
                        if (document.getElementById(id)) return true;
                    } catch (e) { /* ignore */ }
                }
            }

            if (id === 'confirm-overlay') {
                // confirm overlay often accepts an options object
                const opts = params.options || params || { message: 'Confirm action', paths: ['/example.txt'], confirmLabel: 'OK' };
                if (typeof window.openConfirmOverlay === 'function') {
                    try {
                        const res = window.openConfirmOverlay(opts);
                        if (res && typeof res.then === 'function') await res;
                        await new Promise((r) => setTimeout(r, 200));
                        if (document.getElementById(id)) return true;
                    } catch (e) { /* ignore */ }
                }
            }

            if (id === 'log-overlay') {
                const tryNames = ['openLogOverlay', 'openLogModal', 'openLogs'];
                for (const name of tryNames) {
                    if (typeof window[name] === 'function') {
                        try {
                            const res = window[name](params);
                            if (res && typeof res.then === 'function') await res;
                            await new Promise((r) => setTimeout(r, 200));
                            if (document.getElementById(id)) return true;
                        } catch (e) { /* ignore */ }
                    }
                }
            }

            if (id === 'unsaved-overlay') {
                const opts = params.options || params || { message: 'You have unsaved changes' };
                if (typeof window.openUnsavedOverlay === 'function') {
                    try {
                        const res = window.openUnsavedOverlay(opts);
                        if (res && typeof res.then === 'function') await res;
                        await new Promise((r) => setTimeout(r, 200));
                        if (document.getElementById(id)) return true;
                    } catch (e) { /* ignore */ }
                }
            }

            if (id === 'settings-overlay') {
                // settings uses safeOpenSettings in index; try that too
                if (typeof window.openSettings === 'function') {
                    try {
                        const res = window.openSettings();
                        if (res && typeof res.then === 'function') await res;
                        await new Promise((r) => setTimeout(r, 150));
                        if (document.getElementById(id)) return true;
                    } catch (e) { /* ignore */ }
                }
                if (typeof window.safeOpenSettings === 'function') {
                    try {
                        window.safeOpenSettings();
                        await new Promise((r) => setTimeout(r, 150));
                        if (document.getElementById(id)) return true;
                    } catch (e) { /* ignore */ }
                }
            }

            // 1) Try calling a global open function if available (generic)
            const fnName = fnMap[id];
            if (fnName && typeof window[fnName] === 'function') {
                try {
                    const res = window[fnName](params);
                    if (res && typeof res.then === 'function') await res;
                    await new Promise((r) => setTimeout(r, 200));
                    if (document.getElementById(id)) return true;
                } catch (e) { /* ignore */ }
            }

            // 2) Try to reveal element by id (visual reveal)
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

            // 3) Dataset triggers and common selectors (best-effort)
            try {
                const short = id.replace('-overlay', '');
                const dataEl = document.querySelector(`[data-action="${short}"], [data-trigger="${short}"], [data-open="${short}"]`);
                if (dataEl) {
                    dataEl.click();
                    await new Promise((r) => setTimeout(r, 300));
                    if (document.getElementById(id)) return true;
                }
            } catch (e) { /* ignore */ }

            const commonTriggers = ['#btn-create', '#trigger-create', '#btn-settings', '#btn-logs', '#btn-preview', '.btn-preview', '.btn-rename', '#btn-rename', '#btn-delete-selected', '.btn-add', '.split-action', '.splitAction'];
            for (const sel of commonTriggers) {
                try {
                    const el = document.querySelector(sel);
                    if (el) {
                        el.click();
                        await new Promise((r) => setTimeout(r, 300));
                        if (document.getElementById(id)) return true;
                    }
                } catch (e) { /* ignore */ }
            }

            // 4) Try interacting with the first file row (select + click actions + context menu)
            try {
                const firstRow = document.querySelector('tr[data-path], .file-row, .item-row');
                if (firstRow) {
                    try { firstRow.click(); } catch (_) { /* ignore */ }
                    await new Promise((r) => setTimeout(r, 150));
                    const cb = firstRow.querySelector('input[type="checkbox"], .select-checkbox');
                    if (cb && !cb.checked) {
                        try { cb.click(); } catch (_) { /* ignore */ }
                        await new Promise((r) => setTimeout(r, 120));
                    }
                    const actionBtn = firstRow.querySelector('button[aria-label*="preview"], button[aria-label*="rename"], .row-actions button, .row-actions a');
                    if (actionBtn) {
                        try { actionBtn.click(); } catch (_) { /* ignore */ }
                        await new Promise((r) => setTimeout(r, 250));
                        if (document.getElementById(id)) return true;
                    }
                    const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, view: window });
                    firstRow.dispatchEvent(evt);
                    await new Promise((r) => setTimeout(r, 200));
                    const cmItem = document.querySelector('.context-menu [data-action], .context-menu button, .context-menu a, [role="menu"] [data-action]');
                    if (cmItem) {
                        try { cmItem.click(); } catch (_) { /* ignore */ }
                        await new Promise((r) => setTimeout(r, 250));
                        if (document.getElementById(id)) return true;
                    }
                }
            } catch (e) { /* ignore */ }

            return false;
        } catch (err) {
            console.error('Test overlay helper error:', err);
            return false;
        }
    };
 }
