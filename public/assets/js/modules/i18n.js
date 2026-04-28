/**
 * Internationalization (i18n) Module
 * Provides translation support with lazy-loaded JSON language files.
 * @version 1.0.0
 */

import { saveToStorage, loadFromStorage } from './storage.js';

const STORAGE_KEY = 'filemanager_language';
const FALLBACK_LANG = 'id';
const SUPPORTED_LANGS = ['id', 'en'];

let currentLang = FALLBACK_LANG;
let translations = {};
let isLoaded = false;

/**
 * Initialize i18n — load saved language preference and fetch translations.
 * Must be called early in app init (before any t() calls).
 * @returns {Promise<void>}
 */
export async function initI18n() {
    const saved = loadFromStorage(STORAGE_KEY);
    currentLang = SUPPORTED_LANGS.includes(saved) ? saved : detectBrowserLang();

    await loadTranslations(currentLang);
    isLoaded = true;

    // Expose t() globally for constants.js Proxy-based i18n bridge
    window.__i18n_t = t;
}

/**
 * Detect browser language and map to supported lang.
 * @returns {string}
 */
function detectBrowserLang() {
    try {
        const nav = navigator.language || navigator.languages?.[0] || '';
        const code = nav.split('-')[0].toLowerCase();
        return SUPPORTED_LANGS.includes(code) ? code : FALLBACK_LANG;
    } catch {
        return FALLBACK_LANG;
    }
}

/**
 * Load translations JSON for a given language.
 * @param {string} lang
 * @returns {Promise<void>}
 */
async function loadTranslations(lang) {
    try {
        const basePath = getBasePath();
        const resp = await fetch(`${basePath}assets/lang/${lang}.json`, { cache: 'default' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        translations = await resp.json();
    } catch (err) {
        console.warn(`[i18n] Failed to load ${lang}.json, falling back to ${FALLBACK_LANG}`, err);
        if (lang !== FALLBACK_LANG) {
            currentLang = FALLBACK_LANG;
            try {
                const basePath = getBasePath();
                const resp = await fetch(`${basePath}assets/lang/${FALLBACK_LANG}.json`, { cache: 'default' });
                if (resp.ok) translations = await resp.json();
            } catch {
                translations = {};
            }
        }
    }
}

/**
 * Get base path for asset loading (handles subdirectory deployments).
 * @returns {string}
 */
function getBasePath() {
    // Try to detect from current script location or page URL
    const scripts = document.querySelectorAll('script[src*="index.js"]');
    if (scripts.length > 0) {
        const src = scripts[0].getAttribute('src');
        const idx = src.indexOf('assets/');
        if (idx !== -1) return src.substring(0, idx);
    }
    // Fallback: relative to current page
    return '';
}

/**
 * Translate a key. Supports dot notation for nested keys and placeholder interpolation.
 *
 * @param {string} key - Translation key (e.g. 'errors.fetchFailed', 'actions.copy')
 * @param {Object} [params] - Placeholder values (e.g. { count: 5, name: 'file.txt' })
 * @returns {string} Translated string, or the key itself if not found
 *
 * @example
 * t('errors.fetchFailed')           // "Gagal mengambil data"
 * t('toast.itemDeleted', { n: 3 })  // "3 item berhasil dihapus"
 */
export function t(key, params) {
    let value = resolve(translations, key);

    if (value === undefined) {
        // Return the key as-is (makes missing translations visible during dev)
        return key;
    }

    // Interpolate {placeholders}
    if (params && typeof value === 'string') {
        value = value.replace(/\{(\w+)\}/g, (_, name) => {
            return params[name] !== undefined ? String(params[name]) : `{${name}}`;
        });
    }

    return value;
}

/**
 * Resolve a dot-notation key from a nested object.
 * @param {Object} obj
 * @param {string} key
 * @returns {*}
 */
function resolve(obj, key) {
    return key.split('.').reduce((acc, part) => {
        return acc && typeof acc === 'object' ? acc[part] : undefined;
    }, obj);
}

/**
 * Change the active language. Saves preference and reloads translations.
 * @param {string} lang - Language code ('id' or 'en')
 * @returns {Promise<boolean>} true if language changed successfully
 */
export async function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) {
        console.warn(`[i18n] Unsupported language: ${lang}`);
        return false;
    }
    if (lang === currentLang && isLoaded) return true;

    currentLang = lang;
    saveToStorage(STORAGE_KEY, lang);
    await loadTranslations(lang);
    isLoaded = true;

    // Dispatch event so UI components can react
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    return true;
}

/**
 * Get the current active language code.
 * @returns {string}
 */
export function getCurrentLanguage() {
    return currentLang;
}

/**
 * Get list of supported languages with display names.
 * @returns {Array<{code: string, name: string, nativeName: string}>}
 */
export function getSupportedLanguages() {
    return [
        { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
        { code: 'en', name: 'English', nativeName: 'English' },
    ];
}

/**
 * Check if i18n has been initialized.
 * @returns {boolean}
 */
export function isI18nReady() {
    return isLoaded;
}
