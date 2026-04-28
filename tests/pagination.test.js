/**
 * Pagination Module Tests
 * Tests for public/assets/js/modules/pagination.js
 */

jest.mock('../public/assets/js/modules/constants.js', () => ({
    config: {
        pagination: {
            enabled: true,
            itemsPerPage: 10,
            showControls: true,
            showInStatusBar: true
        }
    }
}));

jest.mock('../public/assets/js/modules/debug.js', () => ({
    debugLog: jest.fn()
}));

import {
    calculatePagination,
    getItemsForPage,
    getPaginationState,
    setItemsPerPage,
    resetPagination,
    updatePaginationState,
    formatPaginationInfo,
    getSimplePaginationInfo,
    scrollToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    getCurrentPageFromScroll,
    initScrollTracking,
    renderPaginationControls
} from '../public/assets/js/modules/pagination.js';

describe('Pagination Module', () => {
    beforeEach(() => {
        resetPagination();
        // Reset internal state by setting known values
        updatePaginationState(1, 1, 0);
    });

    describe('calculatePagination()', () => {
        test('calculates single page for small item count', () => {
            const result = calculatePagination(5, 10);
            expect(result.totalPages).toBe(1);
            expect(result.totalItems).toBe(5);
            expect(result.itemsPerPage).toBe(10);
        });

        test('calculates multiple pages', () => {
            const result = calculatePagination(25, 10);
            expect(result.totalPages).toBe(3);
        });

        test('handles exact page boundary', () => {
            const result = calculatePagination(20, 10);
            expect(result.totalPages).toBe(2);
        });

        test('handles 0 items', () => {
            const result = calculatePagination(0, 10);
            expect(result.totalPages).toBe(1);
        });

        test('handles 1 item', () => {
            const result = calculatePagination(1, 10);
            expect(result.totalPages).toBe(1);
        });

        test('clamps currentPage to totalPages', () => {
            // Set current page to 5
            updatePaginationState(5, 5, 50);
            // Now calculate with fewer items
            const result = calculatePagination(10, 10);
            expect(result.currentPage).toBeLessThanOrEqual(result.totalPages);
        });
    });

    describe('getItemsForPage()', () => {
        const items = Array.from({ length: 25 }, (_, i) => ({ name: `item${i}` }));

        test('returns correct slice for page 1', () => {
            const result = getItemsForPage(items, 1, 10);
            expect(result.length).toBe(10);
            expect(result[0].name).toBe('item0');
            expect(result[9].name).toBe('item9');
        });

        test('returns correct slice for page 2', () => {
            const result = getItemsForPage(items, 2, 10);
            expect(result.length).toBe(10);
            expect(result[0].name).toBe('item10');
        });

        test('returns remaining items for last page', () => {
            const result = getItemsForPage(items, 3, 10);
            expect(result.length).toBe(5);
            expect(result[0].name).toBe('item20');
        });

        test('returns empty array for null items', () => {
            expect(getItemsForPage(null)).toEqual([]);
        });

        test('returns empty array for non-array', () => {
            expect(getItemsForPage('not an array')).toEqual([]);
        });

        test('returns empty array for empty array', () => {
            expect(getItemsForPage([], 1, 10)).toEqual([]);
        });
    });

    describe('getPaginationState()', () => {
        test('returns copy of state', () => {
            updatePaginationState(2, 5, 50);
            const state = getPaginationState();
            expect(state.currentPage).toBe(2);
            expect(state.totalPages).toBe(5);
            expect(state.totalItems).toBe(50);
        });

        test('returned object is a copy (not reference)', () => {
            const state1 = getPaginationState();
            const state2 = getPaginationState();
            expect(state1).not.toBe(state2);
            expect(state1).toEqual(state2);
        });
    });

    describe('setItemsPerPage()', () => {
        test('updates items per page', () => {
            updatePaginationState(1, 1, 100);
            setItemsPerPage(25);
            const state = getPaginationState();
            expect(state.itemsPerPage).toBe(25);
        });

        test('recalculates total pages', () => {
            updatePaginationState(1, 10, 100);
            setItemsPerPage(20);
            const state = getPaginationState();
            expect(state.totalPages).toBe(5);
        });

        test('ignores zero or negative values', () => {
            const before = getPaginationState().itemsPerPage;
            setItemsPerPage(0);
            expect(getPaginationState().itemsPerPage).toBe(before);
            setItemsPerPage(-5);
            expect(getPaginationState().itemsPerPage).toBe(before);
        });

        test('ignores same value', () => {
            setItemsPerPage(50);
            const state1 = getPaginationState();
            setItemsPerPage(50);
            const state2 = getPaginationState();
            expect(state1.itemsPerPage).toBe(state2.itemsPerPage);
        });
    });

    describe('resetPagination()', () => {
        test('resets current page to 1', () => {
            updatePaginationState(5, 10, 100);
            resetPagination();
            const state = getPaginationState();
            expect(state.currentPage).toBe(1);
        });
    });

    describe('updatePaginationState()', () => {
        test('updates all state values', () => {
            updatePaginationState(3, 10, 100);
            const state = getPaginationState();
            expect(state.currentPage).toBe(3);
            expect(state.totalPages).toBe(10);
            expect(state.totalItems).toBe(100);
        });

        test('dispatches pagination-updated event when changed', () => {
            const handler = jest.fn();
            document.addEventListener('pagination-updated', handler);

            updatePaginationState(2, 5, 50);
            expect(handler).toHaveBeenCalledTimes(1);

            const detail = handler.mock.calls[0][0].detail;
            expect(detail.currentPage).toBe(2);
            expect(detail.totalPages).toBe(5);

            document.removeEventListener('pagination-updated', handler);
        });

        test('does not dispatch event when values unchanged', () => {
            updatePaginationState(1, 1, 0);
            const handler = jest.fn();
            document.addEventListener('pagination-updated', handler);

            updatePaginationState(1, 1, 0);
            expect(handler).not.toHaveBeenCalled();

            document.removeEventListener('pagination-updated', handler);
        });
    });

    describe('formatPaginationInfo()', () => {
        test('returns "Tidak ada item" for 0 items', () => {
            expect(formatPaginationInfo(1, 1, 0)).toBe('Tidak ada item');
        });

        test('returns item count for single page', () => {
            setItemsPerPage(50);
            const result = formatPaginationInfo(1, 1, 25);
            expect(result).toContain('25');
            expect(result).toContain('item');
        });

        test('returns page info for multiple pages', () => {
            setItemsPerPage(10);
            const result = formatPaginationInfo(2, 5, 50);
            expect(result).toContain('2');
            expect(result).toContain('5');
            expect(result).toContain('11');
            expect(result).toContain('20');
        });
    });

    describe('getSimplePaginationInfo()', () => {
        test('returns empty string for single page', () => {
            expect(getSimplePaginationInfo(1, 1)).toBe('');
        });

        test('returns page info for multiple pages', () => {
            const result = getSimplePaginationInfo(3, 10);
            expect(result).toContain('3');
            expect(result).toContain('10');
        });
    });

    describe('scrollToPage()', () => {
        test('updates pagination state', () => {
            updatePaginationState(1, 5, 50);
            scrollToPage(null, 3, 40);
            const state = getPaginationState();
            expect(state.currentPage).toBe(3);
        });

        test('clamps page to valid range', () => {
            updatePaginationState(1, 5, 50);
            scrollToPage(null, 10, 40);
            const state = getPaginationState();
            expect(state.currentPage).toBeLessThanOrEqual(5);
        });

        test('clamps page to minimum 1', () => {
            updatePaginationState(1, 5, 50);
            scrollToPage(null, 0, 40);
            const state = getPaginationState();
            expect(state.currentPage).toBe(1);
        });
    });

    describe('Navigation functions', () => {
        beforeEach(() => {
            setItemsPerPage(10);
            updatePaginationState(3, 5, 50);
        });

        test('goToNextPage increments page', () => {
            goToNextPage(null, 40);
            expect(getPaginationState().currentPage).toBe(4);
        });

        test('goToNextPage does nothing on last page', () => {
            updatePaginationState(5, 5, 50);
            goToNextPage(null, 40);
            expect(getPaginationState().currentPage).toBe(5);
        });

        test('goToPreviousPage decrements page', () => {
            goToPreviousPage(null, 40);
            expect(getPaginationState().currentPage).toBe(2);
        });

        test('goToPreviousPage does nothing on first page', () => {
            updatePaginationState(1, 5, 50);
            goToPreviousPage(null, 40);
            expect(getPaginationState().currentPage).toBe(1);
        });

        test('goToFirstPage goes to page 1', () => {
            goToFirstPage(null, 40);
            expect(getPaginationState().currentPage).toBe(1);
        });

        test('goToLastPage goes to last page', () => {
            goToLastPage(null, 40);
            expect(getPaginationState().currentPage).toBe(5);
        });
    });

    describe('getCurrentPageFromScroll()', () => {
        test('returns 1 for null container (always returns state page)', () => {
            // getCurrentPageFromScroll returns 1 for null container
            expect(getCurrentPageFromScroll(null, 50, 40)).toBe(1);
        });

        test('returns current page when container provided', () => {
            updatePaginationState(3, 5, 50);
            const container = document.createElement('div');
            expect(getCurrentPageFromScroll(container, 50, 40)).toBe(3);
        });
    });

    describe('initScrollTracking()', () => {
        test('returns cleanup function', () => {
            const container = document.createElement('div');
            const cleanup = initScrollTracking(container, 50, 40);
            expect(typeof cleanup).toBe('function');
        });

        test('handles null container', () => {
            const result = initScrollTracking(null, 50, 40);
            expect(result).toBeUndefined();
        });
    });

    describe('renderPaginationControls()', () => {
        test('renders pagination controls element', () => {
            const el = renderPaginationControls({
                currentPage: 1,
                totalPages: 5,
                totalItems: 50,
                onPrevious: jest.fn(),
                onNext: jest.fn(),
                onFirst: jest.fn(),
                onLast: jest.fn(),
                onPageSelect: jest.fn()
            });

            expect(el.classList.contains('pagination-controls')).toBe(true);
            expect(el.querySelector('.pagination-info')).not.toBeNull();
            expect(el.querySelector('.pagination-buttons')).not.toBeNull();
        });

        test('disables prev/first buttons on page 1', () => {
            const el = renderPaginationControls({
                currentPage: 1,
                totalPages: 5,
                totalItems: 50,
                onPrevious: jest.fn(),
                onNext: jest.fn(),
                onFirst: jest.fn(),
                onLast: jest.fn(),
                onPageSelect: jest.fn()
            });

            const buttons = el.querySelectorAll('.pagination-btn');
            // First two buttons (first, prev) should be disabled
            expect(buttons[0].disabled).toBe(true);
            expect(buttons[1].disabled).toBe(true);
        });

        test('disables next/last buttons on last page', () => {
            const el = renderPaginationControls({
                currentPage: 5,
                totalPages: 5,
                totalItems: 50,
                onPrevious: jest.fn(),
                onNext: jest.fn(),
                onFirst: jest.fn(),
                onLast: jest.fn(),
                onPageSelect: jest.fn()
            });

            const buttons = el.querySelectorAll('.pagination-btn');
            // Last two buttons (next, last) should be disabled
            expect(buttons[2].disabled).toBe(true);
            expect(buttons[3].disabled).toBe(true);
        });

        test('renders page buttons', () => {
            const el = renderPaginationControls({
                currentPage: 3,
                totalPages: 5,
                totalItems: 50,
                onPrevious: jest.fn(),
                onNext: jest.fn(),
                onFirst: jest.fn(),
                onLast: jest.fn(),
                onPageSelect: jest.fn()
            });

            const pageButtons = el.querySelectorAll('.pagination-page-btn');
            expect(pageButtons.length).toBeGreaterThan(0);
        });

        test('marks current page button as active', () => {
            const el = renderPaginationControls({
                currentPage: 3,
                totalPages: 5,
                totalItems: 50,
                onPrevious: jest.fn(),
                onNext: jest.fn(),
                onFirst: jest.fn(),
                onLast: jest.fn(),
                onPageSelect: jest.fn()
            });

            const activeBtn = el.querySelector('.pagination-page-btn.active');
            expect(activeBtn).not.toBeNull();
            expect(activeBtn.textContent).toBe('3');
        });

        test('calls onPageSelect when page button clicked', () => {
            const onPageSelect = jest.fn();
            const el = renderPaginationControls({
                currentPage: 1,
                totalPages: 5,
                totalItems: 50,
                onPrevious: jest.fn(),
                onNext: jest.fn(),
                onFirst: jest.fn(),
                onLast: jest.fn(),
                onPageSelect
            });

            // Find a non-active page button
            const pageButtons = el.querySelectorAll('.pagination-page-btn:not(.active)');
            if (pageButtons.length > 0) {
                pageButtons[0].click();
                expect(onPageSelect).toHaveBeenCalled();
            }
        });
    });
});
