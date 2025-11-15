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

/**
 * Inisialisasi aplikasi saat DOM dimuat
 */
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi aplikasi
    initializeApp().catch(error => {
        console.error('Failed to initialize application:', error);
        
        // Tampilkan pesan error kepada pengguna
        const errorDiv = document.createElement('div');
        errorDiv.className = 'app-error';
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
}
