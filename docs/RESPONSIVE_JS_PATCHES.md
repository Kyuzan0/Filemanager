# Apply-ready JS patches (virtualScroll + uiRenderer)

Below are precise SEARCH/REPLACE blocks you can apply manually or with a patch tool. Each block includes an exact SEARCH section (matching current file content) and a REPLACE section containing the new code. File references are provided as clickable links to the exact files/line ranges.

IMPORTANT: These are *patch suggestions only*. I will not apply them automatically. Verify the SEARCH blocks match your current files before applying. If your files differ slightly (whitespace/line numbers), adjust the SEARCH content to match exactly or ask me to produce a revised patch.

Files:
- [`assets/js/modules/virtualScroll.js`](assets/js/modules/virtualScroll.js:92)
- [`assets/js/modules/virtualScroll.js`](assets/js/modules/virtualScroll.js:14)
- [`assets/js/modules/virtualScroll.js`](assets/js/modules/virtualScroll.js:286)
- [`assets/js/modules/uiRenderer.js`](assets/js/modules/uiRenderer.js:151)
- [`assets/js/modules/uiRenderer.js`](assets/js/modules/uiRenderer.js:168)

--------------------------------------------------------------------------------
Patch 1 — VirtualScroll: add visualViewport listener to constructor initialization
Target: [`assets/js/modules/virtualScroll.js`](assets/js/modules/virtualScroll.js:14)

<<<<<<< SEARCH
:start_line:14
-------
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
=======
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
        
        // visualViewport resize listener reference (for mobile address-bar changes)
        this._visualViewportListener = null;
        
        // Initialize if container is provided
        if (this.container) {
            this.init();
        }
    }
>>>>>>> REPLACE

--------------------------------------------------------------------------------
Patch 2 — VirtualScroll: extend setupResizeObserver to also listen to visualViewport
Target: [`assets/js/modules/virtualScroll.js`](assets/js/modules/virtualScroll.js:92)

<<<<<<< SEARCH
:start_line:92
-------
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
=======
    setupResizeObserver() {
        if (typeof ResizeObserver === 'undefined') {
            // Fallback for browsers without ResizeObserver
            window.addEventListener('resize', () => {
                this.updateViewportHeight();
                this.handleScroll();
            }, { passive: true });
            // Also listen to visualViewport where available (mobile address bar)
            if (window.visualViewport) {
                this._visualViewportListener = () => {
                    this.updateViewportHeight();
                    this.handleScroll();
                };
                window.visualViewport.addEventListener('resize', this._visualViewportListener, { passive: true });
            }
            return;
        }
        
        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                this.updateViewportHeight();
                this.handleScroll();
            }
        });
        
        this.resizeObserver.observe(this.container);

        // Also add visualViewport listener for mobile address-bar changes to ensure correct viewportHeight
        if (window.visualViewport) {
            this._visualViewportListener = () => {
                this.updateViewportHeight();
                this.handleScroll();
            };
            window.visualViewport.addEventListener('resize', this._visualViewportListener, { passive: true });
        }
    }
>>>>>>> REPLACE

--------------------------------------------------------------------------------
Patch 3 — VirtualScroll: cleanup visualViewport listener in destroy()
Target: [`assets/js/modules/virtualScroll.js`](assets/js/modules/virtualScroll.js:286)

<<<<<<< SEARCH
:start_line:286
-------
    destroy() {
        if (this.scrollListener && this.container) {
            this.container.removeEventListener('scroll', this.scrollListener);
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        console.log('[VirtualScroll] Destroyed');
    }
=======
    destroy() {
        if (this.scrollListener && this.container) {
            this.container.removeEventListener('scroll', this.scrollListener);
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        // Remove visualViewport listener if we registered one
        try {
            if (this._visualViewportListener && window.visualViewport) {
                window.visualViewport.removeEventListener('resize', this._visualViewportListener);
                this._visualViewportListener = null;
            }
        } catch (e) {
            // Ignore failures during cleanup
        }
        
        console.log('[VirtualScroll] Destroyed');
    }
>>>>>>> REPLACE

--------------------------------------------------------------------------------
Patch 4 — UI Renderer: add explicit ARIA roles to rows and cells (improves screen-reader when header is hidden)
Target: [`assets/js/modules/uiRenderer.js`](assets/js/modules/uiRenderer.js:151)

Note: This patch sets role="row" on each created row to make the semantics explicit in screen readers especially when the header is visually hidden on small screens. It is safe with existing table markup.

<<<<<<< SEARCH
:start_line:151
-------
    const key = item.path;
    const previouslySeen = state.knownItems.has(key);
    const row = document.createElement('tr');
    row.dataset.itemPath = key;
    row.dataset.itemType = item.type;
    row.tabIndex = 0;
    const extension = item.type === 'file' ? getFileExtension(item.name) : '';
    const isPreviewable = item.type === 'file' && previewableExtensions.has(extension);
    const isMediaPreviewable = item.type === 'file' && mediaPreviewableExtensions.has(extension);
    
    if (isPreviewable || isMediaPreviewable) {
        row.dataset.previewable = 'true';
    }
=======
    const key = item.path;
    const previouslySeen = state.knownItems.has(key);
    const row = document.createElement('tr');
    row.dataset.itemPath = key;
    row.dataset.itemType = item.type;
    row.tabIndex = 0;
    // Explicit role for assistive tech when headers are visually hidden on mobile
    row.setAttribute('role', 'row');
    const extension = item.type === 'file' ? getFileExtension(item.name) : '';
    const isPreviewable = item.type === 'file' && previewableExtensions.has(extension);
    const isMediaPreviewable = item.type === 'file' && mediaPreviewableExtensions.has(extension);
    
    if (isPreviewable || isMediaPreviewable) {
        row.dataset.previewable = 'true';
    }
>>>>>>> REPLACE

--------------------------------------------------------------------------------
Patch 5 — UI Renderer: set role on cell elements
Target: [`assets/js/modules/uiRenderer.js`](assets/js/modules/uiRenderer.js:168)

<<<<<<< SEARCH
:start_line:168
-------
    // Selection cell
    const selectionCell = document.createElement('td');
    selectionCell.className = 'selection-cell';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item-select';
    checkbox.dataset.path = key;
    checkbox.checked = state.selected.has(key);
    checkbox.setAttribute('aria-label', `Pilih ${item.name}`);
    checkbox.addEventListener('click', (event) => event.stopPropagation());
    checkbox.addEventListener('keydown', (event) => event.stopPropagation());
    checkbox.addEventListener('change', (event) => toggleSelection(key, event.target.checked));
    selectionCell.appendChild(checkbox);
    row.appendChild(selectionCell);
=======
    // Selection cell
    const selectionCell = document.createElement('td');
    selectionCell.className = 'selection-cell';
    selectionCell.setAttribute('role', 'gridcell');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item-select';
    checkbox.dataset.path = key;
    checkbox.checked = state.selected.has(key);
    checkbox.setAttribute('aria-label', `Pilih ${item.name}`);
    checkbox.addEventListener('click', (event) => event.stopPropagation());
    checkbox.addEventListener('keydown', (event) => event.stopPropagation());
    checkbox.addEventListener('change', (event) => toggleSelection(key, event.target.checked));
    selectionCell.appendChild(checkbox);
    row.appendChild(selectionCell);
>>>>>>> REPLACE

--------------------------------------------------------------------------------
How to apply
- Manual: open each file, find the SEARCH block text and replace it with the corresponding REPLACE block.
- Automated: you can convert each SEARCH/REPLACE block into an apply_diff call (I can provide apply_diff blocks if you want me to run them, but note that code edits must be performed in the proper mode).

Verification
- After applying patches:
  - VirtualScroll should recalculate viewportHeight and re-render when the mobile address bar appears/disappears (visualViewport resize).
  - No memory leaks: destroy() removes visualViewport listener.
  - UI rows will include explicit ARIA roles for improved screen-reader behavior when the header is visually hidden by CSS.

If you want, I can now:
- produce apply_diff blocks to run the edits automatically (requires switching to a mode that can edit JS files), or
- generate a git patch file with the same replacements, or
- create smaller or additional changes (e.g., adjust itemHeight on mobile by reading CSS var).

Next step — tell me which you prefer.