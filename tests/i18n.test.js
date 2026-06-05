/**
 * Internationalization (i18n) Module Tests
 * Tests for public/assets/js/modules/i18n.js
 */

import {
    initI18n,
    t,
    setLanguage,
    getCurrentLanguage,
    getSupportedLanguages,
    isI18nReady
} from '../public/assets/js/modules/i18n.js';

import { saveToStorage, loadFromStorage } from '../public/assets/js/modules/storage.js';

// Mock translation files
const mockTranslations = {
    id: {
        actions: {
            copy: 'Salin',
            delete: 'Hapus'
        },
        toast: {
            itemDeleted: '{count} item berhasil dihapus',
            welcome: 'Selamat datang, {name}!'
        }
    },
    en: {
        actions: {
            copy: 'Copy',
            delete: 'Delete'
        },
        toast: {
            itemDeleted: '{count} items successfully deleted',
            welcome: 'Welcome, {name}!'
        }
    }
};

describe('i18n Module', () => {
    let originalNavigator;

    beforeAll(() => {
        // Mock global fetch
        global.fetch = jest.fn();
        
        // Save original navigator
        originalNavigator = global.navigator;
    });

    beforeEach(() => {
        // Reset localStorage and mocks
        localStorage.clear();
        jest.clearAllMocks();
        
        // Setup default fetch mock response
        global.fetch.mockImplementation((url) => {
            const isEn = url.includes('en.json');
            const data = isEn ? mockTranslations.en : mockTranslations.id;
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve(data)
            });
        });

        // Set default browser lang mock
        Object.defineProperty(global, 'navigator', {
            value: {
                language: 'id-ID',
                languages: ['id-ID', 'id']
            },
            configurable: true
        });
    });

    afterAll(() => {
        // Restore original navigator
        Object.defineProperty(global, 'navigator', {
            value: originalNavigator,
            configurable: true
        });
    });

    describe('getSupportedLanguages()', () => {
        test('returns supported languages with name and code', () => {
            const langs = getSupportedLanguages();
            expect(langs).toEqual([
                { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
                { code: 'en', name: 'English', nativeName: 'English' }
            ]);
        });
    });

    describe('initI18n()', () => {
        test('initializes with fallback language if storage and navigator are empty', async () => {
            Object.defineProperty(global, 'navigator', {
                value: {},
                configurable: true
            });

            await initI18n();
            expect(getCurrentLanguage()).toBe('id');
            expect(isI18nReady()).toBe(true);
            expect(window.__i18n_t).toBe(t);
        });

        test('initializes with saved language preference from storage', async () => {
            saveToStorage('filemanager_language', 'en');

            await initI18n();
            expect(getCurrentLanguage()).toBe('en');
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('en.json'), expect.any(Object));
        });

        test('initializes with navigator language if storage is empty', async () => {
            Object.defineProperty(global, 'navigator', {
                value: {
                    language: 'en-US',
                    languages: ['en-US', 'en']
                },
                configurable: true
            });

            await initI18n();
            expect(getCurrentLanguage()).toBe('en');
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('en.json'), expect.any(Object));
        });

        test('handles fetch failure and falls back to id', async () => {
            // Mock fetch error for english
            global.fetch.mockImplementation((url) => {
                if (url.includes('en.json')) {
                    return Promise.resolve({
                        ok: false,
                        status: 500
                    });
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(mockTranslations.id)
                });
            });

            saveToStorage('filemanager_language', 'en');

            await initI18n();
            // Should fallback to id
            expect(getCurrentLanguage()).toBe('id');
        });
    });

    describe('t() - Translation', () => {
        beforeEach(async () => {
            saveToStorage('filemanager_language', 'id');
            await initI18n();
        });

        test('translates normal keys', () => {
            expect(t('actions.copy')).toBe('Salin');
        });

        test('returns key itself if translation is missing', () => {
            expect(t('actions.nonexistent')).toBe('actions.nonexistent');
        });

        test('interpolates single placeholder parameters', () => {
            expect(t('toast.welcome', { name: 'Budi' })).toBe('Selamat datang, Budi!');
        });

        test('interpolates multiple/number placeholder parameters', () => {
            expect(t('toast.itemDeleted', { count: 3 })).toBe('3 item berhasil dihapus');
        });

        test('keeps placeholder tag if parameter is missing', () => {
            expect(t('toast.welcome')).toBe('Selamat datang, {name}!');
        });
    });

    describe('setLanguage()', () => {
        beforeEach(async () => {
            saveToStorage('filemanager_language', 'id');
            await initI18n();
        });

        test('changes language successfully and updates storage', async () => {
            const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');
            const result = await setLanguage('en');

            expect(result).toBe(true);
            expect(getCurrentLanguage()).toBe('en');
            expect(loadFromStorage('filemanager_language')).toBe('en');
            
            // Should dispatch languageChanged event
            expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
            const event = dispatchEventSpy.mock.calls[0][0];
            expect(event.type).toBe('languageChanged');
            expect(event.detail).toEqual({ lang: 'en' });
            
            dispatchEventSpy.mockRestore();
        });

        test('does not reload if language is already active', async () => {
            global.fetch.mockClear();
            const result = await setLanguage('id');

            expect(result).toBe(true);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('returns false for unsupported language', async () => {
            const result = await setLanguage('fr');
            expect(result).toBe(false);
            expect(getCurrentLanguage()).toBe('id');
        });
    });
});
