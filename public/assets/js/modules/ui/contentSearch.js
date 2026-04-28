/**
 * Content Search Module
 * =====================
 * Full-text grep-like search across file contents.
 * - Regex and case-sensitive support
 * - File type filtering
 * - Result grouping by file with context lines
 * - Click to open file in editor
 * - Keyboard navigation (Ctrl+Shift+F to open)
 *
 * @module contentSearch
 */

import { searchFiles } from '../apiService.js';

// ── State ──
let panelEl = null;
let inputEl = null;
let resultsEl = null;
let statusEl = null;
let isOpen = false;
let abortController = null;
let lastResults = null;
let onOpenFile = null;
let onNavigateTo = null;
let getCurrentPath = null;

/**
 * Initialize the content search module
 * @param {Object} handlers
 * @param {Function} handlers.openFile - (path, name) => open file in editor
 * @param {Function} handlers.navigateTo - (path) => navigate to directory
 * @param {Function} handlers.getCurrentPath - () => current directory path
 */
export function initContentSearch(handlers) {
    onOpenFile = handlers.openFile;
    onNavigateTo = handlers.navigateTo;
    getCurrentPath = handlers.getCurrentPath;

    // Global Ctrl+Shift+F listener
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
            e.preventDefault();
            e.stopPropagation();
            if (isOpen) {
                close();
            } else {
                open();
            }
        }
    });
}

/**
 * Open the content search panel
 * @param {string} [initialQuery=''] - Pre-fill the search input
 */
export function open(initialQuery = '') {
    if (isOpen) return;
    isOpen = true;

    const backdrop = document.createElement('div');
    backdrop.className = 'content-search-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Content Search');

    backdrop.innerHTML = `
        <div class="content-search">
            <div class="csearch__header">
                <span class="csearch__header-icon">🔍</span>
                <span class="csearch__header-title">Content Search</span>
                <button class="csearch__close" aria-label="Close" title="Close">&times;</button>
            </div>
            <div class="csearch__form">
                <div class="csearch__input-row">
                    <div class="csearch__input-wrap">
                        <svg class="csearch__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"/>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input class="csearch__input" id="csearch-query" type="text" placeholder="Search in file contents..." autocomplete="off" spellcheck="false" />
                    </div>
                    <button class="csearch__btn-search" id="csearch-btn">Search</button>
                </div>
                <div class="csearch__options">
                    <label class="csearch__option">
                        <input type="checkbox" id="csearch-regex" />
                        <span>Regex</span>
                    </label>
                    <label class="csearch__option">
                        <input type="checkbox" id="csearch-case" />
                        <span>Case Sensitive</span>
                    </label>
                    <input class="csearch__ext-input" id="csearch-ext" type="text" placeholder="js,php,css..." title="Filter by file extensions (comma-separated)" />
                </div>
            </div>
            <div class="csearch__status" id="csearch-status" style="display:none;">
                <span class="csearch__status-text" id="csearch-status-text"></span>
            </div>
            <div class="csearch__results" id="csearch-results">
                <div class="csearch__empty">
                    <div class="csearch__empty-icon">🔎</div>
                    <div>Search across all file contents in the current directory</div>
                </div>
            </div>
            <div class="csearch__footer">
                <span><kbd>Enter</kbd> search</span>
                <span><kbd>Esc</kbd> close</span>
                <span><kbd>Click</kbd> open file</span>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);
    panelEl = backdrop;
    inputEl = backdrop.querySelector('#csearch-query');
    resultsEl = backdrop.querySelector('#csearch-results');
    statusEl = backdrop.querySelector('#csearch-status');

    // Wire events
    const closeBtn = backdrop.querySelector('.csearch__close');
    const searchBtn = backdrop.querySelector('#csearch-btn');

    closeBtn.addEventListener('click', close);
    searchBtn.addEventListener('click', executeSearch);

    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            executeSearch();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
        }
    });

    backdrop.addEventListener('mousedown', (e) => {
        if (e.target === backdrop) close();
    });

    backdrop.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
        }
    });

    // Pre-fill and focus
    if (initialQuery) {
        inputEl.value = initialQuery;
    }
    requestAnimationFrame(() => {
        inputEl.focus();
        if (initialQuery) inputEl.select();
    });
}

/**
 * Close the content search panel
 */
export function close() {
    if (!isOpen) return;
    isOpen = false;

    // Abort any in-flight search
    if (abortController) {
        abortController.abort();
        abortController = null;
    }

    if (panelEl) {
        panelEl.remove();
        panelEl = null;
    }

    inputEl = null;
    resultsEl = null;
    statusEl = null;
    lastResults = null;
}

/**
 * Check if content search is open
 */
export function isContentSearchOpen() {
    return isOpen;
}

// ── Private ──

/**
 * Execute the search
 */
async function executeSearch() {
    const query = inputEl?.value?.trim();
    if (!query) {
        inputEl?.focus();
        return;
    }

    const useRegex = panelEl.querySelector('#csearch-regex')?.checked || false;
    const caseSensitive = panelEl.querySelector('#csearch-case')?.checked || false;
    const extensions = panelEl.querySelector('#csearch-ext')?.value?.trim() || '';
    const currentPath = getCurrentPath ? getCurrentPath() : '';

    // Abort previous search
    if (abortController) {
        abortController.abort();
    }
    abortController = new AbortController();

    // Show loading state
    const searchBtn = panelEl.querySelector('#csearch-btn');
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';

    showStatus(`<span class="csearch__spinner"></span> Searching for "${escapeHtml(query)}"...`);
    resultsEl.innerHTML = '';

    try {
        const data = await searchFiles(query, {
            path: currentPath,
            regex: useRegex,
            caseSensitive,
            extensions,
            maxResults: 200,
            signal: abortController.signal,
        });

        lastResults = data;
        renderResults(data, query, caseSensitive, useRegex);
    } catch (error) {
        if (error.name === 'AbortError') return;

        resultsEl.innerHTML = `
            <div class="csearch__empty">
                <div class="csearch__empty-icon">⚠️</div>
                <div>${escapeHtml(error.message || 'Search failed')}</div>
            </div>
        `;
        hideStatus();
    } finally {
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.textContent = 'Search';
        }
    }
}

/**
 * Render search results
 */
function renderResults(data, query, caseSensitive, useRegex) {
    if (!data.results || data.results.length === 0) {
        resultsEl.innerHTML = `
            <div class="csearch__empty">
                <div class="csearch__empty-icon">📭</div>
                <div>No matches found</div>
                <div style="margin-top:4px;font-size:0.75rem;opacity:0.7;">
                    Searched ${data.filesSearched} file(s)
                </div>
            </div>
        `;
        showStatus(`No matches in ${data.filesSearched} files`);
        return;
    }

    // Status
    let statusText = `${data.totalMatches} match${data.totalMatches !== 1 ? 'es' : ''} in ${data.filesMatched} file${data.filesMatched !== 1 ? 's' : ''} (${data.filesSearched} searched)`;
    let statusExtra = '';
    if (data.truncated) {
        statusExtra = `<span class="csearch__status-badge csearch__status-badge--warning">Truncated</span>`;
    }
    showStatus(`<span class="csearch__status-text">${statusText}</span>${statusExtra}`);

    // Build results HTML
    const fragment = document.createDocumentFragment();

    for (const fileResult of data.results) {
        const group = document.createElement('div');
        group.className = 'csearch__file-group';

        // File header
        const header = document.createElement('div');
        header.className = 'csearch__file-header';
        header.innerHTML = `
            <svg class="csearch__file-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
            </svg>
            <span class="csearch__file-name">${escapeHtml(fileResult.name)}</span>
            <span class="csearch__file-path">${escapeHtml(getParentPath(fileResult.path))}</span>
            <span class="csearch__file-count">${fileResult.matchCount}</span>
        `;

        header.addEventListener('click', () => {
            group.classList.toggle('collapsed');
        });

        group.appendChild(header);

        // Match lines
        const matchesDiv = document.createElement('div');
        matchesDiv.className = 'csearch__matches';

        for (const match of fileResult.matches) {
            // Context before
            if (match.contextBefore) {
                for (const ctx of match.contextBefore) {
                    const ctxEl = document.createElement('div');
                    ctxEl.className = 'csearch__context-line';
                    ctxEl.innerHTML = `
                        <span class="csearch__context-num">${ctx.line}</span>
                        <span class="csearch__context-text">${escapeHtml(ctx.text)}</span>
                    `;
                    matchesDiv.appendChild(ctxEl);
                }
            }

            // Match line
            const lineEl = document.createElement('div');
            lineEl.className = 'csearch__match-line';
            lineEl.title = `Open ${fileResult.name} at line ${match.line}`;
            lineEl.innerHTML = `
                <span class="csearch__line-num">${match.line}</span>
                <span class="csearch__line-text">${highlightMatch(match.text, query, caseSensitive, useRegex)}</span>
            `;

            lineEl.addEventListener('click', () => {
                handleOpenFile(fileResult.path, fileResult.name, match.line);
            });

            matchesDiv.appendChild(lineEl);

            // Context after
            if (match.contextAfter) {
                for (const ctx of match.contextAfter) {
                    const ctxEl = document.createElement('div');
                    ctxEl.className = 'csearch__context-line';
                    ctxEl.innerHTML = `
                        <span class="csearch__context-num">${ctx.line}</span>
                        <span class="csearch__context-text">${escapeHtml(ctx.text)}</span>
                    `;
                    matchesDiv.appendChild(ctxEl);
                }
            }
        }

        group.appendChild(matchesDiv);
        fragment.appendChild(group);
    }

    resultsEl.innerHTML = '';
    resultsEl.appendChild(fragment);
}

/**
 * Highlight matched text in a line
 */
function highlightMatch(text, query, caseSensitive, useRegex) {
    const escaped = escapeHtml(text);

    try {
        let pattern;
        if (useRegex) {
            // For regex mode, we need to escape HTML first then apply regex on the escaped text
            // This is tricky — instead, highlight on raw text positions
            const flags = caseSensitive ? 'g' : 'gi';
            const regex = new RegExp(query, flags);
            // Apply on raw text, then escape each segment
            const parts = [];
            let lastIndex = 0;
            let m;

            // Reset regex
            regex.lastIndex = 0;
            while ((m = regex.exec(text)) !== null) {
                if (m.index > lastIndex) {
                    parts.push(escapeHtml(text.slice(lastIndex, m.index)));
                }
                parts.push(`<mark>${escapeHtml(m[0])}</mark>`);
                lastIndex = m.index + m[0].length;
                if (m[0].length === 0) {
                    lastIndex++; // Prevent infinite loop on zero-length match
                    if (lastIndex > text.length) break;
                }
            }
            if (lastIndex < text.length) {
                parts.push(escapeHtml(text.slice(lastIndex)));
            }
            return parts.join('');
        } else {
            // Plain text: escape query for regex, then highlight
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const flags = caseSensitive ? 'g' : 'gi';
            const regex = new RegExp(escapedQuery, flags);

            const parts = [];
            let lastIndex = 0;
            let m;

            while ((m = regex.exec(text)) !== null) {
                if (m.index > lastIndex) {
                    parts.push(escapeHtml(text.slice(lastIndex, m.index)));
                }
                parts.push(`<mark>${escapeHtml(m[0])}</mark>`);
                lastIndex = m.index + m[0].length;
                if (m[0].length === 0) break;
            }
            if (lastIndex < text.length) {
                parts.push(escapeHtml(text.slice(lastIndex)));
            }
            return parts.join('');
        }
    } catch {
        return escaped;
    }
}

/**
 * Handle opening a file from search results
 */
function handleOpenFile(filePath, fileName, lineNumber) {
    if (onOpenFile && typeof onOpenFile === 'function') {
        onOpenFile(filePath, fileName, lineNumber);
    }
    // Don't close — user may want to check multiple results
}

/**
 * Get parent path from a full path
 */
function getParentPath(path) {
    const parts = path.split('/');
    parts.pop();
    return parts.length > 0 ? parts.join('/') + '/' : '';
}

/**
 * Show status bar
 */
function showStatus(html) {
    if (!statusEl) return;
    statusEl.style.display = 'flex';
    statusEl.innerHTML = html;
}

/**
 * Hide status bar
 */
function hideStatus() {
    if (!statusEl) return;
    statusEl.style.display = 'none';
}

/**
 * Escape HTML entities
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
