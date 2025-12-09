/**
 * Hybrid Pagination Module
 * Mengintegrasikan virtual scrolling dengan page navigation/indicator
 * Memberikan UX yang smooth dengan kemampuan navigasi halaman
 */

import { config } from './constants.js';
import { debugLog } from './debug.js';

/**
 * Pagination state
 */
let paginationState = {
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 50, // Items per "virtual page"
    totalItems: 0,
    isNavigating: false, // Flag untuk mencegah loop event
};

/**
 * Calculate pagination info based on total items
 * @param {number} totalItems - Total number of items
 * @param {number} itemsPerPage - Items per page (default from config)
 * @returns {Object} Pagination info
 */
export function calculatePagination(totalItems, itemsPerPage = paginationState.itemsPerPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    
    return {
        totalItems,
        itemsPerPage,
        totalPages,
        currentPage: Math.min(paginationState.currentPage, totalPages),
    };
}

/**
 * Get items for current page (slice items array)
 * @param {Array} items - All items array
 * @param {number} currentPage - Current page number (optional, uses state if not provided)
 * @param {number} itemsPerPage - Items per page (optional, uses state if not provided)
 * @returns {Array} Items for the current page
 */
export function getItemsForPage(items, currentPage = null, itemsPerPage = null) {
    if (!items || !Array.isArray(items)) {
        return [];
    }
    
    const page = currentPage || paginationState.currentPage;
    const perPage = itemsPerPage || paginationState.itemsPerPage;
    
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    
    return items.slice(startIndex, endIndex);
}

/**
 * Get current page based on scroll position
 * @param {HTMLElement} container - Scroll container
 * @param {number} totalItems - Total number of items
 * @param {number} itemHeight - Height of each item
 * @returns {number} Current page number
 */
export function getCurrentPageFromScroll(container, totalItems, itemHeight) {
    if (!container) return 1;
    
    // NOT USED in true pagination mode
    // This function was for scroll-based virtual pagination
    // Keeping for backward compatibility
    return paginationState.currentPage;
}

/**
 * Scroll to specific page
 * @param {HTMLElement} container - Scroll container
 * @param {number} pageNumber - Target page number
 * @param {number} itemHeight - Height of each item
 * @param {boolean} smooth - Use smooth scrolling
 */
export function scrollToPage(container, pageNumber, itemHeight, smooth = false) {
    // Update page state first for immediate response
    const pagination = calculatePagination(paginationState.totalItems);
    const validPage = Math.max(1, Math.min(pageNumber, pagination.totalPages));
    
    paginationState.currentPage = validPage;
    paginationState.isNavigating = true;
    
    // Dispatch event to trigger re-render immediately
    updatePaginationState(validPage, pagination.totalPages, paginationState.totalItems);
    
    // Scroll to top after state update (optional, only if container exists)
    if (container) {
        requestAnimationFrame(() => {
            container.scrollTo({
                top: 0,
                behavior: smooth ? 'smooth' : 'auto',
            });
        });
    }
    
    // Reset navigating flag quickly
    requestAnimationFrame(() => {
        paginationState.isNavigating = false;
    });
}

/**
 * Update pagination state
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {number} totalItems - Total number of items
 */
export function updatePaginationState(currentPage, totalPages, totalItems) {
    const changed = 
        paginationState.currentPage !== currentPage ||
        paginationState.totalPages !== totalPages ||
        paginationState.totalItems !== totalItems;
    
    paginationState.currentPage = currentPage;
    paginationState.totalPages = totalPages;
    paginationState.totalItems = totalItems;
    
    if (changed) {
        debugLog('[Pagination] State updated:', paginationState);
        
        // Dispatch custom event for UI updates
        document.dispatchEvent(new CustomEvent('pagination-updated', {
            detail: { ...paginationState }
        }));
    }
}

/**
 * Get current pagination state
 * @returns {Object} Current pagination state
 */
export function getPaginationState() {
    return { ...paginationState };
}

/**
 * Set items per page
 * @param {number} itemsPerPage - New items per page value
 */
export function setItemsPerPage(itemsPerPage) {
    if (itemsPerPage > 0 && itemsPerPage !== paginationState.itemsPerPage) {
        paginationState.itemsPerPage = itemsPerPage;
        debugLog('[Pagination] Items per page changed to:', itemsPerPage);
        
        // Recalculate pagination
        const newPagination = calculatePagination(paginationState.totalItems, itemsPerPage);
        updatePaginationState(newPagination.currentPage, newPagination.totalPages, paginationState.totalItems);
    }
}

/**
 * Reset pagination to first page
 */
export function resetPagination() {
    paginationState.currentPage = 1;
    debugLog('[Pagination] Reset to page 1');
}

/**
 * Navigate to next page
 * @param {HTMLElement} container - Scroll container
 * @param {number} itemHeight - Height of each item
 */
export function goToNextPage(container, itemHeight) {
    if (paginationState.currentPage < paginationState.totalPages) {
        const nextPage = paginationState.currentPage + 1;
        scrollToPage(container, nextPage, itemHeight, false); // Instant navigation
    }
}

/**
 * Navigate to previous page
 * @param {HTMLElement} container - Scroll container
 * @param {number} itemHeight - Height of each item
 */
export function goToPreviousPage(container, itemHeight) {
    if (paginationState.currentPage > 1) {
        const prevPage = paginationState.currentPage - 1;
        scrollToPage(container, prevPage, itemHeight, false); // Instant navigation
    }
}

/**
 * Navigate to first page
 * @param {HTMLElement} container - Scroll container
 * @param {number} itemHeight - Height of each item
 */
export function goToFirstPage(container, itemHeight) {
    if (paginationState.currentPage !== 1) {
        scrollToPage(container, 1, itemHeight, false); // Instant navigation
    }
}

/**
 * Navigate to last page
 * @param {HTMLElement} container - Scroll container
 * @param {number} itemHeight - Height of each item
 */
export function goToLastPage(container, itemHeight) {
    if (paginationState.currentPage !== paginationState.totalPages) {
        scrollToPage(container, paginationState.totalPages, itemHeight, false); // Instant navigation
    }
}

/**
 * Format pagination info string
 * @param {number} currentPage - Current page
 * @param {number} totalPages - Total pages
 * @param {number} totalItems - Total items
 * @returns {string} Formatted pagination info
 */
export function formatPaginationInfo(currentPage, totalPages, totalItems) {
    const itemsPerPage = paginationState.itemsPerPage;
    const startItem = ((currentPage - 1) * itemsPerPage) + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    if (totalItems === 0) {
        return 'Tidak ada item';
    }
    
    if (totalPages === 1) {
        return `${totalItems.toLocaleString('id-ID')} item`;
    }
    
    return `Halaman ${currentPage} dari ${totalPages} • Item ${startItem}-${endItem} dari ${totalItems.toLocaleString('id-ID')}`;
}

/**
 * Initialize scroll-based pagination tracking
 * @param {HTMLElement} container - Scroll container
 * @param {number} totalItems - Total items
 * @param {number} itemHeight - Height per item
 */
export function initScrollTracking(container, totalItems, itemHeight) {
    if (!container) return;
    
    // Calculate initial pagination
    const pagination = calculatePagination(totalItems);
    updatePaginationState(paginationState.currentPage, pagination.totalPages, totalItems);
    
    // NO SCROLL TRACKING in true pagination mode
    // We use button clicks for navigation instead
    
    // Return cleanup function (no-op in this mode)
    return () => {
        // Nothing to clean up
    };
}

/**
 * Render pagination controls UI
 * @param {Object} options - Render options
 * @returns {HTMLElement} Pagination controls element
 */
export function renderPaginationControls({ 
    currentPage, 
    totalPages, 
    totalItems,
    onPrevious,
    onNext,
    onFirst,
    onLast,
    onPageSelect
}) {
    const container = document.createElement('div');
    container.className = 'pagination-controls flex items-center justify-between gap-4 px-4 py-3 bg-white border-t border-gray-200';
    
    // Info section
    const info = document.createElement('div');
    info.className = 'pagination-info text-sm text-gray-600';
    info.textContent = formatPaginationInfo(currentPage, totalPages, totalItems);
    
    // Controls section
    const controls = document.createElement('div');
    controls.className = 'pagination-buttons flex items-center gap-2';
    
    // First page button
    const firstBtn = document.createElement('button');
    firstBtn.className = 'pagination-btn px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
    firstBtn.innerHTML = '<i class="ri-skip-back-mini-line"></i>';
    firstBtn.disabled = currentPage === 1;
    firstBtn.title = 'Halaman Pertama';
    firstBtn.addEventListener('click', onFirst);
    
    // Previous page button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
    prevBtn.innerHTML = '<i class="ri-arrow-left-s-line"></i> Prev';
    prevBtn.disabled = currentPage === 1;
    prevBtn.title = 'Halaman Sebelumnya';
    prevBtn.addEventListener('click', onPrevious);
    
    // Page selector (show nearby pages)
    const pageSelector = document.createElement('div');
    pageSelector.className = 'flex items-center gap-1';
    
    const pagesToShow = getPageRange(currentPage, totalPages);
    pagesToShow.forEach((page, index) => {
        if (page === '...') {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'px-2 text-gray-400';
            ellipsis.textContent = '...';
            pageSelector.appendChild(ellipsis);
        } else {
            const pageBtn = document.createElement('button');
            pageBtn.className = page === currentPage
                ? 'pagination-page-btn px-3 py-1.5 text-sm rounded bg-blue-600 text-white font-medium'
                : 'pagination-page-btn px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-all duration-100';
            pageBtn.textContent = page;
            pageBtn.disabled = page === currentPage;
            
            // Add instant visual feedback on click
            pageBtn.addEventListener('click', () => {
                // Add loading state
                pageBtn.classList.add('opacity-50', 'pointer-events-none');
                onPageSelect(page);
                // Remove loading state after navigation starts
                setTimeout(() => {
                    pageBtn.classList.remove('opacity-50', 'pointer-events-none');
                }, 100);
            });
            pageSelector.appendChild(pageBtn);
        }
    });
    
    // Next page button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
    nextBtn.innerHTML = 'Next <i class="ri-arrow-right-s-line"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.title = 'Halaman Selanjutnya';
    nextBtn.addEventListener('click', onNext);
    
    // Last page button
    const lastBtn = document.createElement('button');
    lastBtn.className = 'pagination-btn px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
    lastBtn.innerHTML = '<i class="ri-skip-forward-mini-line"></i>';
    lastBtn.disabled = currentPage === totalPages;
    lastBtn.title = 'Halaman Terakhir';
    lastBtn.addEventListener('click', onLast);
    
    controls.appendChild(firstBtn);
    controls.appendChild(prevBtn);
    controls.appendChild(pageSelector);
    controls.appendChild(nextBtn);
    controls.appendChild(lastBtn);
    
    container.appendChild(info);
    container.appendChild(controls);
    
    return container;
}

/**
 * Get page range for pagination UI (with ellipsis)
 * @param {number} currentPage - Current page
 * @param {number} totalPages - Total pages
 * @returns {Array} Array of page numbers and ellipsis
 */
function getPageRange(currentPage, totalPages) {
    if (totalPages <= 7) {
        // Show all pages if 7 or less
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const pages = [];
    
    // Always show first page
    pages.push(1);
    
    if (currentPage > 3) {
        pages.push('...');
    }
    
    // Show current page and neighbors
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }
    
    if (currentPage < totalPages - 2) {
        pages.push('...');
    }
    
    // Always show last page
    if (totalPages > 1) {
        pages.push(totalPages);
    }
    
    return pages;
}

/**
 * Simple pagination info (for status bar)
 * @param {number} currentPage - Current page
 * @param {number} totalPages - Total pages
 * @returns {string} Simple info string
 */
export function getSimplePaginationInfo(currentPage, totalPages) {
    if (totalPages <= 1) return '';
    return `Hal. ${currentPage}/${totalPages}`;
}
