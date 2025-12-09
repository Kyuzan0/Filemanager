/**
 * Accessibility Module
 * Provides WCAG 2.1 AA compliant accessibility features for the File Manager
 * 
 * Features:
 * - ARIA labels and live regions
 * - Focus management for modals and overlays
 * - Keyboard navigation for file lists
 * - Screen reader announcements
 */

import { state } from './state.js';
import { debugLog } from './debug.js';

// ============================================================================
// ARIA Live Region Management
// ============================================================================

/**
 * Create or get the live region for screen reader announcements
 * @returns {HTMLElement} The live region element
 */
let liveRegion = null;
let statusRegion = null;

/**
 * Initialize ARIA live regions for screen reader announcements
 */
export function initLiveRegions() {
    // Main announcements region (polite)
    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'a11y-announcer';
        liveRegion.setAttribute('role', 'status');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.classList.add('sr-only');
        document.body.appendChild(liveRegion);
    }

    // Status region for urgent updates (assertive)
    if (!statusRegion) {
        statusRegion = document.createElement('div');
        statusRegion.id = 'a11y-status';
        statusRegion.setAttribute('role', 'alert');
        statusRegion.setAttribute('aria-live', 'assertive');
        statusRegion.setAttribute('aria-atomic', 'true');
        statusRegion.classList.add('sr-only');
        document.body.appendChild(statusRegion);
    }

    debugLog('[Accessibility] Live regions initialized');
}

/**
 * Announce a message to screen readers (polite)
 * @param {string} message - The message to announce
 * @param {Object} options - Options for the announcement
 * @param {boolean} options.assertive - Use assertive announcement (urgent)
 * @param {number} options.delay - Delay before announcement in ms
 */
export function announce(message, options = {}) {
    const { assertive = false, delay = 100 } = options;
    const region = assertive ? statusRegion : liveRegion;

    if (!region) {
        initLiveRegions();
    }

    // Clear previous message first
    setTimeout(() => {
        if (region) {
            region.textContent = '';
            setTimeout(() => {
                region.textContent = message;
                debugLog('[Accessibility] Announced:', message);
            }, 50);
        }
    }, delay);
}

/**
 * Announce an action result to screen readers
 * @param {string} action - The action performed (e.g., 'deleted', 'moved')
 * @param {string} itemName - The name of the item affected
 * @param {boolean} success - Whether the action was successful
 */
export function announceAction(action, itemName, success = true) {
    const status = success ? 'berhasil' : 'gagal';
    const message = `${itemName} ${action} ${status}`;
    announce(message, { assertive: !success });
}

/**
 * Announce selection change
 * @param {number} count - Number of selected items
 */
export function announceSelection(count) {
    const message = count === 0 
        ? 'Tidak ada item yang dipilih'
        : `${count} item dipilih`;
    announce(message);
}

/**
 * Announce navigation
 * @param {string} path - The current path
 */
export function announceNavigation(path) {
    const message = path 
        ? `Navigasi ke folder ${path}`
        : 'Navigasi ke folder root';
    announce(message);
}

/**
 * Announce loading state
 * @param {boolean} isLoading - Whether loading is in progress
 * @param {string} context - Context of loading (e.g., 'folder', 'file')
 */
export function announceLoading(isLoading, context = 'konten') {
    const message = isLoading 
        ? `Memuat ${context}...`
        : `${context} selesai dimuat`;
    announce(message);
}

// ============================================================================
// ARIA Label Management
// ============================================================================

/**
 * Add ARIA labels to file list items
 * @param {HTMLElement} tableBody - The table body containing file rows
 */
export function addFileListAriaLabels(tableBody) {
    if (!tableBody) return;

    const rows = tableBody.querySelectorAll('tr[data-item-path]');
    rows.forEach((row, index) => {
        const path = row.dataset.itemPath;
        const type = row.dataset.itemType;
        const nameCell = row.querySelector('.item-name a, .item-name .item-link');
        const name = nameCell ? nameCell.textContent : path.split('/').pop();

        // Set row attributes
        row.setAttribute('role', 'row');
        row.setAttribute('aria-rowindex', String(index + 1));
        
        const typeLabel = type === 'folder' ? 'Folder' : 'File';
        row.setAttribute('aria-label', `${typeLabel}: ${name}`);

        // Add selection state
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox) {
            const isSelected = checkbox.checked;
            row.setAttribute('aria-selected', String(isSelected));
        }
    });

    debugLog('[Accessibility] File list ARIA labels added');
}

/**
 * Add ARIA labels to buttons and controls
 */
export function addControlAriaLabels() {
    // Navigation buttons
    const upButton = document.querySelector('.up-row, [data-action="go-up"]');
    if (upButton) {
        upButton.setAttribute('aria-label', 'Kembali ke folder induk');
    }

    // Action buttons with icons only
    const iconButtons = document.querySelectorAll('.action-icon-btn, .btn-icon');
    iconButtons.forEach(btn => {
        if (!btn.getAttribute('aria-label') && btn.title) {
            btn.setAttribute('aria-label', btn.title);
        }
    });

    // Sort headers
    const sortHeaders = document.querySelectorAll('th[data-sort-key]');
    sortHeaders.forEach(header => {
        const sortKey = header.dataset.sortKey;
        const direction = state.sortDirection === 'asc' ? 'naik' : 'turun';
        const isActive = state.sortKey === sortKey;
        
        header.setAttribute('role', 'columnheader');
        header.setAttribute('aria-sort', isActive 
            ? (state.sortDirection === 'asc' ? 'ascending' : 'descending')
            : 'none'
        );
        
        if (isActive) {
            header.setAttribute('aria-label', `Urut berdasarkan ${sortKey}, ${direction}`);
        } else {
            header.setAttribute('aria-label', `Urut berdasarkan ${sortKey}`);
        }
    });

    // File table
    const fileTable = document.querySelector('#fileTable, table');
    if (fileTable) {
        fileTable.setAttribute('role', 'grid');
        fileTable.setAttribute('aria-label', 'Daftar file dan folder');
    }

    debugLog('[Accessibility] Control ARIA labels added');
}

/**
 * Update selection ARIA state for a row
 * @param {HTMLElement} row - The table row element
 * @param {boolean} isSelected - Whether the item is selected
 */
export function updateRowSelectionAria(row, isSelected) {
    row.setAttribute('aria-selected', String(isSelected));
}

// ============================================================================
// Focus Management
// ============================================================================

// Stack to track focus history for nested modals
const focusStack = [];
let focusTrapActive = false;
let currentFocusTrap = null;

/**
 * Save current focus and set up focus trap for modal
 * @param {HTMLElement} modal - The modal/overlay element
 * @param {HTMLElement} firstFocusable - Element to focus first (optional)
 */
export function trapFocusInModal(modal, firstFocusable = null) {
    if (!modal) return;

    // Save current focus
    const previouslyFocused = document.activeElement;
    focusStack.push(previouslyFocused);

    // Find focusable elements
    const focusableSelector = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    const focusableElements = modal.querySelectorAll(focusableSelector);
    const firstElement = firstFocusable || focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    if (firstElement) {
        setTimeout(() => firstElement.focus(), 0);
    }

    // Set up focus trap handler
    const handleKeyDown = (event) => {
        if (event.key !== 'Tab') return;

        if (event.shiftKey) {
            // Shift+Tab: moving backwards
            if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab: moving forwards
            if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    };

    modal.addEventListener('keydown', handleKeyDown);
    currentFocusTrap = { modal, handler: handleKeyDown };
    focusTrapActive = true;

    // Mark modal for accessibility
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');

    debugLog('[Accessibility] Focus trapped in modal');
}

/**
 * Release focus trap and restore previous focus
 * @param {HTMLElement} modal - The modal/overlay element (optional)
 */
export function releaseFocusTrap(modal = null) {
    // Remove focus trap handler
    if (currentFocusTrap) {
        currentFocusTrap.modal.removeEventListener('keydown', currentFocusTrap.handler);
        currentFocusTrap = null;
    }

    focusTrapActive = false;

    // Restore previous focus
    const previouslyFocused = focusStack.pop();
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        // Small delay to ensure modal is fully closed
        setTimeout(() => {
            try {
                previouslyFocused.focus();
                debugLog('[Accessibility] Focus restored to', previouslyFocused);
            } catch (e) {
                // Element might not be focusable anymore
                debugLog('[Accessibility] Could not restore focus', e);
            }
        }, 0);
    }
}

/**
 * Check if focus is currently trapped
 * @returns {boolean} Whether focus is trapped
 */
export function isFocusTrapped() {
    return focusTrapActive;
}

/**
 * Set focus to a specific element with visual indicator
 * @param {HTMLElement} element - Element to focus
 * @param {Object} options - Focus options
 */
export function setFocus(element, options = {}) {
    if (!element || typeof element.focus !== 'function') return;

    const { preventScroll = false, highlight = false } = options;

    element.focus({ preventScroll });

    if (highlight) {
        element.classList.add('focus-highlight');
        setTimeout(() => {
            element.classList.remove('focus-highlight');
        }, 2000);
    }
}

// ============================================================================
// Keyboard Navigation for File List
// ============================================================================

let currentFocusIndex = -1;
let fileListNavActive = false;

/**
 * Initialize keyboard navigation for file list
 * @param {HTMLElement} container - The container element (table body or list)
 * @param {Object} callbacks - Callback functions for actions
 */
export function initFileListNavigation(container, callbacks = {}) {
    if (!container) return;

    const {
        onSelect = () => {},
        onOpen = () => {},
        onContext = () => {},
        getItems = () => container.querySelectorAll('tr[data-item-path], div[data-item-path]')
    } = callbacks;

    const handleKeyDown = (event) => {
        const items = getItems();
        if (items.length === 0) return;

        // Don't handle if focus is in input/textarea
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            return;
        }

        // Don't handle if modal is open
        if (focusTrapActive) return;

        let handled = false;

        switch (event.key) {
            case 'ArrowDown':
            case 'j':
                event.preventDefault();
                currentFocusIndex = Math.min(currentFocusIndex + 1, items.length - 1);
                focusItem(items[currentFocusIndex]);
                handled = true;
                break;

            case 'ArrowUp':
            case 'k':
                event.preventDefault();
                currentFocusIndex = Math.max(currentFocusIndex - 1, 0);
                focusItem(items[currentFocusIndex]);
                handled = true;
                break;

            case 'Home':
                event.preventDefault();
                currentFocusIndex = 0;
                focusItem(items[0]);
                handled = true;
                break;

            case 'End':
                event.preventDefault();
                currentFocusIndex = items.length - 1;
                focusItem(items[items.length - 1]);
                handled = true;
                break;

            case 'PageDown':
                event.preventDefault();
                currentFocusIndex = Math.min(currentFocusIndex + 10, items.length - 1);
                focusItem(items[currentFocusIndex]);
                handled = true;
                break;

            case 'PageUp':
                event.preventDefault();
                currentFocusIndex = Math.max(currentFocusIndex - 10, 0);
                focusItem(items[currentFocusIndex]);
                handled = true;
                break;

            case 'Enter':
                if (currentFocusIndex >= 0 && items[currentFocusIndex]) {
                    event.preventDefault();
                    const item = items[currentFocusIndex];
                    onOpen(item);
                    handled = true;
                }
                break;

            case ' ':
                if (currentFocusIndex >= 0 && items[currentFocusIndex]) {
                    event.preventDefault();
                    const item = items[currentFocusIndex];
                    onSelect(item, event.ctrlKey || event.metaKey);
                    handled = true;
                }
                break;

            case 'ContextMenu':
            case 'F10':
                if (event.shiftKey || event.key === 'ContextMenu') {
                    if (currentFocusIndex >= 0 && items[currentFocusIndex]) {
                        event.preventDefault();
                        const item = items[currentFocusIndex];
                        const rect = item.getBoundingClientRect();
                        onContext(item, rect.right - 50, rect.bottom);
                        handled = true;
                    }
                }
                break;
        }

        if (handled) {
            debugLog('[Accessibility] Keyboard navigation:', event.key);
        }
    };

    // Focus handler to track current index
    container.addEventListener('focusin', (event) => {
        const items = getItems();
        const target = event.target.closest('tr[data-item-path], div[data-item-path]');
        if (target) {
            currentFocusIndex = Array.from(items).indexOf(target);
        }
    });

    document.addEventListener('keydown', handleKeyDown);
    fileListNavActive = true;

    // Return cleanup function
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
        fileListNavActive = false;
    };
}

/**
 * Focus a specific item in the file list
 * @param {HTMLElement} item - The item element to focus
 */
function focusItem(item) {
    if (!item) return;

    item.focus();
    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    // Update visual focus indicator
    const container = item.closest('tbody, .file-list');
    if (container) {
        container.querySelectorAll('.a11y-focused').forEach(el => {
            el.classList.remove('a11y-focused');
        });
        item.classList.add('a11y-focused');
    }
}

/**
 * Reset file list navigation state
 */
export function resetFileListNavigation() {
    currentFocusIndex = -1;
    const focused = document.querySelector('.a11y-focused');
    if (focused) {
        focused.classList.remove('a11y-focused');
    }
}

// ============================================================================
// Skip Links
// ============================================================================

/**
 * Create skip links for keyboard users
 */
export function createSkipLinks() {
    // Check if skip links already exist
    if (document.getElementById('skip-links')) return;

    const skipLinksContainer = document.createElement('div');
    skipLinksContainer.id = 'skip-links';
    skipLinksContainer.classList.add('skip-links');
    skipLinksContainer.innerHTML = `
        <a href="#main-content" class="skip-link">Langsung ke konten utama</a>
        <a href="#file-table" class="skip-link">Langsung ke daftar file</a>
        <a href="#filter-input" class="skip-link">Langsung ke pencarian</a>
    `;

    document.body.insertBefore(skipLinksContainer, document.body.firstChild);

    debugLog('[Accessibility] Skip links created');
}

// ============================================================================
// Focus Visible State Management
// ============================================================================

/**
 * Initialize focus visible state tracking
 * Distinguishes between mouse and keyboard focus
 */
export function initFocusVisible() {
    let hadKeyboardEvent = false;
    let isHandlingKeyboardFocus = false;

    document.addEventListener('keydown', (event) => {
        if (['Tab', 'Enter', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
            hadKeyboardEvent = true;
        }
    });

    document.addEventListener('mousedown', () => {
        hadKeyboardEvent = false;
    });

    document.addEventListener('focusin', (event) => {
        if (hadKeyboardEvent) {
            event.target.classList.add('focus-visible');
            isHandlingKeyboardFocus = true;
        }
    });

    document.addEventListener('focusout', (event) => {
        if (isHandlingKeyboardFocus) {
            event.target.classList.remove('focus-visible');
        }
    });

    debugLog('[Accessibility] Focus visible tracking initialized');
}

// ============================================================================
// Reduced Motion Support
// ============================================================================

/**
 * Check if user prefers reduced motion
 * @returns {boolean} Whether reduced motion is preferred
 */
export function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration based on motion preference
 * @param {number} defaultDuration - Default duration in ms
 * @returns {number} Duration in ms (0 if reduced motion preferred)
 */
export function getAnimationDuration(defaultDuration = 200) {
    return prefersReducedMotion() ? 0 : defaultDuration;
}

// ============================================================================
// High Contrast Support
// ============================================================================

/**
 * Check if user prefers high contrast
 * @returns {boolean} Whether high contrast is preferred
 */
export function prefersHighContrast() {
    // Check for Windows high contrast mode
    const highContrastQuery = window.matchMedia('(forced-colors: active)');
    return highContrastQuery.matches;
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize all accessibility features
 */
export function initAccessibility() {
    // Initialize live regions
    initLiveRegions();

    // Create skip links
    createSkipLinks();

    // Initialize focus visible tracking
    initFocusVisible();

    // Add ARIA labels to existing controls
    addControlAriaLabels();

    // Log reduced motion preference
    if (prefersReducedMotion()) {
        debugLog('[Accessibility] Reduced motion preference detected');
        document.documentElement.classList.add('reduce-motion');
    }

    // Log high contrast preference
    if (prefersHighContrast()) {
        debugLog('[Accessibility] High contrast mode detected');
        document.documentElement.classList.add('high-contrast');
    }

    debugLog('[Accessibility] Accessibility features initialized');
}

// ============================================================================
// Export convenience object
// ============================================================================

export const accessibility = {
    init: initAccessibility,
    announce,
    announceAction,
    announceSelection,
    announceNavigation,
    announceLoading,
    addFileListAriaLabels,
    addControlAriaLabels,
    updateRowSelectionAria,
    trapFocusInModal,
    releaseFocusTrap,
    isFocusTrapped,
    setFocus,
    initFileListNavigation,
    resetFileListNavigation,
    createSkipLinks,
    prefersReducedMotion,
    prefersHighContrast,
    getAnimationDuration
};

export default accessibility;