/**
 * Pagination Module
 * Mengelola pagination untuk file list
 */

import { state, updateState } from './state.js';
import { elements } from './constants.js';

// Global flag to prevent multiple simultaneous renders
let isRendering = false;
let lastRenderTime = 0;
const RENDER_DEBOUNCE = 50; // Reduced from 100ms to 50ms for faster response
let renderTimeout = null;

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
        // Add Tailwind utility classes alongside existing class for a gradual migration
        paginationContainer.classList.add('pagination-container','flex','flex-wrap','items-center','justify-between','gap-4','p-3','bg-transparent');
        
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
    
    // Build pagination DOM (avoid innerHTML with class attributes to be safer during Tailwind migration)
    // Clear existing content first
    paginationContainer.innerHTML = '';

    // Info
    const infoDiv = document.createElement('div');
    infoDiv.classList.add('pagination-info', 'text-sm', 'text-gray-600');
    infoDiv.textContent = `Menampilkan ${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, totalItems)} dari ${totalItems} item`;
    paginationContainer.appendChild(infoDiv);

    // Controls wrapper
    const controlsDiv = document.createElement('div');
    controlsDiv.classList.add('pagination-controls', 'flex', 'items-center', 'gap-2');

    // Helper to create an SVG icon node from a path string and optional classes
    const createIcon = (viewBox, pathD, classes = []) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', viewBox);
        svg.setAttribute('aria-hidden', 'true');
        classes.forEach(c => svg.classList.add(c));
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', 'currentColor');
        path.setAttribute('d', pathD);
        svg.appendChild(path);
        return svg;
    };

    // Helper to create button with common utilities
    const createNavButton = (dataPage, ariaLabel, svgNode, isDisabled = false) => {
        const btn = document.createElement('button');
        btn.classList.add('pagination-btn', `pagination-${dataPage}`, 'inline-flex', 'items-center', 'justify-center', 'w-9', 'h-9', 'rounded-md', 'border', 'bg-transparent', 'text-gray-700', 'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-200');
        // Hover utilities (kept as classes for Tailwind)
        btn.classList.add('hover:bg-blue-600', 'hover:text-white');
        if (isDisabled) {
            btn.setAttribute('disabled', '');
        }
        if (ariaLabel) btn.setAttribute('aria-label', ariaLabel);
        btn.dataset.page = dataPage;
        if (svgNode) btn.appendChild(svgNode);
        return btn;
    };

    // First button
    controlsDiv.appendChild(createNavButton('first', 'Halaman pertama', createIcon('0 0 24 24', 'M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z', ['w-4','h-4']), currentPage === 1));

    // Prev button
    controlsDiv.appendChild(createNavButton('prev', 'Halaman sebelumnya', createIcon('0 0 24 24', 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z', ['w-4','h-4']), currentPage === 1));

    // Page numbers container
    const numbersDiv = document.createElement('div');
    numbersDiv.classList.add('pagination-numbers', 'flex', 'items-center', 'gap-1');

    pageNumbers.forEach(pageNum => {
        if (pageNum === '...') {
            const span = document.createElement('span');
            span.classList.add('pagination-ellipsis', 'px-2', 'text-gray-500');
            span.textContent = '...';
            numbersDiv.appendChild(span);
            return;
        }

        const btn = document.createElement('button');
        btn.classList.add('pagination-btn', 'pagination-number', 'inline-flex', 'items-center', 'justify-center', 'min-w-[36px]', 'h-9', 'px-2', 'rounded-md');
        btn.dataset.page = String(pageNum);
        btn.setAttribute('aria-label', `Halaman ${pageNum}`);
        if (pageNum === currentPage) {
            btn.setAttribute('aria-current', 'page');
            // active classes
            btn.classList.add('active', 'bg-blue-600', 'text-white', 'font-semibold', 'border-blue-600');
        } else {
            btn.classList.add('bg-transparent', 'text-gray-700', 'hover:bg-blue-50', 'hover:text-blue-700');
        }
        btn.textContent = String(pageNum);
        numbersDiv.appendChild(btn);
    });

    controlsDiv.appendChild(numbersDiv);

    // Next button
    controlsDiv.appendChild(createNavButton('next', 'Halaman berikutnya', createIcon('0 0 24 24', 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z', ['w-4','h-4']), currentPage === totalPages));

    // Last button
    controlsDiv.appendChild(createNavButton('last', 'Halaman terakhir', createIcon('0 0 24 24', 'M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z', ['w-4','h-4']), currentPage === totalPages));

    paginationContainer.appendChild(controlsDiv);

    // Per-page controls
    const perPageDiv = document.createElement('div');
    perPageDiv.classList.add('pagination-per-page', 'flex', 'items-center', 'gap-2', 'mt-2', 'sm:mt-0');

    const perLabel = document.createElement('label');
    perLabel.setAttribute('for', 'items-per-page');
    perLabel.classList.add('text-sm', 'text-gray-600');
    perLabel.textContent = 'Item per halaman:';
    perPageDiv.appendChild(perLabel);

    const select = document.createElement('select');
    select.id = 'items-per-page';
    select.classList.add('items-per-page-select', 'form-select', 'px-2', 'py-1', 'rounded-md', 'border', 'bg-white', 'text-gray-700');

    const options = [10, 25, 50, 100];
    options.forEach(optVal => {
        const opt = document.createElement('option');
        opt.value = String(optVal);
        opt.textContent = String(optVal);
        if (itemsPerPage === optVal) {
            opt.setAttribute('selected', '');
        }
        select.appendChild(opt);
    });

    perPageDiv.appendChild(select);
    paginationContainer.appendChild(perPageDiv);

    // Attach event listeners to newly created DOM
    attachPaginationEventListeners(paginationContainer);
    
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
            // Prevent multiple rapid clicks
            if (isRendering) return;
            
            const page = e.currentTarget.getAttribute('data-page');
            let pageChanged = false;
            
            switch(page) {
                case 'first':
                    if (state.pagination.currentPage > 1) {
                        goToFirstPage();
                        pageChanged = true;
                    }
                    break;
                case 'prev':
                    if (state.pagination.currentPage > 1) {
                        goToPreviousPage();
                        pageChanged = true;
                    }
                    break;
                case 'next':
                    if (state.pagination.currentPage < state.pagination.totalPages) {
                        goToNextPage();
                        pageChanged = true;
                    }
                    break;
                case 'last':
                    if (state.pagination.currentPage < state.pagination.totalPages) {
                        goToLastPage();
                        pageChanged = true;
                    }
                    break;
                default:
                    const pageNum = parseInt(page);
                    if (!isNaN(pageNum) && pageNum !== state.pagination.currentPage) {
                        goToPage(pageNum);
                        pageChanged = true;
                    }
            }
            
            // Only trigger re-render if page actually changed
            if (pageChanged) {
                // Clear any existing timeout
                if (renderTimeout) {
                    clearTimeout(renderTimeout);
                }
                
                // Use a shorter debounce for immediate feedback
                renderTimeout = setTimeout(() => {
                    const renderEvent = new CustomEvent('pagination-change');
                    window.dispatchEvent(renderEvent);
                }, RENDER_DEBOUNCE);
            }
        });
    });
    
    // Items per page selector
    const itemsPerPageSelect = container.querySelector('#items-per-page');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            // Prevent multiple rapid changes
            if (isRendering) return;
            
            const newItemsPerPage = parseInt(e.target.value);
            if (newItemsPerPage !== state.pagination.itemsPerPage) {
                changeItemsPerPage(newItemsPerPage);
                
                // Clear any existing timeout
                if (renderTimeout) {
                    clearTimeout(renderTimeout);
                }
                
                // Use a slightly longer debounce for items per page changes
                renderTimeout = setTimeout(() => {
                    const renderEvent = new CustomEvent('pagination-change');
                    window.dispatchEvent(renderEvent);
                }, RENDER_DEBOUNCE * 2);
            }
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