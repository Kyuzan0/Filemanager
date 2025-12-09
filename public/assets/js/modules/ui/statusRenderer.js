/**
 * Status Renderer Module
 * Handles status bar and indicator rendering for the File Manager application
 */

import { getSortDescription } from '../utils.js';
import { getSimplePaginationInfo } from '../pagination.js';

/**
 * Updates the UI sorting indicators
 * @param {NodeList} sortHeaders - Sort header elements
 * @param {HTMLElement} statusSort - Status sort element
 * @param {Object} state - Application state
 */
export function updateSortUI(sortHeaders, statusSort, state) {
    const isDefaultSort = state.sortKey === 'name' && state.sortDirection === 'asc';

    sortHeaders.forEach((header) => {
        const key = header.dataset.sortKey;
        const indicator = header.querySelector('.sort-indicator');
        const isActive = key === state.sortKey;
        header.classList.toggle('sorted', isActive);
        header.classList.toggle('sorted-asc', isActive && state.sortDirection === 'asc');
        header.classList.toggle('sorted-desc', isActive && state.sortDirection === 'desc');
        header.setAttribute('aria-sort', isActive ? (state.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none');
        if (indicator) {
            indicator.textContent = isActive
                ? (state.sortDirection === 'asc' ? '\u25B2' : '\u25BC')
                : '\u2195';
        }
    });

    if (statusSort) {
        if (isDefaultSort) {
            statusSort.hidden = true;
            statusSort.textContent = '';
        } else {
            statusSort.hidden = false;
            statusSort.textContent = `Urut: ${getSortDescription(state.sortKey, state.sortDirection)}`;
        }
    }
}

/**
 * Updates the UI selection indicators
 * @param {HTMLElement} btnDeleteSelected - Delete selected button
 * @param {HTMLElement} btnMoveSelected - Move selected button
 * @param {HTMLElement} selectAllCheckbox - Select all checkbox
 * @param {Object} state - Application state
 */
export function updateSelectionUI(btnDeleteSelected, btnMoveSelected, selectAllCheckbox, state) {
    const selectedCount = state.selected.size;

    if (btnDeleteSelected) {
        if (state.isDeleting) {
            btnDeleteSelected.disabled = true;
            btnDeleteSelected.textContent = 'Menghapus...';
        } else {
            btnDeleteSelected.disabled = selectedCount === 0 || state.isLoading;
            btnDeleteSelected.textContent = selectedCount > 0
                ? `Hapus (${selectedCount.toLocaleString('id-ID')})`
                : 'Hapus';
        }
    }

    // Enable/disable Move Selected button
    if (btnMoveSelected) {
        btnMoveSelected.disabled = selectedCount === 0 || state.isLoading;
    }

    if (selectAllCheckbox) {
        const totalVisible = state.visibleItems.length;
        const selectedVisible = state.visibleItems.reduce((accumulator, item) => (
            state.selected.has(item.path) ? accumulator + 1 : accumulator
        ), 0);

        const disableCheckbox = state.isLoading || totalVisible === 0;
        selectAllCheckbox.disabled = disableCheckbox;

        if (disableCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = totalVisible > 0 && selectedVisible === totalVisible;
            selectAllCheckbox.indeterminate = selectedVisible > 0 && selectedVisible < totalVisible;
        }
    }
}

/**
 * Synchronizes selection on table rows
 * @param {HTMLElement} tableBody - Table body element
 * @param {Object} state - Application state
 */
export function syncRowSelection(tableBody, state) {
    if (!tableBody) return;
    
    tableBody.querySelectorAll('tr').forEach((row) => {
        const path = row.dataset.itemPath;
        const isSelected = state.selected.has(path);
        row.classList.toggle('is-selected', isSelected);
        const checkbox = row.querySelector('.item-select');
        if (checkbox) {
            checkbox.checked = isSelected;
        }
    });
}

/**
 * Synchronizes selection on mobile list
 * @param {HTMLElement} mobileList - Mobile list element
 * @param {Object} state - Application state
 */
export function syncMobileSelection(mobileList, state) {
    if (!mobileList) return;
    
    // Mobile items are divs with data-item-path attribute and contain checkboxes
    mobileList.querySelectorAll('[data-item-path]').forEach((item) => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) {
            const path = checkbox.dataset.path;
            if (path) {
                checkbox.checked = state.selected.has(path);
            }
        }
    });
}

/**
 * Updates status information display
 * @param {HTMLElement} statusInfo - Status info element
 * @param {HTMLElement} statusTime - Status time element
 * @param {HTMLElement} statusFilter - Status filter element
 * @param {number} totalCount - Total item count
 * @param {number} filteredCount - Filtered item count
 * @param {number} generatedAt - Timestamp when data was generated
 * @param {Object} meta - Additional metadata
 * @param {string} filter - Current filter string
 * @param {Object} paginationState - Pagination state (optional)
 */
export function updateStatus(statusInfo, statusTime, statusFilter, totalCount, filteredCount, generatedAt, meta = {}, filter, paginationState = null) {
    const {
        totalFolders = 0,
        totalFiles = 0,
        filteredFolders = totalFolders,
        filteredFiles = totalFiles,
    } = meta;

    const displayCount = filteredCount ?? totalCount;
    const formattedDisplay = displayCount.toLocaleString('id-ID');
    const formattedTotal = totalCount.toLocaleString('id-ID');
    const folderDisplay = (filter && filteredCount !== totalCount) ? filteredFolders : totalFolders;
    const fileDisplay = (filter && filteredCount !== totalCount) ? filteredFiles : totalFiles;

    const infoPrefix = (filter && filteredCount !== totalCount)
        ? `${formattedDisplay} dari ${formattedTotal} item ditampilkan`
        : `${formattedDisplay} item ditampilkan`;

    // Add pagination info if available
    let paginationInfo = '';
    if (paginationState && paginationState.currentPage && paginationState.totalPages > 1) {
        paginationInfo = ` • ${getSimplePaginationInfo(paginationState.currentPage, paginationState.totalPages)}`;
    }

    if (statusInfo) {
        statusInfo.textContent = `${infoPrefix} • ${folderDisplay.toLocaleString('id-ID')} folder • ${fileDisplay.toLocaleString('id-ID')} file${paginationInfo}`;
    }

    if (statusFilter) {
        if (filter) {
            statusFilter.hidden = false;
            statusFilter.textContent = `Filter: "${filter}" (${filteredCount.toLocaleString('id-ID')} cocok)`;
        } else {
            statusFilter.hidden = true;
            statusFilter.textContent = '';
        }
    }

    if (statusTime) {
        if (generatedAt) {
            statusTime.hidden = false;
            statusTime.textContent = `Diperbarui ${new Date(generatedAt * 1000).toLocaleTimeString('id-ID')}`;
        } else {
            statusTime.hidden = true;
            statusTime.textContent = '';
        }
    }
}

/**
 * Sets loading state UI
 * @param {HTMLElement} loaderOverlay - Loader overlay element
 * @param {HTMLElement} btnRefresh - Refresh button element
 * @param {boolean} isLoading - Whether loading is active
 */
export function setLoading(loaderOverlay, btnRefresh, isLoading) {
    const startTime = performance.now();
    console.log('[PAGINATION DEBUG] setLoading called at:', startTime, 'with isLoading:', isLoading);
    
    // Handle loader overlay
    const overlayTime = performance.now();
    if (loaderOverlay && loaderOverlay.classList) {
        loaderOverlay.classList.toggle('visible', !!isLoading);
    } else {
        // Fallback: try common selectors if passed element is null
        const overlay = document.getElementById('loader-overlay') || document.querySelector('.loader-overlay');
        if (overlay && overlay.classList) overlay.classList.toggle('visible', !!isLoading);
    }
    console.log('[PAGINATION DEBUG] Loader overlay updated at:', overlayTime, 'delta:', overlayTime - startTime);
    
    // Handle refresh button
    const buttonTime = performance.now();
    if (btnRefresh) {
        try {
            btnRefresh.disabled = !!isLoading;
        } catch (e) {
            // Element exists but cannot be disabled — ignore safely
        }
    }
    console.log('[PAGINATION DEBUG] Refresh button updated at:', buttonTime, 'delta:', buttonTime - overlayTime);
    
    const endTime = performance.now();
    console.log('[PAGINATION DEBUG] setLoading completed at:', endTime, 'total delta:', endTime - startTime);
}

/**
 * Sets error state UI
 * @param {HTMLElement} errorBanner - Error banner element
 * @param {string} message - Error message (null to clear)
 */
export function setError(errorBanner, message) {
    if (!errorBanner) return;
    
    if (message) {
        errorBanner.textContent = message;
        errorBanner.classList.add('visible', 'error');
    } else {
        errorBanner.textContent = '';
        errorBanner.classList.remove('visible', 'error');
    }
}

/**
 * Flashes a status message temporarily
 * @param {HTMLElement} statusElement - Status element to update
 * @param {string} message - Message to display
 * @param {string} type - Message type ('success', 'error', 'info')
 * @param {number} duration - Duration in milliseconds
 */
export function flashStatus(statusElement, message, type = 'info', duration = 3000) {
    if (!statusElement) return;
    
    const originalText = statusElement.textContent;
    const originalClasses = [...statusElement.classList];
    
    // Set flash message
    statusElement.textContent = message;
    statusElement.classList.remove('text-gray-600', 'text-green-600', 'text-red-600');
    
    switch (type) {
        case 'success':
            statusElement.classList.add('text-green-600');
            break;
        case 'error':
            statusElement.classList.add('text-red-600');
            break;
        default:
            statusElement.classList.add('text-gray-600');
    }
    
    // Restore original after duration
    setTimeout(() => {
        statusElement.textContent = originalText;
        statusElement.classList.remove('text-gray-600', 'text-green-600', 'text-red-600');
        originalClasses.forEach(cls => {
            if (!statusElement.classList.contains(cls)) {
                statusElement.classList.add(cls);
            }
        });
    }, duration);
}

/**
 * Updates the selection count display
 * @param {HTMLElement} countElement - Element to display count
 * @param {number} count - Number of selected items
 */
export function updateSelectionCount(countElement, count) {
    if (!countElement) return;
    
    if (count > 0) {
        countElement.textContent = `${count.toLocaleString('id-ID')} dipilih`;
        countElement.classList.remove('hidden');
    } else {
        countElement.textContent = '';
        countElement.classList.add('hidden');
    }
}

/**
 * Shows a loading spinner
 * @param {HTMLElement} container - Container element
 * @param {string} message - Loading message
 * @returns {HTMLElement} - Spinner element for removal
 */
export function showSpinner(container, message = 'Memuat...') {
    if (!container) return null;
    
    const spinner = document.createElement('div');
    spinner.classList.add('spinner-overlay', 'fixed', 'inset-0', 'flex', 'items-center', 'justify-center', 'bg-black/30', 'z-50');
    
    const content = document.createElement('div');
    content.classList.add('spinner-content', 'bg-white', 'dark:bg-gray-800', 'rounded-lg', 'p-6', 'shadow-xl', 'flex', 'flex-col', 'items-center', 'gap-4');
    
    const icon = document.createElement('div');
    icon.classList.add('spinner-icon', 'w-8', 'h-8', 'border-4', 'border-primary', 'border-t-transparent', 'rounded-full', 'animate-spin');
    
    const text = document.createElement('p');
    text.classList.add('text-sm', 'text-gray-600', 'dark:text-gray-300');
    text.textContent = message;
    
    content.appendChild(icon);
    content.appendChild(text);
    spinner.appendChild(content);
    
    container.appendChild(spinner);
    
    return spinner;
}

/**
 * Hides a spinner
 * @param {HTMLElement} spinner - Spinner element to remove
 */
export function hideSpinner(spinner) {
    if (spinner && spinner.parentNode) {
        spinner.parentNode.removeChild(spinner);
    }
}

/**
 * Updates progress indicator
 * @param {HTMLElement} progressElement - Progress element
 * @param {number} current - Current progress value
 * @param {number} total - Total value
 * @param {string} label - Optional label
 */
export function updateProgress(progressElement, current, total, label = '') {
    if (!progressElement) return;
    
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    const progressBar = progressElement.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    
    const progressText = progressElement.querySelector('.progress-text');
    if (progressText) {
        progressText.textContent = label || `${current} / ${total} (${percentage}%)`;
    }
    
    progressElement.setAttribute('aria-valuenow', current);
    progressElement.setAttribute('aria-valuemax', total);
}