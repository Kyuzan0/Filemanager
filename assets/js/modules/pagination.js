/**
 * Pagination Module
 * Mengelola pagination untuk file list
 */

import { state, updateState } from './state.js';
import { elements } from './constants.js';

/**
 * Inisialisasi pagination state
 */
export function initPagination() {
    if (!state.pagination) {
        updateState({
            pagination: {
                currentPage: 1,
                itemsPerPage: 10,
                totalItems: 0,
                totalPages: 1,
            }
        });
    }
}

/**
 * Hitung total halaman berdasarkan jumlah item
 * @param {number} totalItems - Total jumlah item
 * @returns {number} Total halaman
 */
export function calculateTotalPages(totalItems) {
    const itemsPerPage = state.pagination?.itemsPerPage || 10;
    return Math.max(1, Math.ceil(totalItems / itemsPerPage));
}

/**
 * Update pagination info
 * @param {number} totalItems - Total jumlah item
 */
export function updatePaginationInfo(totalItems) {
    const totalPages = calculateTotalPages(totalItems);
    const currentPage = Math.min(state.pagination?.currentPage || 1, totalPages);
    
    updateState({
        pagination: {
            ...state.pagination,
            totalItems,
            totalPages,
            currentPage,
        }
    });
}

/**
 * Dapatkan item untuk halaman saat ini
 * @param {Array} items - Array semua item
 * @returns {Array} Array item untuk halaman saat ini
 */
export function getPaginatedItems(items) {
    if (!state.pagination) {
        initPagination();
    }
    
    const { currentPage, itemsPerPage } = state.pagination;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return items.slice(startIndex, endIndex);
}

/**
 * Pindah ke halaman tertentu
 * @param {number} pageNumber - Nomor halaman tujuan
 */
export function goToPage(pageNumber) {
    const { totalPages } = state.pagination;
    const newPage = Math.max(1, Math.min(pageNumber, totalPages));
    
    updateState({
        pagination: {
            ...state.pagination,
            currentPage: newPage,
        }
    });
}

/**
 * Pindah ke halaman berikutnya
 */
export function goToNextPage() {
    const { currentPage, totalPages } = state.pagination;
    if (currentPage < totalPages) {
        goToPage(currentPage + 1);
    }
}

/**
 * Pindah ke halaman sebelumnya
 */
export function goToPreviousPage() {
    const { currentPage } = state.pagination;
    if (currentPage > 1) {
        goToPage(currentPage - 1);
    }
}

/**
 * Pindah ke halaman pertama
 */
export function goToFirstPage() {
    goToPage(1);
}

/**
 * Pindah ke halaman terakhir
 */
export function goToLastPage() {
    const { totalPages } = state.pagination;
    goToPage(totalPages);
}

/**
 * Ubah jumlah item per halaman
 * @param {number} itemsPerPage - Jumlah item per halaman baru
 */
export function changeItemsPerPage(itemsPerPage) {
    const validItemsPerPage = Math.max(1, itemsPerPage);
    
    updateState({
        pagination: {
            ...state.pagination,
            itemsPerPage: validItemsPerPage,
            currentPage: 1, // Reset ke halaman pertama
        }
    });
    
    // Recalculate total pages
    updatePaginationInfo(state.pagination.totalItems);
}

/**
 * Render pagination controls
 */
export function renderPaginationControls() {
    if (!state.pagination) {
        initPagination();
    }
    
    const { currentPage, totalPages, totalItems, itemsPerPage } = state.pagination;
    
    // Cari atau buat pagination container
    let paginationContainer = document.querySelector('.pagination-container');
    
    if (!paginationContainer) {
        // Buat container baru jika belum ada
        paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-container';
        
        // Insert setelah table-wrapper
        const tableWrapper = document.querySelector('.table-wrapper');
        if (tableWrapper && tableWrapper.parentNode) {
            tableWrapper.parentNode.insertBefore(paginationContainer, tableWrapper.nextSibling);
        }
    }
    
    // Jika totalItems <= itemsPerPage, sembunyikan pagination
    if (totalItems <= itemsPerPage) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    // Generate page numbers to show
    const pageNumbers = generatePageNumbers(currentPage, totalPages);
    
    // Build pagination HTML
    const paginationHTML = `
        <div class="pagination-info">
            Menampilkan ${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, totalItems)} dari ${totalItems} item
        </div>
        <div class="pagination-controls">
            <button 
                class="pagination-btn pagination-first" 
                ${currentPage === 1 ? 'disabled' : ''}
                aria-label="Halaman pertama"
                data-page="first">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z"/>
                </svg>
            </button>
            <button 
                class="pagination-btn pagination-prev" 
                ${currentPage === 1 ? 'disabled' : ''}
                aria-label="Halaman sebelumnya"
                data-page="prev">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
            </button>
            
            <div class="pagination-numbers">
                ${pageNumbers.map(pageNum => {
                    if (pageNum === '...') {
                        return '<span class="pagination-ellipsis">...</span>';
                    }
                    return `
                        <button 
                            class="pagination-btn pagination-number ${pageNum === currentPage ? 'active' : ''}"
                            data-page="${pageNum}"
                            aria-label="Halaman ${pageNum}"
                            ${pageNum === currentPage ? 'aria-current="page"' : ''}>
                            ${pageNum}
                        </button>
                    `;
                }).join('')}
            </div>
            
            <button 
                class="pagination-btn pagination-next" 
                ${currentPage === totalPages ? 'disabled' : ''}
                aria-label="Halaman berikutnya"
                data-page="next">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
            </button>
            <button 
                class="pagination-btn pagination-last" 
                ${currentPage === totalPages ? 'disabled' : ''}
                aria-label="Halaman terakhir"
                data-page="last">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z"/>
                </svg>
            </button>
        </div>
        <div class="pagination-per-page">
            <label for="items-per-page">Item per halaman:</label>
            <select id="items-per-page" class="items-per-page-select">
                <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option>
                <option value="25" ${itemsPerPage === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100</option>
            </select>
        </div>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
    
    // Attach event listeners
    attachPaginationEventListeners(paginationContainer);
}

/**
 * Generate array of page numbers to display
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @returns {Array} Array of page numbers and ellipsis
 */
function generatePageNumbers(currentPage, totalPages) {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];
    let l;
    
    // Always show first page
    range.push(1);
    
    // Calculate range around current page
    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
        if (i > 1 && i < totalPages) {
            range.push(i);
        }
    }
    
    // Always show last page
    if (totalPages > 1) {
        range.push(totalPages);
    }
    
    // Add ellipsis where needed
    for (let i of range) {
        if (l) {
            if (i - l === 2) {
                rangeWithDots.push(l + 1);
            } else if (i - l !== 1) {
                rangeWithDots.push('...');
            }
        }
        rangeWithDots.push(i);
        l = i;
    }
    
    return rangeWithDots;
}

/**
 * Attach event listeners to pagination controls
 * @param {HTMLElement} container - Pagination container element
 */
function attachPaginationEventListeners(container) {
    // Page number buttons
    const pageButtons = container.querySelectorAll('.pagination-btn[data-page]');
    pageButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const page = e.currentTarget.getAttribute('data-page');
            
            switch(page) {
                case 'first':
                    goToFirstPage();
                    break;
                case 'prev':
                    goToPreviousPage();
                    break;
                case 'next':
                    goToNextPage();
                    break;
                case 'last':
                    goToLastPage();
                    break;
                default:
                    goToPage(parseInt(page));
            }
            
            // Trigger re-render
            const renderEvent = new CustomEvent('pagination-change');
            window.dispatchEvent(renderEvent);
        });
    });
    
    // Items per page selector
    const itemsPerPageSelect = container.querySelector('#items-per-page');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            const newItemsPerPage = parseInt(e.target.value);
            changeItemsPerPage(newItemsPerPage);
            
            // Trigger re-render
            const renderEvent = new CustomEvent('pagination-change');
            window.dispatchEvent(renderEvent);
        });
    }
}

/**
 * Reset pagination ke halaman pertama
 */
export function resetPagination() {
    if (state.pagination) {
        updateState({
            pagination: {
                ...state.pagination,
                currentPage: 1,
            }
        });
    }
}