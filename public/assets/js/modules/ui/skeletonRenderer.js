/**
 * Skeleton Renderer Module
 * ========================
 * Renders skeleton placeholder rows/cards during directory loading.
 * Replaces the global spinner overlay with contextual loading indicators.
 */

/** Default number of skeleton rows to show */
const DEFAULT_TABLE_ROWS = 8;
const DEFAULT_GRID_CARDS = 8;
const DEFAULT_MOBILE_ITEMS = 6;

/**
 * Render skeleton rows into the table body
 * @param {HTMLElement} tableBody - The <tbody> element
 * @param {number} [count] - Number of skeleton rows
 */
export function renderTableSkeletons(tableBody, count = DEFAULT_TABLE_ROWS) {
    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
        const row = document.createElement('tr');
        row.classList.add('skeleton-row');
        row.setAttribute('aria-hidden', 'true');

        // Selection cell (checkbox placeholder)
        const selCell = document.createElement('td');
        selCell.classList.add('selection-cell');
        const checkPlaceholder = document.createElement('div');
        checkPlaceholder.classList.add('skeleton-bone', 'skeleton-checkbox');
        selCell.appendChild(checkPlaceholder);
        row.appendChild(selCell);

        // Name cell (icon + text)
        const nameCell = document.createElement('td');
        nameCell.classList.add('name-cell');
        const nameWrap = document.createElement('div');
        nameWrap.style.cssText = 'display:flex;align-items:center;gap:0.75rem;';

        const iconPlaceholder = document.createElement('div');
        iconPlaceholder.classList.add('skeleton-bone', 'skeleton-icon');
        nameWrap.appendChild(iconPlaceholder);

        const namePlaceholder = document.createElement('div');
        namePlaceholder.classList.add('skeleton-bone', 'skeleton-name');
        nameWrap.appendChild(namePlaceholder);

        nameCell.appendChild(nameWrap);
        row.appendChild(nameCell);

        // Date cell
        const dateCell = document.createElement('td');
        dateCell.classList.add('modified-cell');
        const datePlaceholder = document.createElement('div');
        datePlaceholder.classList.add('skeleton-bone', 'skeleton-date');
        dateCell.appendChild(datePlaceholder);
        row.appendChild(dateCell);

        // Size cell
        const sizeCell = document.createElement('td');
        sizeCell.classList.add('size-cell');
        const sizePlaceholder = document.createElement('div');
        sizePlaceholder.classList.add('skeleton-bone', 'skeleton-size');
        sizeCell.appendChild(sizePlaceholder);
        row.appendChild(sizeCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.classList.add('actions-cell');
        const actionsPlaceholder = document.createElement('div');
        actionsPlaceholder.classList.add('skeleton-bone', 'skeleton-actions');
        actionsCell.appendChild(actionsPlaceholder);
        row.appendChild(actionsCell);

        fragment.appendChild(row);
    }

    tableBody.appendChild(fragment);
}

/**
 * Render skeleton cards into the grid container
 * @param {HTMLElement} gridContainer - The grid view container
 * @param {number} [count] - Number of skeleton cards
 */
export function renderGridSkeletons(gridContainer, count = DEFAULT_GRID_CARDS) {
    if (!gridContainer) {
        return;
    }

    gridContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.classList.add('skeleton-card');
        card.setAttribute('aria-hidden', 'true');

        const iconPlaceholder = document.createElement('div');
        iconPlaceholder.classList.add('skeleton-bone', 'skeleton-card-icon');
        card.appendChild(iconPlaceholder);

        const namePlaceholder = document.createElement('div');
        namePlaceholder.classList.add('skeleton-bone', 'skeleton-card-name');
        card.appendChild(namePlaceholder);

        const metaPlaceholder = document.createElement('div');
        metaPlaceholder.classList.add('skeleton-bone', 'skeleton-card-meta');
        card.appendChild(metaPlaceholder);

        fragment.appendChild(card);
    }

    gridContainer.appendChild(fragment);
}

/**
 * Render skeleton items into the mobile list
 * @param {HTMLElement} mobileList - The mobile file list container
 * @param {number} [count] - Number of skeleton items
 */
export function renderMobileSkeletons(mobileList, count = DEFAULT_MOBILE_ITEMS) {
    if (!mobileList) {
        return;
    }

    mobileList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
        const item = document.createElement('div');
        item.classList.add('skeleton-mobile-item');
        item.setAttribute('aria-hidden', 'true');

        const iconPlaceholder = document.createElement('div');
        iconPlaceholder.classList.add('skeleton-bone', 'skeleton-mobile-icon');
        item.appendChild(iconPlaceholder);

        const textWrap = document.createElement('div');
        textWrap.classList.add('skeleton-mobile-text');

        const namePlaceholder = document.createElement('div');
        namePlaceholder.classList.add('skeleton-bone', 'skeleton-mobile-name');
        textWrap.appendChild(namePlaceholder);

        const metaPlaceholder = document.createElement('div');
        metaPlaceholder.classList.add('skeleton-bone', 'skeleton-mobile-meta');
        textWrap.appendChild(metaPlaceholder);

        item.appendChild(textWrap);
        fragment.appendChild(item);
    }

    mobileList.appendChild(fragment);
}

/**
 * Show skeleton loading placeholders in all active views
 * @param {Object} containers - { tableBody, gridContainer, mobileList }
 */
export function showSkeletons(containers = {}) {
    const { tableBody, gridContainer, mobileList } = containers;

    renderTableSkeletons(tableBody);

    if (gridContainer) {
        renderGridSkeletons(gridContainer);
    }

    // Only render mobile skeletons on mobile viewport
    if (mobileList && window.innerWidth < 768) {
        renderMobileSkeletons(mobileList);
    }
}

/**
 * Clear all skeleton placeholders
 * @param {Object} containers - { tableBody, gridContainer, mobileList }
 */
export function clearSkeletons(containers = {}) {
    const { tableBody, gridContainer, mobileList } = containers;

    if (tableBody) {
        const skeletons = tableBody.querySelectorAll('.skeleton-row');
        skeletons.forEach(el => el.remove());
    }

    if (gridContainer) {
        const skeletons = gridContainer.querySelectorAll('.skeleton-card');
        skeletons.forEach(el => el.remove());
    }

    if (mobileList) {
        const skeletons = mobileList.querySelectorAll('.skeleton-mobile-item');
        skeletons.forEach(el => el.remove());
    }
}
