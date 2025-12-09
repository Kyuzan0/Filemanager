/**
 * Debug Utility Module
 * Provides conditional logging based on debug mode configuration
 */

import { config } from './constants.js';

/**
 * Conditional console.log wrapper
 * Only logs when debugMode is enabled
 * @param {...any} args - Arguments to log
 */
export function debugLog(...args) {
    if (config.debugMode) {
        console.log(...args);
    }
}

/**
 * Conditional console.error wrapper
 * Always logs errors regardless of debug mode
 * @param {...any} args - Arguments to log
 */
export function debugError(...args) {
    console.error(...args);
}

/**
 * Conditional console.warn wrapper
 * Only logs when debugMode is enabled
 * @param {...any} args - Arguments to log
 */
export function debugWarn(...args) {
    if (config.debugMode) {
        console.warn(...args);
    }
}

/**
 * Performance logging utility
 * Logs performance metrics only when debugMode is enabled
 * @param {string} label - Performance label
 * @param {number} duration - Duration in milliseconds
 */
export function debugPerf(label, duration) {
    if (config.debugMode) {
        console.log(`[PERF] ${label}:`, duration.toFixed(2), 'ms');
    }
}