/**
 * Virtual Scroll Module
 * Manages virtual scrolling for large item lists to improve performance
 * @version 1.0.0
 */

import { config } from './constants.js';

/**
 * Virtual Scroll Manager
 * Handles virtual scrolling by rendering only visible items in viewport
 */
export class VirtualScrollManager {
    constructor(options = {}) {
        this.itemHeight = options.itemHeight || config.virtualScroll?.itemHeight || 40;
        this.overscan = options.overscan || config.virtualScroll?.overscan || 5;
        this.container = options.container;
        this.onRender = options.onRender;
        this.onScroll = options.onScroll;
        
        // Internal state
        this.scrollTop = 0;
        this.viewportHeight = 0;
        this.totalItems = 0;
        this.isEnabled = true;
        
        // Performance tracking
        this.lastRenderTime = 0;
        this.renderCount = 0;
        
        // Scroll listener reference for cleanup
        this.scrollListener = null;
        
        // Initialize if container is provided
        if (this.container) {
            this.init();
        }
    }
    
    /**
     * Initialize the virtual scroll manager
     */
    init() {
        if (!this.container) {
            console.warn('[VirtualScroll] No container provided');
            return;
        }
        
        // Get initial viewport height
        this.updateViewportHeight();
        
        // Setup scroll listener
        this.setupScrollListener();
        
        // Setup resize observer for viewport changes
        this.setupResizeObserver();
        
        console.log('[VirtualScroll] Initialized', {
            itemHeight: this.itemHeight,
            overscan: this.overscan,
            viewportHeight: this.viewportHeight
        });
    }
    
    /**
     * Setup throttled scroll listener
     */
    setupScrollListener() {
        let rafId = null;
        
        this.scrollListener = () => {
            // Cancel previous frame if it hasn't executed yet
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
            
            // Schedule new frame
            rafId = requestAnimationFrame(() => {
                this.handleScroll();
                rafId = null;
            });
        };
        
        this.container.addEventListener('scroll', this.scrollListener, {
            passive: true
        });
    }
    
    /**
     * Setup resize observer to handle viewport changes
     */
    setupResizeObserver() {
        if (typeof ResizeObserver === 'undefined') {
            // Fallback for browsers without ResizeObserver
            window.addEventListener('resize', () => {
                this.updateViewportHeight();
                this.handleScroll();
            });
            return;
        }
        
        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                this.updateViewportHeight();
                this.handleScroll();
            }
        });
        
        this.resizeObserver.observe(this.container);
    }
    
    /**
     * Handle scroll event
     */
    handleScroll() {
        if (!this.isEnabled) return;
        
        const newScrollTop = this.container.scrollTop;
        
        // Only trigger render if scroll position changed significantly
        const scrollDelta = Math.abs(newScrollTop - this.scrollTop);
        const threshold = this.itemHeight / 2;
        
        if (scrollDelta < threshold && this.renderCount > 0) {
            // Small scroll, skip render for performance
            return;
        }
        
        this.scrollTop = newScrollTop;
        
        // Track performance
        const startTime = performance.now();
        
        // Trigger render callback
        if (this.onRender) {
            const range = this.getVisibleRange();
            this.onRender(range);
            this.renderCount++;
        }
        
        // Trigger scroll callback
        if (this.onScroll) {
            this.onScroll(this.scrollTop);
        }
        
        // Track render time
        this.lastRenderTime = performance.now() - startTime;
        
        // Log performance in development
        if (this.renderCount % 50 === 0) {
            console.log('[VirtualScroll] Performance', {
                renders: this.renderCount,
                lastRenderTime: this.lastRenderTime.toFixed(2) + 'ms'
            });
        }
    }
    
    /**
     * Update viewport height
     */
    updateViewportHeight() {
        if (this.container) {
            this.viewportHeight = this.container.clientHeight;
        }
    }
    
    /**
     * Get the range of visible items based on scroll position
     * @returns {Object} Range object with start, end, startIndex, and visibleCount
     */
    getVisibleRange() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const visibleCount = Math.ceil(this.viewportHeight / this.itemHeight);
        
        // Add overscan for smooth scrolling
        const start = Math.max(0, startIndex - this.overscan);
        const end = Math.min(this.totalItems, startIndex + visibleCount + this.overscan);
        
        return {
            start,
            end,
            startIndex,
            visibleCount,
            overscan: this.overscan
        };
    }
    
    /**
     * Get total height needed for all items
     * @returns {number} Total height in pixels
     */
    getTotalHeight() {
        return this.totalItems * this.itemHeight;
    }
    
    /**
     * Set the total number of items
     * @param {number} count Total item count
     */
    setTotalItems(count) {
        this.totalItems = count;
        console.log('[VirtualScroll] Total items set to', count);
    }
    
    /**
     * Scroll to a specific item index
     * @param {number} index Item index to scroll to
     * @param {Object} options Scroll options
     */
    scrollToIndex(index, options = {}) {
        if (!this.container) return;
        
        const behavior = options.behavior || 'smooth';
        const align = options.align || 'start'; // start, center, end
        
        let scrollTop = index * this.itemHeight;
        
        // Adjust scroll position based on alignment
        if (align === 'center') {
            scrollTop -= (this.viewportHeight - this.itemHeight) / 2;
        } else if (align === 'end') {
            scrollTop -= this.viewportHeight - this.itemHeight;
        }
        
        // Clamp to valid range
        scrollTop = Math.max(0, Math.min(scrollTop, this.getTotalHeight() - this.viewportHeight));
        
        this.container.scrollTo({
            top: scrollTop,
            behavior: behavior
        });
    }
    
    /**
     * Get the index of the item at the top of the viewport
     * @returns {number} Index of top visible item
     */
    getTopVisibleIndex() {
        return Math.floor(this.scrollTop / this.itemHeight);
    }
    
    /**
     * Check if an item is currently visible
     * @param {number} index Item index
     * @returns {boolean} True if item is visible
     */
    isItemVisible(index) {
        const range = this.getVisibleRange();
        return index >= range.start && index < range.end;
    }
    
    /**
     * Enable virtual scrolling
     */
    enable() {
        this.isEnabled = true;
        console.log('[VirtualScroll] Enabled');
    }
    
    /**
     * Disable virtual scrolling (useful for debugging)
     */
    disable() {
        this.isEnabled = false;
        console.log('[VirtualScroll] Disabled');
    }
    
    /**
     * Get performance statistics
     * @returns {Object} Performance stats
     */
    getPerformanceStats() {
        return {
            renderCount: this.renderCount,
            lastRenderTime: this.lastRenderTime,
            averageRenderTime: this.lastRenderTime, // Could be enhanced to track average
            totalItems: this.totalItems,
            viewportHeight: this.viewportHeight,
            scrollTop: this.scrollTop
        };
    }
    
    /**
     * Cleanup and remove event listeners
     */
    destroy() {
        if (this.scrollListener && this.container) {
            this.container.removeEventListener('scroll', this.scrollListener);
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        console.log('[VirtualScroll] Destroyed');
    }
}

/**
 * Create a spacer element for virtual scrolling
 * Spacers fill the space of non-rendered items
 * @param {number} height Height of the spacer in pixels
 * @returns {HTMLElement} Spacer element
 */
export function createSpacer(height) {
    if (height <= 0) return null;
    
    const spacer = document.createElement('tr');
    spacer.classList.add('virtual-scroll-spacer');
    spacer.style.height = `${height}px`;
    spacer.setAttribute('aria-hidden', 'true');
    
    // Create a td that spans all columns
    const td = document.createElement('td');
    td.colSpan = 100; // Large number to span all columns
    spacer.appendChild(td);
    
    return spacer;
}

/**
 * Check if virtual scrolling should be enabled for given item count
 * @param {number} itemCount Number of items
 * @returns {boolean} True if virtual scrolling should be enabled
 */
export function shouldUseVirtualScroll(itemCount) {
    const threshold = config.virtualScroll?.threshold || 100;
    const enabled = config.virtualScroll?.enabled !== false;
    
    return enabled && itemCount > threshold;
}

/**
 * Calculate optimal overscan based on item count and viewport
 * @param {number} itemCount Total item count
 * @param {number} viewportHeight Viewport height in pixels
 * @param {number} itemHeight Item height in pixels
 * @returns {number} Optimal overscan count
 */
export function calculateOptimalOverscan(itemCount, viewportHeight, itemHeight) {
    const visibleCount = Math.ceil(viewportHeight / itemHeight);
    
    // Use higher overscan for smaller item counts
    if (itemCount < 200) {
        return Math.min(10, Math.ceil(visibleCount * 0.5));
    } else if (itemCount < 1000) {
        return Math.min(5, Math.ceil(visibleCount * 0.3));
    } else {
        return Math.min(3, Math.ceil(visibleCount * 0.2));
    }
}

// Export for testing
export const _testing = {
    VirtualScrollManager,
    createSpacer,
    shouldUseVirtualScroll,
    calculateOptimalOverscan
};