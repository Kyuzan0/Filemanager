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
import './modules/toast.js'; // Toast notification system

/**
 * Inisialisasi aplikasi saat DOM dimuat
 */
console.log('[index.js] loaded');
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi aplikasi
    initializeApp().then(() => {
        // Mark app as initialized for automated helpers / test runners
        try { window.__appInitialized = true; } catch (e) {}
    }).catch(error => {
        console.error('Failed to initialize application:', error);
        
        // Tampilkan pesan error kepada pengguna
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('app-error');
        // Build error content using DOM APIs to avoid inline HTML with class attributes
        const errorContent = document.createElement('div');
        errorContent.classList.add('error-content');
        
        const heading = document.createElement('h2');
        heading.textContent = 'Application Error';
        
        const msg1 = document.createElement('p');
        msg1.textContent = 'Failed to initialize the File Manager application.';
        
        const msg2 = document.createElement('p');
        msg2.textContent = 'Please refresh the page to try again.';
        
        const refreshBtn = document.createElement('button');
        refreshBtn.type = 'button';
        refreshBtn.textContent = 'Refresh Page';
        refreshBtn.addEventListener('click', () => window.location.reload());
        
        errorContent.appendChild(heading);
        errorContent.appendChild(msg1);
        errorContent.appendChild(msg2);
        errorContent.appendChild(refreshBtn);
        errorDiv.appendChild(errorContent);
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
        
        // style the errorContent built above
        errorContent.style.cssText = `
            background: #333;
            padding: 30px;
            border-radius: 8px;
            text-align: center;
            max-width: 400px;
        `;
        
        // style heading and refresh button created above
        heading.style.cssText = `
            margin-top: 0;
            color: #ff6b6b;
        `;
        
        refreshBtn.style.cssText = `
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

        // Suppress automatic settings open on initial load unless user explicitly clicks the settings button.
        let __suppressInitialSettingsOpen = true;
        // Clear suppression on first real user interaction
        window.addEventListener('pointerdown', () => { __suppressInitialSettingsOpen = false; }, { once: true });
        window.addEventListener('keydown', () => { __suppressInitialSettingsOpen = false; }, { once: true });

        const openSettings = (evt) => {
            if (!settingsOverlay) return;

            // If still in suppressed phase and this wasn't a trusted user click on the settings button, ignore.
            const isUserGesture = !!(evt && evt.isTrusted);
            const fromSettingsBtn = isUserGesture && evt.currentTarget && evt.currentTarget.id === 'btn-settings';
            if (__suppressInitialSettingsOpen && !fromSettingsBtn) {
                try { console.debug('[settings] openSettings ignored (suppressed initial auto-open)'); } catch(_) {}
                return;
            }

            // Close any other open overlays to prevent stacked semi-transparent backdrops
            try {
                document.querySelectorAll('[id$="-overlay"].visible,[id$="-overlay"][aria-hidden="false"]').forEach(el => {
                    if (el !== settingsOverlay) {
                        el.classList.remove('visible');
                        el.setAttribute('aria-hidden','true');
                        el.hidden = true;
                    }
                });
            } catch (_) {}

            // Reveal settings overlay
            settingsOverlay.hidden = false;
            settingsOverlay.setAttribute('aria-hidden', 'false');

            // Optional: integrate with modal counter if modals module exports markOverlayOpen
            try {
                if (window.debugModules && typeof window.debugModules.getModals === 'function') {
                    window.debugModules.getModals().then(m => {
                        if (m && typeof m.markOverlayOpen === 'function') {
                            try { m.markOverlayOpen(); } catch (_) {}
                        }
                    }).catch(()=>{});
                }
            } catch (_) {}

            // Focus first interactive element
            (toggleLabel || settingsClose)?.focus();
            document.body.classList.add('modal-open');
            try { console.debug('[settings] openSettings executed; other overlays closed'); } catch(_) {}
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

        // Mobile settings button
        const btnSettingsMobile = document.getElementById('btn-settings-mobile');
        if (btnSettingsMobile) {
            btnSettingsMobile.addEventListener('click', openSettings);
        }

        // Fallback: event delegation for any button with data-action="settings"
        document.addEventListener('click', (e) => {
            const settingsButton = e.target.closest('button[data-action="settings"]');
            if (settingsButton && typeof openSettings === 'function') {
                e.preventDefault();
                e.stopPropagation();
                openSettings(e);
            }
        });

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

    // Fallback: robust helper to open settings even if initial wiring partially failed.
    // Respects suppression flag to avoid auto-open on initial load (only proceeds if suppression cleared).
    function safeOpenSettings(evt) {
        const settingsOverlay = document.getElementById('settings-overlay');
        if (!settingsOverlay) return;

        const isUserGesture = !!(evt && evt.isTrusted);
        if (__suppressInitialSettingsOpen && !isUserGesture) {
            try { console.debug('[settings] safeOpenSettings ignored (suppressed initial auto-open)'); } catch(_) {}
            return;
        }

        // Close other visible overlays (log, preview, confirm, create, rename, unsaved, move)
        try {
            document.querySelectorAll('[id$="-overlay"].visible,[id$="-overlay"][aria-hidden="false"]').forEach(el => {
                if (el !== settingsOverlay) {
                    el.classList.remove('visible');
                    el.setAttribute('aria-hidden','true');
                    el.hidden = true;
                }
            });
        } catch (_) {}

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

        // Reveal settings
        settingsOverlay.hidden = false;
        settingsOverlay.setAttribute('aria-hidden', 'false');

        // Optional overlay counter integration
        try {
            if (window.debugModules && typeof window.debugModules.getModals === 'function') {
                window.debugModules.getModals().then(m => {
                    if (m && typeof m.markOverlayOpen === 'function') {
                        try { m.markOverlayOpen(); } catch (_) {}
                    }
                }).catch(()=>{});
            }
        } catch (_) {}

        // Focus first interactive control for accessibility
        (toggleLabel || document.getElementById('settings-close'))?.focus();
        document.body.classList.add('modal-open');
        try { console.debug('[settings] safeOpenSettings executed; other overlays closed'); } catch(_) {}
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
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0' || window.location.port === '8000')) {
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

    // Custom test helper hook (non-invasive)
    // window.__testOpenOverlayCustom lets automation call module-level open helpers or import modules
    // without changing UI markup. It should return true when it successfully opened the requested overlay.
    window.__testOpenOverlayCustom = async function(id, params = {}) {
        try {
            // Defensive helpers
            if (!window.debugModules) return false;
            const getEl = (elId) => document.getElementById(elId) || null;
            const sleep = (ms = 150) => new Promise(r => setTimeout(r, ms));
    
            // Attempt to load modules (best-effort)
            const modImport = await (typeof window.debugModules.getModals === 'function' ? window.debugModules.getModals().catch(() => null) : null);
            const stateImport = await (typeof window.debugModules.getState === 'function' ? window.debugModules.getState().catch(() => null) : null);
            const mod = modImport || {};
    
            // Resolve application state from possible module shapes
            let appState = null;
            if (stateImport) {
                appState = stateImport.state || stateImport.default?.state || (typeof stateImport.getState === 'function' ? await stateImport.getState() : null) || stateImport.default || null;
            }
            // fallback to globals if present
            appState = appState || window.state || window.__appState || null;
    
            // Specific overlay wiring (safely gather required DOM elements and call modal functions)
            if (id === 'create-overlay' && typeof mod.openCreateOverlay === 'function') {
                const createOverlay = getEl('create-overlay');
                const createTitle = getEl('create-title');
                const createSubtitle = getEl('create-subtitle');
                const createLabel = getEl('create-label');
                const createName = getEl('create-name');
                const createHint = getEl('create-hint');
                const createSubmit = getEl('create-submit');
                const kind = params.kind || 'file';
                try {
                    await mod.openCreateOverlay(appState, createOverlay, createTitle, createSubtitle, createLabel, createName, createHint, createSubmit, kind);
                    await sleep(160);
                    const ov = getEl('create-overlay');
                    return !!ov && ov.hidden !== true;
                } catch (e) { /* ignore and continue */ }
            }
    
            if (id === 'rename-overlay' && typeof mod.openRenameOverlay === 'function') {
                const renameOverlay = getEl('rename-overlay');
                const renameTitle = getEl('rename-title');
                const renameSubtitle = getEl('rename-subtitle');
                const renameLabel = getEl('rename-label');
                const renameName = getEl('rename-name');
                const renameHint = getEl('rename-hint');
                const renameSubmit = getEl('rename-submit');
                const item = params.item || { name: 'example.txt', path: '/example.txt' };
                try {
                    await mod.openRenameOverlay(appState, renameOverlay, renameTitle, renameSubtitle, renameLabel, renameName, renameHint, renameSubmit, item);
                    await sleep(160);
                    const ov = getEl('rename-overlay');
                    return !!ov && ov.hidden !== true;
                } catch (e) { /* ignore and continue */ }
            }
    
            if (id === 'confirm-overlay' && typeof mod.openConfirmOverlay === 'function') {
                const confirmOverlay = getEl('confirm-overlay');
                const confirmMessage = getEl('confirm-message');
                const confirmDescription = getEl('confirm-description');
                const confirmList = getEl('confirm-list');
                const confirmConfirm = getEl('confirm-confirm');
                const options = params.options || params || { message: 'Confirm action', paths: ['/example.txt'], confirmLabel: 'OK' };
                try {
                    await mod.openConfirmOverlay(appState, confirmOverlay, confirmMessage, confirmDescription, confirmList, confirmConfirm, options);
                    await sleep(160);
                    const ov = getEl('confirm-overlay');
                    return !!ov && ov.hidden !== true;
                } catch (e) { /* ignore and continue */ }
            }
    
            if (id === 'preview-overlay' && typeof mod.openPreviewOverlay === 'function') {
                const previewOverlay = getEl('preview-overlay');
                const previewClose = getEl('preview-close');
                const item = params.item || params || { name: 'example.txt', path: '/example.txt' };
                try {
                    await mod.openPreviewOverlay(appState, previewOverlay, previewClose, item);
                    await sleep(200);
                    const ov = getEl('preview-overlay');
                    return !!ov && ov.hidden !== true;
                } catch (e) { /* ignore and continue */ }
            }
    
            if (id === 'log-overlay') {
                // try several possible exports for logs
                const tryNames = ['openLogOverlay', 'openLogModal', 'openLogs'];
                for (const name of tryNames) {
                    if (typeof mod[name] === 'function') {
                        try {
                            await mod[name](appState, getEl('log-overlay'));
                            await sleep(160);
                            const ov = getEl('log-overlay');
                            if (ov && ov.hidden !== true) return true;
                        } catch (e) { /* ignore */ }
                    }
                }
            }
    
            if (id === 'unsaved-overlay' && typeof mod.openUnsavedOverlay === 'function') {
                const unsavedOverlay = getEl('unsaved-overlay');
                const options = params.options || params || { message: 'You have unsaved changes' };
                try {
                    await mod.openUnsavedOverlay(appState, unsavedOverlay, options);
                    await sleep(160);
                    const ov = getEl('unsaved-overlay');
                    return !!ov && ov.hidden !== true;
                } catch (e) { /* ignore */ }
            }
    
            if (id === 'settings-overlay') {
                // prefer existing helpers on window (safeOpenSettings / openSettings)
                if (typeof window.safeOpenSettings === 'function') {
                    try { window.safeOpenSettings(); await sleep(120); const ov = getEl('settings-overlay'); if (ov && ov.hidden !== true) return true; } catch (e) { /* ignore */ }
                }
                if (typeof window.openSettings === 'function') {
                    try { await window.openSettings(); await sleep(120); const ov = getEl('settings-overlay'); if (ov && ov.hidden !== true) return true; } catch (e) { /* ignore */ }
                }
                // fallback to modal export
                if (typeof mod.openSettings === 'function') {
                    try { await mod.openSettings(appState); await sleep(120); const ov = getEl('settings-overlay'); if (ov && ov.hidden !== true) return true; } catch (e) { /* ignore */ }
                }
            }
    
            // Generic fallback: try calling any exported function mapped to the id with params or appState
            const fnMap = {
                'preview-overlay': 'openPreviewOverlay',
                'confirm-overlay': 'openConfirmOverlay',
                'create-overlay': 'openCreateOverlay',
                'rename-overlay': 'openRenameOverlay',
                'log-overlay': 'openLogOverlay',
                'unsaved-overlay': 'openUnsavedOverlay',
                'settings-overlay': 'openSettings'
            };
            const fnName = fnMap[id];
            if (fnName && typeof mod[fnName] === 'function') {
                try {
                    // Try call with params, then with appState if first attempt fails
                    let called = false;
                    try {
                        const r = mod[fnName](params);
                        if (r && typeof r.then === 'function') await r;
                        called = true;
                    } catch (_) { /* ignore */ }
                    if (!called && appState) {
                        try {
                            const r2 = mod[fnName](appState, params);
                            if (r2 && typeof r2.then === 'function') await r2;
                            called = true;
                        } catch (_) { /* ignore */ }
                    }
                    await sleep(160);
                    const ov = document.getElementById(id);
                    if (ov && ov.hidden !== true) return true;
                } catch (e) { /* ignore */ }
            }
    
            // Visual reveal fallback: unhide element by id
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
    
            return false;
        } catch (err) {
            console.warn('Custom test overlay helper error:', err);
            return false;
        }
    };
/*
  Enhanced non-invasive test helper (injected override)
  - Provides ensureEl + tryCall helpers
  - Adds debug logs for manual testing
  - Replaces the prior window.__testOpenOverlayCustom by assignment below
*/
function __testOpenOverlayCustomEnhanced(id, params = {}) {
    return (async function () {
        try {
            if (!window.debugModules) return false;
            const getEl = (elId) => document.getElementById(elId) || null;
            const sleep = (ms = 150) => new Promise(r => setTimeout(r, ms));

            try { console.debug(`[__testOpenOverlayCustomEnhanced] start id=${id}`, params); } catch (_) {}

            // Ensure an element exists; create a minimal fallback for automation when necessary
            const ensureEl = (elId, tag = 'div', opts = {}) => {
                let el = document.getElementById(elId);
                if (!el) {
                    try {
                        el = document.createElement(tag);
                        el.id = elId;
                        el.hidden = true;
                        el.setAttribute('aria-hidden', 'true');
                        if (opts.attrs) {
                            Object.entries(opts.attrs).forEach(([k, v]) => el.setAttribute(k, v));
                        }
                        if (elId.endsWith('-overlay')) {
                            const dialog = document.createElement('div');
                            dialog.className = `${elId.replace('-overlay', '')}-dialog`;
                            const btn = document.createElement('button');
                            btn.type = 'button';
                            btn.style.display = 'none';
                            dialog.appendChild(btn);
                            el.appendChild(dialog);
                        }
                        document.body.appendChild(el);
                        try { console.warn(`[__testOpenOverlayCustomEnhanced] created fallback element #${elId}`); } catch (_) {}
                    } catch (e) {
                        try { console.warn(`[__testOpenOverlayCustomEnhanced] failed to create #${elId}`, e); } catch (_) {}
                    }
                }
                return el;
            };

            // Load modules (best-effort)
            const modImport = await (typeof window.debugModules.getModals === 'function' ? window.debugModules.getModals().catch(() => null) : null);
            const stateImport = await (typeof window.debugModules.getState === 'function' ? window.debugModules.getState().catch(() => null) : null);
            const mod = modImport || {};
            try { console.debug('[__testOpenOverlayCustomEnhanced] modImport=', !!modImport, 'stateImport=', !!stateImport); } catch(_) {}

            // Resolve app state from common shapes
            let appState = null;
            if (stateImport) {
                appState = stateImport.state || stateImport.default?.state || (typeof stateImport.getState === 'function' ? await stateImport.getState() : null) || stateImport.default || null;
            }
            appState = appState || window.state || window.__appState || null;
            try { console.debug('[__testOpenOverlayCustomEnhanced] appState resolved=', !!appState); } catch(_) {}

            // Helper to safely call modal functions
            const tryCall = async (fn, ...args) => {
                try {
                    const res = fn(...args);
                    if (res && typeof res.then === 'function') await res;
                    await sleep(160);
                    const ov = document.getElementById(id);
                    return !!ov && ov.hidden !== true;
                } catch (e) {
                    try { console.debug(`[__testOpenOverlayCustomEnhanced] call failed for ${fn.name || 'fn'}`, e); } catch(_) {}
                    return false;
                }
            };

            // Overlay-specific attempts (using ensureEl for missing DOM)
            if (id === 'create-overlay' && typeof mod.openCreateOverlay === 'function') {
                const createOverlay = ensureEl('create-overlay');
                const createTitle = ensureEl('create-title', 'h2');
                const createSubtitle = ensureEl('create-subtitle', 'p');
                const createLabel = ensureEl('create-label', 'label');
                const createName = ensureEl('create-name', 'input'); try { createName.type = 'text'; } catch(_) {}
                const createHint = ensureEl('create-hint', 'p');
                const createSubmit = ensureEl('create-submit', 'button'); try { createSubmit.type = 'button'; } catch(_) {}
                const kind = params.kind || 'file';
                const ok = await tryCall(mod.openCreateOverlay, appState, createOverlay, createTitle, createSubtitle, createLabel, createName, createHint, createSubmit, kind);
                if (ok) { try { console.debug('[__testOpenOverlayCustomEnhanced] openCreateOverlay succeeded'); } catch(_) {} return true; }
            }

            if (id === 'rename-overlay' && typeof mod.openRenameOverlay === 'function') {
                const renameOverlay = ensureEl('rename-overlay');
                const renameTitle = ensureEl('rename-title', 'h2');
                const renameSubtitle = ensureEl('rename-subtitle', 'p');
                const renameLabel = ensureEl('rename-label', 'label');
                const renameName = ensureEl('rename-name', 'input'); try { renameName.type = 'text'; } catch(_) {}
                const renameHint = ensureEl('rename-hint', 'p');
                const renameSubmit = ensureEl('rename-submit', 'button'); try { renameSubmit.type = 'button'; } catch(_) {}
                const item = params.item || { name: 'example.txt', path: '/example.txt' };
                const ok = await tryCall(mod.openRenameOverlay, appState, renameOverlay, renameTitle, renameSubtitle, renameLabel, renameName, renameHint, renameSubmit, item);
                if (ok) { try { console.debug('[__testOpenOverlayCustomEnhanced] openRenameOverlay succeeded'); } catch(_) {} return true; }
            }

            if (id === 'confirm-overlay' && typeof mod.openConfirmOverlay === 'function') {
                const confirmOverlay = ensureEl('confirm-overlay');
                const confirmMessage = ensureEl('confirm-message', 'p');
                const confirmDescription = ensureEl('confirm-description', 'p');
                const confirmList = ensureEl('confirm-list', 'ul');
                const confirmConfirm = ensureEl('confirm-confirm', 'button'); try { confirmConfirm.type = 'button'; } catch(_) {}
                const options = params.options || params || { message: 'Confirm action', paths: ['/example.txt'], confirmLabel: 'OK' };
                const ok = await tryCall(mod.openConfirmOverlay, appState, confirmOverlay, confirmMessage, confirmDescription, confirmList, confirmConfirm, options);
                if (ok) { try { console.debug('[__testOpenOverlayCustomEnhanced] openConfirmOverlay succeeded'); } catch(_) {} return true; }
            }

            if (id === 'preview-overlay' && typeof mod.openPreviewOverlay === 'function') {
                const previewOverlay = ensureEl('preview-overlay');
                const previewClose = ensureEl('preview-close', 'button'); try { previewClose.type = 'button'; } catch(_) {}
                const item = params.item || params || { name: 'example.txt', path: '/example.txt' };
                const ok = await tryCall(mod.openPreviewOverlay, appState, previewOverlay, previewClose, item);
                if (ok) { try { console.debug('[__testOpenOverlayCustomEnhanced] openPreviewOverlay succeeded'); } catch(_) {} return true; }
            }

            if (id === 'log-overlay') {
                const tryNames = ['openLogOverlay', 'openLogModal', 'openLogs'];
                for (const name of tryNames) {
                    if (typeof mod[name] === 'function') {
                        const ok = await tryCall(mod[name], appState, ensureEl('log-overlay'));
                        if (ok) { try { console.debug('[__testOpenOverlayCustomEnhanced] log fn succeeded', name); } catch(_) {} return true; }
                    }
                }
            }

            if (id === 'unsaved-overlay' && typeof mod.openUnsavedOverlay === 'function') {
                const unsavedOverlay = ensureEl('unsaved-overlay');
                const options = params.options || params || { message: 'You have unsaved changes' };
                const ok = await tryCall(mod.openUnsavedOverlay, appState, unsavedOverlay, options);
                if (ok) { try { console.debug('[__testOpenOverlayCustomEnhanced] openUnsavedOverlay succeeded'); } catch(_) {} return true; }
            }

            if (id === 'settings-overlay') {
                if (typeof window.safeOpenSettings === 'function') {
                    try { window.safeOpenSettings(); await sleep(120); const ov = getEl('settings-overlay'); if (ov && ov.hidden !== true) { try { console.debug('[__testOpenOverlayCustomEnhanced] safeOpenSettings succeeded'); } catch(_) {} return true; } } catch(_) {}
                }
                if (typeof window.openSettings === 'function') {
                    try { await window.openSettings(); await sleep(120); const ov = getEl('settings-overlay'); if (ov && ov.hidden !== true) { try { console.debug('[__testOpenOverlayCustomEnhanced] openSettings succeeded'); } catch(_) {} return true; } } catch(_) {}
                }
                if (typeof mod.openSettings === 'function') {
                    const ok = await tryCall(mod.openSettings, appState);
                    if (ok) { try { console.debug('[__testOpenOverlayCustomEnhanced] openSettings succeeded'); } catch(_) {} return true; }
                }
            }

            // Generic fallback: try module fn -> visual reveal -> dataset triggers -> row interactions
            const fnMap = {
                'preview-overlay': 'openPreviewOverlay',
                'confirm-overlay': 'openConfirmOverlay',
                'create-overlay': 'openCreateOverlay',
                'rename-overlay': 'openRenameOverlay',
                'log-overlay': 'openLogOverlay',
                'unsaved-overlay': 'openUnsavedOverlay',
                'settings-overlay': 'openSettings'
            };
            const fnName = fnMap[id];
            if (fnName && typeof mod[fnName] === 'function') {
                if (params && Object.keys(params).length > 0) {
                    const ok = await tryCall(mod[fnName], params);
                    if (ok) return true;
                }
                if (appState) {
                    const ok2 = await tryCall(mod[fnName], appState, params);
                    if (ok2) return true;
                }
            }

            // Visual reveal fallback (non-invasive)
            const ov = document.getElementById(id);
            if (ov) {
                try {
                    ov.hidden = false;
                    ov.setAttribute('aria-hidden', 'false');
                    ov.classList.add('visible', 'tw-overlay');
                    document.body.classList.add('modal-open');
                    const focusable = ov.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                    if (focusable) focusable.focus();
                    try { console.debug('[__testOpenOverlayCustomEnhanced] visual reveal succeeded for', id); } catch(_) {}
                    return true;
                } catch (e) {
                    try { ov.style.display = 'block'; return true; } catch(_) {}
                }
            }

            // dataset triggers and common selectors
            try {
                const short = id.replace('-overlay', '');
                const dataEl = document.querySelector(`[data-action="${short}"], [data-trigger="${short}"], [data-open="${short}"]`);
                if (dataEl) {
                    dataEl.click();
                    await sleep(300);
                    if (document.getElementById(id)) return true;
                }
            } catch (_) {}

            const commonTriggers = ['#btn-create', '#trigger-create', '#btn-settings', '#btn-logs', '#btn-preview', '.btn-preview', '.btn-rename', '#btn-rename', '#btn-delete-selected', '.btn-add', '.split-action', '.splitAction'];
            for (const sel of commonTriggers) {
                try {
                    const el = document.querySelector(sel);
                    if (el) {
                        el.click();
                        await sleep(300);
                        if (document.getElementById(id)) return true;
                    }
                } catch (_) {}
            }

            // Try interacting with the first file row (context menu etc.)
            try {
                const firstRow = document.querySelector('tr[data-path], .file-row, .item-row');
                if (firstRow) {
                    try { firstRow.click(); } catch(_) {}
                    await sleep(150);
                    const cb = firstRow.querySelector('input[type="checkbox"], .select-checkbox');
                    if (cb && !cb.checked) { try { cb.click(); } catch(_) {} await sleep(120); }
                    const actionBtn = firstRow.querySelector('button[aria-label*="preview"], button[aria-label*="rename"], .row-actions button, .row-actions a');
                    if (actionBtn) { try { actionBtn.click(); } catch(_) {} await sleep(250); if (document.getElementById(id)) return true; }
                    const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, view: window });
                    firstRow.dispatchEvent(evt);
                    await sleep(200);
                    const cmItem = document.querySelector('.context-menu [data-action], .context-menu button, .context-menu a, [role="menu"] [data-action]');
                    if (cmItem) { try { cmItem.click(); } catch(_) {} await sleep(250); if (document.getElementById(id)) return true; }
                }
            } catch (_) {}

            return false;
        } catch (err) {
            try { console.error('[__testOpenOverlayCustomEnhanced] error', err); } catch(_) {}
            return false;
        }
    })();
}

// Replace existing helper (non-invasive) so manual tests and automation will use the enhanced logic
try {
    window.__testOpenOverlayCustom = __testOpenOverlayCustomEnhanced;
    try { console.debug('[__testOpenOverlayCustomEnhanced] installed override for window.__testOpenOverlayCustom'); } catch(_) {}
} catch (_) {}

// Wait helper for automated tests — ensures app is ready before attempting overlays
const _waitForAppInit = async (timeout = 2000) => {
    try {
        const start = Date.now();
        while (!(window.__appInitialized || document.getElementById('file-table')) && (Date.now() - start) < timeout) {
            await new Promise((r) => setTimeout(r, 100));
        }
        return !!(window.__appInitialized || document.getElementById('file-table'));
    } catch (e) {
        return false;
    }
};
    // Test helper for automated visual QA.
    // Usage (from tools/screenshot.js or console): await window.__testOpenOverlay('create-overlay', { kind: 'file' });
    // Enhanced: accepts overlay-specific params to open overlays that require context (item, kind, paths, message).
    window.__testOpenOverlay = async function(id, params = {}) {
        try {
            // Ensure app is initialized before attempting to open overlays
            try { await _waitForAppInit(2000); } catch (e) { /* ignore */ }

            try { console.debug('[__testOpenOverlay] start id=', id, 'params=', params); } catch (_) {}

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
                    if (ok) {
                        try { console.debug('[__testOpenOverlay] __testOpenOverlayCustom succeeded for', id); } catch (_) {}
                        return true;
                    }
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
                            if (document.getElementById(id)) {
                                try { console.debug('[__testOpenOverlay] global fn', name, 'opened', id); } catch (_) {}
                                return true;
                            }
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
                        if (document.getElementById(id)) {
                            try { console.debug('[__testOpenOverlay] openRenameOverlay succeeded'); } catch (_) {}
                            return true;
                        }
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
                        if (document.getElementById(id)) {
                            try { console.debug('[__testOpenOverlay] openCreateOverlay succeeded'); } catch (_) {}
                            return true;
                        }
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
                        if (document.getElementById(id)) {
                            try { console.debug('[__testOpenOverlay] openConfirmOverlay succeeded'); } catch (_) {}
                            return true;
                        }
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
                            if (document.getElementById(id)) {
                                try { console.debug('[__testOpenOverlay] global log fn', name, 'succeeded'); } catch (_) {}
                                return true;
                            }
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
                        if (document.getElementById(id)) {
                            try { console.debug('[__testOpenOverlay] openUnsavedOverlay succeeded'); } catch (_) {}
                            return true;
                        }
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
                        if (document.getElementById(id)) {
                            try { console.debug('[__testOpenOverlay] openSettings succeeded'); } catch (_) {}
                            return true;
                        }
                    } catch (e) { /* ignore */ }
                }
                if (typeof window.safeOpenSettings === 'function') {
                    try {
                        window.safeOpenSettings();
                        await new Promise((r) => setTimeout(r, 150));
                        if (document.getElementById(id)) {
                            try { console.debug('[__testOpenOverlay] safeOpenSettings succeeded'); } catch (_) {}
                            return true;
                        }
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
                    if (document.getElementById(id)) {
                        try { console.debug('[__testOpenOverlay] global fnName', fnName, 'opened', id); } catch (_) {}
                        return true;
                    }
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
                    try { console.debug('[__testOpenOverlay] visual reveal succeeded for', id); } catch (_) {}
                    return true;
                } catch (e) {
                    try { ov.style.display = 'block'; try { console.debug('[__testOpenOverlay] visual reveal fallback display block for', id); } catch (_) {} return true; } catch (_) { /* ignore */ }
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
