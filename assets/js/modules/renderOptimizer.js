/**
 * Render Optimizer Module
 * Provides performance optimizations for rendering operations
 * 
 * Features:
 * - Render batching: Queue multiple render calls and execute as single batch
 * - RequestAnimationFrame wrapper: Ensure renders happen at optimal times
 * - Dirty checking: Only re-render components that have changed
 * - Memoization: Cache rendered elements that haven't changed
 */

/**
 * @typedef {Object} RenderTask
 * @property {string} id - Unique identifier for the task
 * @property {Function} render - The render function to execute
 * @property {number} priority - Priority (lower = higher priority)
 * @property {number} timestamp - When the task was queued
 */

/**
 * @typedef {Object} CacheEntry
 * @property {*} value - Cached value
 * @property {*} deps - Dependencies used to create the value
 * @property {number} timestamp - When the entry was created
 * @property {number} hits - Number of cache hits
 */

// ============================================================================
// Render Batching
// ============================================================================

/** @type {Map<string, RenderTask>} */
const renderQueue = new Map();

/** @type {number|null} */
let batchFrameId = null;

/** @type {boolean} */
let isBatching = false;

/**
 * Queue a render task for batched execution
 * If a task with the same ID is already queued, it will be replaced
 * 
 * @param {string} id - Unique identifier for the render task
 * @param {Function} renderFn - The render function to execute
 * @param {number} [priority=5] - Priority (1-10, lower = higher priority)
 */
export function queueRender(id, renderFn, priority = 5) {
    const task = {
        id,
        render: renderFn,
        priority: Math.min(10, Math.max(1, priority)),
        timestamp: performance.now()
    };
    
    renderQueue.set(id, task);
    
    if (!batchFrameId) {
        batchFrameId = requestAnimationFrame(executeBatch);
    }
}

/**
 * Execute all queued render tasks in priority order
 */
function executeBatch() {
    if (renderQueue.size === 0) {
        batchFrameId = null;
        return;
    }
    
    isBatching = true;
    const startTime = performance.now();
    
    // Sort tasks by priority (lower number = higher priority)
    const sortedTasks = Array.from(renderQueue.values())
        .sort((a, b) => a.priority - b.priority);
    
    // Clear queue before executing to allow new tasks to be queued during execution
    renderQueue.clear();
    
    // Execute tasks
    let executedCount = 0;
    const errors = [];
    
    for (const task of sortedTasks) {
        try {
            task.render();
            executedCount++;
        } catch (error) {
            errors.push({ id: task.id, error });
            console.error(`[RenderOptimizer] Error executing task "${task.id}":`, error);
        }
    }
    
    isBatching = false;
    batchFrameId = null;
    
    const duration = performance.now() - startTime;
    
    // Log performance if it takes too long
    if (duration > 16) { // More than one frame (60fps = ~16ms per frame)
        console.warn(`[RenderOptimizer] Batch took ${duration.toFixed(2)}ms for ${executedCount} tasks`);
    }
    
    // Check if new tasks were queued during execution
    if (renderQueue.size > 0) {
        batchFrameId = requestAnimationFrame(executeBatch);
    }
}

/**
 * Cancel a queued render task
 * @param {string} id - The task ID to cancel
 * @returns {boolean} Whether a task was cancelled
 */
export function cancelRender(id) {
    return renderQueue.delete(id);
}

/**
 * Cancel all queued render tasks
 */
export function cancelAllRenders() {
    renderQueue.clear();
    if (batchFrameId) {
        cancelAnimationFrame(batchFrameId);
        batchFrameId = null;
    }
}

/**
 * Force immediate execution of all queued tasks
 */
export function flushRenders() {
    if (batchFrameId) {
        cancelAnimationFrame(batchFrameId);
        batchFrameId = null;
    }
    executeBatch();
}

/**
 * Check if the optimizer is currently batching
 * @returns {boolean}
 */
export function isBatchingRenders() {
    return isBatching;
}


// ============================================================================
// RequestAnimationFrame Wrapper
// ============================================================================

/** @type {Map<string, number>} */
const rafHandles = new Map();

/**
 * Schedule a callback to run on the next animation frame
 * Automatically cancels any previous pending callback with the same key
 * 
 * @param {string} key - Unique key for this animation frame callback
 * @param {Function} callback - The callback to execute
 * @returns {number} The RAF handle
 */
export function scheduleFrame(key, callback) {
    // Cancel any existing frame with this key
    const existingHandle = rafHandles.get(key);
    if (existingHandle) {
        cancelAnimationFrame(existingHandle);
    }
    
    const handle = requestAnimationFrame((timestamp) => {
        rafHandles.delete(key);
        callback(timestamp);
    });
    
    rafHandles.set(key, handle);
    return handle;
}

/**
 * Cancel a scheduled animation frame
 * @param {string} key - The key of the frame to cancel
 * @returns {boolean} Whether a frame was cancelled
 */
export function cancelFrame(key) {
    const handle = rafHandles.get(key);
    if (handle) {
        cancelAnimationFrame(handle);
        rafHandles.delete(key);
        return true;
    }
    return false;
}

/**
 * Cancel all scheduled animation frames
 */
export function cancelAllFrames() {
    for (const handle of rafHandles.values()) {
        cancelAnimationFrame(handle);
    }
    rafHandles.clear();
}


// ============================================================================
// Dirty Checking
// ============================================================================

/** @type {Map<string, *>} */
const componentStates = new Map();

/** @type {Set<string>} */
const dirtyComponents = new Set();

/**
 * Mark a component as dirty (needs re-render)
 * @param {string} componentId - The component identifier
 */
export function markDirty(componentId) {
    dirtyComponents.add(componentId);
}

/**
 * Mark a component as clean (just rendered)
 * @param {string} componentId - The component identifier
 */
export function markClean(componentId) {
    dirtyComponents.delete(componentId);
}

/**
 * Check if a component is dirty
 * @param {string} componentId - The component identifier
 * @returns {boolean}
 */
export function isDirty(componentId) {
    return dirtyComponents.has(componentId);
}

/**
 * Get all dirty component IDs
 * @returns {string[]}
 */
export function getDirtyComponents() {
    return Array.from(dirtyComponents);
}

/**
 * Clear all dirty flags
 */
export function clearAllDirty() {
    dirtyComponents.clear();
}

/**
 * Update component state and check if it changed
 * Returns true if the component should re-render
 * 
 * @param {string} componentId - The component identifier
 * @param {*} newState - The new state value
 * @param {Function} [compareFn] - Custom comparison function
 * @returns {boolean} Whether the state changed
 */
export function updateComponentState(componentId, newState, compareFn = null) {
    const oldState = componentStates.get(componentId);
    
    const hasChanged = compareFn 
        ? !compareFn(oldState, newState)
        : !shallowEqual(oldState, newState);
    
    if (hasChanged) {
        componentStates.set(componentId, newState);
        markDirty(componentId);
        return true;
    }
    
    return false;
}

/**
 * Get the current state of a component
 * @param {string} componentId - The component identifier
 * @returns {*}
 */
export function getComponentState(componentId) {
    return componentStates.get(componentId);
}

/**
 * Clear component state
 * @param {string} componentId - The component identifier
 */
export function clearComponentState(componentId) {
    componentStates.delete(componentId);
    dirtyComponents.delete(componentId);
}

/**
 * Shallow equality check for objects
 * @param {*} a - First value
 * @param {*} b - Second value
 * @returns {boolean}
 */
function shallowEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return a === b;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
        if (a[key] !== b[key]) return false;
    }
    
    return true;
}


// ============================================================================
// Memoization
// ============================================================================

/** @type {Map<string, CacheEntry>} */
const memoCache = new Map();

/** @type {number} */
const MAX_CACHE_SIZE = 100;

/** @type {number} */
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Memoize a function result based on dependencies
 * Returns cached value if dependencies haven't changed
 * 
 * @param {string} key - Cache key
 * @param {Function} computeFn - Function to compute the value
 * @param {Array} deps - Dependencies array
 * @returns {*} The computed or cached value
 */
export function memoize(key, computeFn, deps) {
    const cached = memoCache.get(key);
    const now = Date.now();
    
    if (cached) {
        // Check if cache is still valid
        const depsMatch = deps.length === cached.deps.length && 
            deps.every((dep, i) => dep === cached.deps[i]);
        
        const notExpired = (now - cached.timestamp) < CACHE_TTL;
        
        if (depsMatch && notExpired) {
            cached.hits++;
            return cached.value;
        }
    }
    
    // Compute new value
    const value = computeFn();
    
    // Check cache size limit
    if (memoCache.size >= MAX_CACHE_SIZE) {
        evictOldestEntries(Math.floor(MAX_CACHE_SIZE * 0.2)); // Evict 20%
    }
    
    memoCache.set(key, {
        value,
        deps: [...deps],
        timestamp: now,
        hits: 0
    });
    
    return value;
}

/**
 * Invalidate a cached value
 * @param {string} key - Cache key
 * @returns {boolean} Whether an entry was invalidated
 */
export function invalidateMemo(key) {
    return memoCache.delete(key);
}

/**
 * Invalidate all cached values matching a pattern
 * @param {RegExp|string} pattern - Pattern to match keys
 * @returns {number} Number of entries invalidated
 */
export function invalidateMemoPattern(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;
    
    for (const key of memoCache.keys()) {
        if (regex.test(key)) {
            memoCache.delete(key);
            count++;
        }
    }
    
    return count;
}

/**
 * Clear all cached values
 */
export function clearMemoCache() {
    memoCache.clear();
}

/**
 * Get cache statistics
 * @returns {Object}
 */
export function getMemoStats() {
    let totalHits = 0;
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;
    
    for (const entry of memoCache.values()) {
        totalHits += entry.hits;
        if (entry.timestamp < oldestTimestamp) oldestTimestamp = entry.timestamp;
        if (entry.timestamp > newestTimestamp) newestTimestamp = entry.timestamp;
    }
    
    return {
        size: memoCache.size,
        maxSize: MAX_CACHE_SIZE,
        totalHits,
        ttl: CACHE_TTL,
        oldestAge: Date.now() - oldestTimestamp,
        newestAge: Date.now() - newestTimestamp
    };
}

/**
 * Evict the oldest entries from the cache
 * @param {number} count - Number of entries to evict
 */
function evictOldestEntries(count) {
    const entries = Array.from(memoCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (let i = 0; i < Math.min(count, entries.length); i++) {
        memoCache.delete(entries[i][0]);
    }
}


// ============================================================================
// Virtual DOM Diffing Helpers
// ============================================================================

/**
 * Create a minimal diff between two arrays of items
 * Returns operations needed to transform oldItems into newItems
 * 
 * @param {Array} oldItems - Original array
 * @param {Array} newItems - New array
 * @param {Function} getKey - Function to get unique key from item
 * @returns {Object} Diff operations
 */
export function diffArrays(oldItems, newItems, getKey) {
    const oldMap = new Map(oldItems.map((item, i) => [getKey(item), { item, index: i }]));
    const newMap = new Map(newItems.map((item, i) => [getKey(item), { item, index: i }]));
    
    const added = [];
    const removed = [];
    const moved = [];
    const unchanged = [];
    
    // Find removed and unchanged items
    for (const [key, { item, index }] of oldMap) {
        if (!newMap.has(key)) {
            removed.push({ key, item, oldIndex: index });
        }
    }
    
    // Find added, moved, and unchanged items
    for (const [key, { item, index }] of newMap) {
        const oldEntry = oldMap.get(key);
        
        if (!oldEntry) {
            added.push({ key, item, newIndex: index });
        } else if (oldEntry.index !== index) {
            moved.push({ key, item, oldIndex: oldEntry.index, newIndex: index });
        } else {
            unchanged.push({ key, item, index });
        }
    }
    
    return { added, removed, moved, unchanged };
}

/**
 * Apply minimal DOM updates based on diff
 * 
 * @param {HTMLElement} container - Parent container
 * @param {Object} diff - Diff from diffArrays
 * @param {Function} createNode - Function to create a new DOM node
 * @param {Function} updateNode - Function to update an existing DOM node
 * @param {Function} getNodeByKey - Function to find a node by key
 */
export function applyDiff(container, diff, createNode, updateNode, getNodeByKey) {
    const { added, removed, moved, unchanged } = diff;
    
    // Remove nodes
    for (const { key } of removed) {
        const node = getNodeByKey(key);
        if (node) {
            node.remove();
        }
    }
    
    // Move nodes
    for (const { key, item, newIndex } of moved) {
        const node = getNodeByKey(key);
        if (node) {
            updateNode(node, item);
            // Will be repositioned below
        }
    }
    
    // Add new nodes
    for (const { key, item, newIndex } of added) {
        const node = createNode(item);
        node.dataset.key = key;
        // Will be positioned below
    }
    
    // Reposition all nodes in correct order
    const allChildren = Array.from(container.children);
    const sortedChildren = [...unchanged, ...moved, ...added]
        .sort((a, b) => (a.newIndex ?? a.index) - (b.newIndex ?? b.index));
    
    // Use DocumentFragment for efficient reordering
    const fragment = document.createDocumentFragment();
    for (const { key } of sortedChildren) {
        const node = getNodeByKey(key) || allChildren.find(n => n.dataset.key === key);
        if (node) {
            fragment.appendChild(node);
        }
    }
    container.appendChild(fragment);
}


// ============================================================================
// Debounce and Throttle
// ============================================================================

/** @type {Map<string, number>} */
const debounceTimers = new Map();

/** @type {Map<string, number>} */
const throttleTimestamps = new Map();

/**
 * Debounce a function by key
 * Only the last call within the delay period will execute
 * 
 * @param {string} key - Unique key for this debounce
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 */
export function debounceByKey(key, fn, delay) {
    const existingTimer = debounceTimers.get(key);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }
    
    const timer = setTimeout(() => {
        debounceTimers.delete(key);
        fn();
    }, delay);
    
    debounceTimers.set(key, timer);
}

/**
 * Cancel a debounced function
 * @param {string} key - The debounce key
 */
export function cancelDebounce(key) {
    const timer = debounceTimers.get(key);
    if (timer) {
        clearTimeout(timer);
        debounceTimers.delete(key);
    }
}

/**
 * Throttle a function by key
 * Only one call per interval will execute
 * 
 * @param {string} key - Unique key for this throttle
 * @param {Function} fn - Function to throttle
 * @param {number} interval - Minimum interval in milliseconds
 * @returns {boolean} Whether the function was executed
 */
export function throttleByKey(key, fn, interval) {
    const lastTimestamp = throttleTimestamps.get(key) || 0;
    const now = Date.now();
    
    if (now - lastTimestamp >= interval) {
        throttleTimestamps.set(key, now);
        fn();
        return true;
    }
    
    return false;
}


// ============================================================================
// Performance Monitoring
// ============================================================================

/** @type {Map<string, Array<number>>} */
const performanceMetrics = new Map();

/** @type {number} */
const MAX_METRICS_HISTORY = 100;

/**
 * Record a performance metric
 * 
 * @param {string} name - Metric name
 * @param {number} duration - Duration in milliseconds
 */
export function recordMetric(name, duration) {
    if (!performanceMetrics.has(name)) {
        performanceMetrics.set(name, []);
    }
    
    const metrics = performanceMetrics.get(name);
    metrics.push(duration);
    
    // Keep only recent metrics
    if (metrics.length > MAX_METRICS_HISTORY) {
        metrics.shift();
    }
}

/**
 * Get performance metrics for a name
 * 
 * @param {string} name - Metric name
 * @returns {Object|null}
 */
export function getMetrics(name) {
    const metrics = performanceMetrics.get(name);
    if (!metrics || metrics.length === 0) return null;
    
    const sorted = [...metrics].sort((a, b) => a - b);
    const sum = metrics.reduce((a, b) => a + b, 0);
    
    return {
        count: metrics.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: sum / metrics.length,
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        last: metrics[metrics.length - 1]
    };
}

/**
 * Get all performance metrics
 * @returns {Object}
 */
export function getAllMetrics() {
    const result = {};
    for (const name of performanceMetrics.keys()) {
        result[name] = getMetrics(name);
    }
    return result;
}

/**
 * Clear all performance metrics
 */
export function clearMetrics() {
    performanceMetrics.clear();
}

/**
 * Measure the execution time of a function
 * 
 * @param {string} name - Metric name
 * @param {Function} fn - Function to measure
 * @returns {*} The function's return value
 */
export function measure(name, fn) {
    const start = performance.now();
    try {
        return fn();
    } finally {
        const duration = performance.now() - start;
        recordMetric(name, duration);
    }
}

/**
 * Async version of measure
 * 
 * @param {string} name - Metric name
 * @param {Function} asyncFn - Async function to measure
 * @returns {Promise<*>} The function's return value
 */
export async function measureAsync(name, asyncFn) {
    const start = performance.now();
    try {
        return await asyncFn();
    } finally {
        const duration = performance.now() - start;
        recordMetric(name, duration);
    }
}