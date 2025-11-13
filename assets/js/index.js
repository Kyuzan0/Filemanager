const state = {
            currentPath: '',
            parentPath: null,
            knownItems: new Map(),
            lastUpdated: null,
            polling: null,
            items: [],
            filter: '',
            isLoading: false,
            isDeleting: false,
            sortKey: 'name',
            sortDirection: 'asc',
            selected: new Set(),
            visibleItems: [],
            itemMap: new Map(),
            preview: {
                isOpen: false,
                lastFocusedElement: null,
                path: null,
                originalContent: '',
                dirty: false,
                isSaving: false,
            },
            confirm: {
                isOpen: false,
                paths: [],
            },
            create: {
                isOpen: false,
                kind: 'file',
            },
            rename: {
                isOpen: false,
                targetItem: null,
                originalName: '',
            },
            unsaved: {
                isOpen: false,
                callback: null,
            },
            contextMenu: {
                isOpen: false,
                targetItem: null,
            },
            drag: {
                isDragging: false,
                draggedItem: null,
                dropTarget: null,
            },
            move: {
                isOpen: false,
                sources: [],
                browserPath: '',
                selectedTarget: null,
                isLoading: false,
                isMoving: false,
                search: '',
                currentFolders: [],
                lastData: null,
                recents: [],
            },
            logs: {
                isOpen: false,
                isLoading: false,
                currentPage: 1,
                totalPages: 1,
                filter: '',
                data: [],
                isCleaningUp: false,
            },
        };

        const tableBody = document.getElementById('file-table');
        const emptyState = document.getElementById('empty-state');
        const breadcrumbsEl = document.getElementById('breadcrumbs');
        const statusInfo = document.getElementById('status-info');
        const statusTime = document.getElementById('status-time');
        const statusSort = document.getElementById('status-sort');
        const statusFilter = document.getElementById('status-filter');
        const btnUp = document.getElementById('btn-up');
        const btnRefresh = document.getElementById('btn-refresh');
        const splitAction = document.querySelector('.split-action');
        const splitToggle = document.querySelector('.split-toggle');
        const splitMenu = document.querySelector('.split-menu');
        const splitOptions = document.querySelectorAll('.split-menu-option');
        const splitMain = document.querySelector('.split-main');
    const btnUpload = document.getElementById('btn-upload');
        const uploadInput = document.getElementById('upload-input');
    const btnDeleteSelected = document.getElementById('btn-delete-selected');
        const filterInput = document.getElementById('filter-input');
        const clearSearch = document.getElementById('clear-search');
        const loaderOverlay = document.getElementById('loader-overlay');
        const errorBanner = document.getElementById('error-banner');
        const sortHeaders = document.querySelectorAll('th[data-sort-key]');
    const selectAllCheckbox = document.getElementById('select-all');
        const previewOverlay = document.getElementById('preview-overlay');
        const previewTitle = document.getElementById('preview-title');
        const previewMeta = document.getElementById('preview-meta');
        const previewEditor = document.getElementById('preview-editor');
    const previewLineNumbers = document.getElementById('preview-line-numbers');
    const previewLineNumbersInner = document.getElementById('preview-line-numbers-inner');
        const previewStatus = document.getElementById('preview-status');
        const previewLoader = document.getElementById('preview-loader');
        const previewClose = document.getElementById('preview-close');
        const previewSave = document.getElementById('preview-save');
        const previewCopy = document.getElementById('preview-copy');
        const previewOpenRaw = document.getElementById('preview-open-raw');
        const previewableExtensions = new Set([
            'txt',
            'md',
            'markdown',
            'yml',
            'yaml',
            'json',
            'xml',
            'html',
            'htm',
            'css',
            'scss',
            'less',
            'js',
            'jsx',
            'ts',
            'tsx',
            'ini',
            'conf',
            'cfg',
            'env',
            'log',
            'php',
            'phtml',
            'sql',
            'csv',
        ]);

        // Media previewable extensions (displayed via modal viewer, no download)
        const mediaPreviewableExtensions = new Set([
            'png','jpg','jpeg','gif','webp','svg','bmp','ico','tiff','tif','avif','pdf',
        ]);

        // References used to toggle between text vs media preview
        const previewEditorWrapper = document.querySelector('.preview-editor-wrapper');
        const previewBody = document.querySelector('.preview-body');

        const confirmOverlay = document.getElementById('confirm-overlay');
        const confirmMessage = document.getElementById('confirm-message');
        const confirmDescription = document.getElementById('confirm-description');
        const confirmList = document.getElementById('confirm-list');
        const confirmCancel = document.getElementById('confirm-cancel');
        const confirmConfirm = document.getElementById('confirm-confirm');
        const createOverlay = document.getElementById('create-overlay');
        const createForm = document.getElementById('create-form');
        const createTitle = document.getElementById('create-title');
        const createSubtitle = document.getElementById('create-subtitle');
        const createLabel = document.getElementById('create-label');
        const createName = document.getElementById('create-name');
        const createHint = document.getElementById('create-hint');
        const createCancel = document.getElementById('create-cancel');
        const createSubmit = document.getElementById('create-submit');
        const renameOverlay = document.getElementById('rename-overlay');
        const renameForm = document.getElementById('rename-form');
        const renameTitle = document.getElementById('rename-title');
        const renameSubtitle = document.getElementById('rename-subtitle');
        const renameLabel = document.getElementById('rename-label');
        const renameName = document.getElementById('rename-name');
        const renameHint = document.getElementById('rename-hint');
        const renameCancel = document.getElementById('rename-cancel');
        const renameSubmit = document.getElementById('rename-submit');
        const unsavedOverlay = document.getElementById('unsaved-overlay');
        const unsavedTitle = document.getElementById('unsaved-title');
        const unsavedMessage = document.getElementById('unsaved-message');
        const unsavedSave = document.getElementById('unsaved-save');
        const unsavedDiscard = document.getElementById('unsaved-discard');
        const unsavedCancel = document.getElementById('unsaved-cancel');
        const contextMenu = document.getElementById('context-menu');
        const contextMenuItems = document.querySelectorAll('.context-menu-item');

        // Move overlay elements
        const moveOverlay = document.getElementById('move-overlay');
        const moveBreadcrumbs = document.getElementById('move-breadcrumbs');
        const moveList = document.getElementById('move-list');
        const moveError = document.getElementById('move-error');
        const moveSelectHere = document.getElementById('move-select-here');
        const moveCancel = document.getElementById('move-cancel');
        const moveConfirm = document.getElementById('move-confirm');
        const btnMoveSelected = document.getElementById('btn-move-selected');
        const moveRootShortcut = document.getElementById('move-root-shortcut');
        const moveCurrentShortcut = document.getElementById('move-current-shortcut');
        const moveSearchInput = document.getElementById('move-search');
        const moveRecents = document.getElementById('move-recents');
        
        // Log modal elements
        const btnLogs = document.getElementById('btn-logs');
        const logOverlay = document.getElementById('log-overlay');
        const logTitle = document.getElementById('log-title');
        const logSubtitle = document.getElementById('log-subtitle');
        const logFilter = document.getElementById('log-filter');
        const logPrev = document.getElementById('log-prev');
        const logNext = document.getElementById('log-next');
        const logPageInfo = document.getElementById('log-page-info');
        const logTableBody = document.getElementById('log-table-body');
        const logError = document.getElementById('log-error');
        const logRefresh = document.getElementById('log-refresh');
        const logClose = document.getElementById('log-close');
        const logCleanup = document.getElementById('log-cleanup');
        const logCleanupDays = document.getElementById('log-cleanup-days');
        
        // Debug logging for context menu elements
        console.log('[DEBUG] Context menu element:', contextMenu);
        console.log('[DEBUG] Context menu items:', contextMenuItems.length);

        const actionIcons = {
            open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 4h4l2 2h5v2H3V6h5zm-5 4h18v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zm10 2v8h2v-8z"/></svg>',
            preview: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2 2l9.92-9.92 1.75 1.75L6.75 19.25H5v-1.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L15 4.25l3.75 3.75 1.96-1.96z"/></svg>',
            view: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"/><path fill="currentColor" d="M5 5v14h14v-7h2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7v2H5z"/></svg>',
            copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 14H8V7h11v12z"/></svg>',
            delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 7h12v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3 2v9h2V9H9zm4 0v9h2V9h-2z"/><path fill="currentColor" d="M15.5 4l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
        };

        let statusFlashTimer = null;
        let lastStatusSnapshot = null;

        function flashStatus(message) {
            if (!statusInfo) {
                return;
            }

            statusInfo.textContent = message;

            if (statusFlashTimer) {
                clearTimeout(statusFlashTimer);
            }

            statusFlashTimer = setTimeout(() => {
                statusFlashTimer = null;
                if (!lastStatusSnapshot) {
                    return;
                }
                updateStatus(
                    lastStatusSnapshot.totalCount,
                    lastStatusSnapshot.filteredCount,
                    lastStatusSnapshot.generatedAt,
                    lastStatusSnapshot.meta,
                );
            }, 2000);
        }

        function openCreateDialog(kind) {
            openCreateOverlay(kind);
        }

        function copyPathToClipboard(value) {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                return navigator.clipboard.writeText(value);
            }

            return new Promise((resolve, reject) => {
                try {
                    const textarea = document.createElement('textarea');
                    textarea.value = value;
                    textarea.setAttribute('readonly', '');
                    textarea.style.position = 'absolute';
                    textarea.style.left = '-9999px';
                    document.body.appendChild(textarea);
                    textarea.select();
                    const succeeded = document.execCommand('copy');
                    document.body.removeChild(textarea);
                    if (succeeded) {
                        resolve();
                    } else {
                        reject(new Error('Copy command failed'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }

        function syncRowSelection() {
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

        function createRowActionButton(icon, label, handler, variant = '') {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `row-action ${variant}`.trim();
            btn.innerHTML = icon;
            btn.title = label;
            btn.setAttribute('aria-label', label);
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                handler(event);
            });
            return btn;
        }

        // Ensure media viewer wrapper exists in the preview modal
        function ensurePreviewViewer() {
            let wrapper = document.getElementById('preview-viewer-wrapper');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.id = 'preview-viewer-wrapper';
                wrapper.className = 'preview-viewer-wrapper';
                const viewer = document.createElement('div');
                viewer.id = 'preview-viewer';
                viewer.className = 'preview-viewer';
                wrapper.appendChild(viewer);
                if (previewBody) {
                    previewBody.appendChild(wrapper);
                }
            }
            return wrapper;
        }

        // Switch modal between text editor and media preview modes
        function setPreviewMode(mode) {
            state.preview.mode = mode === 'media' ? 'media' : 'text';
            if (previewEditorWrapper) {
                // Show the text editor when in text mode, hide otherwise
                previewEditorWrapper.style.display = state.preview.mode === 'text' ? '' : 'none';
            }
            const wrapper = document.getElementById('preview-viewer-wrapper');
            if (wrapper) {
                // Default CSS sets .preview-viewer-wrapper { display: none }
                // Use explicit 'block' to make it visible in media mode.
                wrapper.style.display = state.preview.mode === 'media' ? 'block' : 'none';
            }
        }

        // Open media preview (images, pdf) inside modal without download
        async function openMediaPreview(item) {
            if (hasUnsavedChanges()) {
                const confirmed = confirmDiscardChanges('Perubahan belum disimpan. Buka file lain tanpa menyimpan?')
                    .then((confirmed) => {
                        if (!confirmed) {
                            return;
                        }
                        openMediaPreview(item);
                    });
                return;
            }

            // Prepare overlay
            previewTitle.textContent = item.name;
            const sizeInfo = typeof item.size === 'number' ? formatBytes(item.size) : '-';
            const modifiedInfo = item.modified ? formatDate(item.modified) : '-';
            previewMeta.textContent = `${item.path} \u2022 ${sizeInfo} \u2022 ${modifiedInfo}`;
            previewOpenRaw.href = buildFileUrl(item.path);

            state.preview.path = item.path;
            state.preview.originalContent = '';
            state.preview.dirty = false;
            state.preview.isSaving = false;

            // Disable text-only actions for media
            previewSave.disabled = true;
            previewCopy.disabled = true;

            setPreviewLoading(false);
            openPreviewOverlay();
            const wrapper = ensurePreviewViewer();
            setPreviewMode('media');
            
            const viewer = document.getElementById('preview-viewer');
            if (viewer) {
                const extension = getFileExtension(item.name);
                const url = buildFileUrl(item.path);
                viewer.innerHTML = '';

                // Decide element based on type
                let el;
                if (extension === 'pdf') {
                    el = document.createElement('iframe');
                    el.src = url;
                    el.title = item.name;
                    el.setAttribute('aria-label', `Pratinjau PDF ${item.name}`);
                } else {
                    el = document.createElement('img');
                    el.src = url;
                    el.alt = item.name;
                }

                // Basic sizing (CSS can refine later)
                el.style.maxWidth = '100%';
                el.style.maxHeight = '70vh';
                el.style.border = '1px solid var(--border)';
                el.style.borderRadius = '12px';
                el.style.background = 'var(--surface)';
                el.style.display = 'block';
                el.style.margin = '0 auto';

                viewer.appendChild(el);
            }

            updatePreviewStatus('Mode pratinjau media');
        }

        function encodePathSegments(path) {
            if (!path) {
                return '';
            }
            return path
                .split('/')
                .map((segment) => encodeURIComponent(segment))
                .join('/');
        }

        function hasUnsavedChanges() {
            return state.preview.isOpen && state.preview.dirty && !state.preview.isSaving;
        }

        function closeConfirmOverlay() {
            if (!state.confirm.isOpen) {
                return;
            }
            state.confirm.isOpen = false;
            state.confirm.paths = [];
            confirmOverlay.classList.remove('visible');
            confirmOverlay.setAttribute('aria-hidden', 'true');
            if (!state.preview.isOpen) {
                document.body.classList.remove('modal-open');
            }
            setTimeout(() => {
                if (!state.confirm.isOpen) {
                    confirmOverlay.hidden = true;
                }
            }, 200);
        }

        function openConfirmOverlay({
            message,
            description,
            paths,
            showList,
            confirmLabel = 'Hapus',
        }) {
            if (!paths || paths.length === 0) {
                return;
            }

            state.confirm.isOpen = true;
            state.confirm.paths = paths;

            confirmMessage.textContent = message;
            confirmDescription.textContent = description || '';
            confirmList.innerHTML = '';
            confirmList.hidden = !showList;

            if (showList) {
                paths.slice(0, 5).forEach((path) => {
                    const item = state.itemMap.get(path);
                    const label = item ? item.name : path;
                    const li = document.createElement('li');
                    li.textContent = label;
                    confirmList.appendChild(li);
                });
                if (paths.length > 5) {
                    const li = document.createElement('li');
                    li.textContent = `dan ${paths.length - 5} item lainnya...`;
                    confirmList.appendChild(li);
                }
            }

            confirmConfirm.textContent = confirmLabel;

            confirmOverlay.hidden = false;
            requestAnimationFrame(() => {
                confirmOverlay.classList.add('visible');
            });
            confirmOverlay.setAttribute('aria-hidden', 'false');
            if (!state.preview.isOpen) {
                document.body.classList.add('modal-open');
            }
            confirmConfirm.focus();
        }

        function confirmDiscardChanges(message = 'Perubahan belum disimpan. Lanjutkan tanpa menyimpan?') {
            return new Promise((resolve) => {
                openUnsavedOverlay({
                    message: message,
                    onSave: async () => {
                        console.log('[DEBUG] onSave callback called, attempting to save');
                        try {
                            await savePreviewContent();
                            console.log('[DEBUG] Save completed successfully');
                            closeUnsavedOverlay();
                            resolve(true);
                        } catch (error) {
                            console.log('[DEBUG] Save failed:', error);
                            resolve(false);
                        }
                    },
                    onDiscard: () => {
                        closeUnsavedOverlay();
                        // Also close the preview overlay and discard changes
                        doClosePreviewOverlay();
                        resolve(false);
                    },
                    onCancel: () => {
                        closeUnsavedOverlay();
                        resolve(null);
                    }
                });
            });
        }

        function openUnsavedOverlay({ message, onSave, onDiscard, onCancel }) {
            console.log('[DEBUG] openUnsavedOverlay called with:', {
                hasOnSave: typeof onSave === 'function',
                hasOnDiscard: typeof onDiscard === 'function',
                hasOnCancel: typeof onCancel === 'function'
            });
            
            state.unsaved.isOpen = true;
            state.unsaved.callback = { onSave, onDiscard, onCancel };

            unsavedMessage.textContent = message || 'Anda memiliki perubahan yang belum disimpan. Apa yang ingin Anda lakukan?';

            unsavedOverlay.hidden = false;
            requestAnimationFrame(() => {
                unsavedOverlay.classList.add('visible');
                // Focus after the modal is visible to avoid aria-hidden warning
                unsavedCancel.focus();
            });
            unsavedOverlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
        }

        function closeUnsavedOverlay() {
            if (!state.unsaved.isOpen) {
                return;
            }
            state.unsaved.isOpen = false;
            state.unsaved.callback = null;
            unsavedOverlay.classList.remove('visible');
            unsavedOverlay.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            setTimeout(() => {
                if (!state.unsaved.isOpen) {
                    unsavedOverlay.hidden = true;
                }
            }, 200);
        }

        function closeContextMenu() {
            console.log('[DEBUG] Closing context menu');
            if (!state.contextMenu.isOpen) {
                return;
            }
            state.contextMenu.isOpen = false;
            state.contextMenu.targetItem = null;
            if (contextMenu) {
                contextMenu.classList.add('hidden');
                contextMenu.setAttribute('aria-hidden', 'true');
            }
        }

        function openContextMenu(x, y, item) {
            console.log('[DEBUG] Opening context menu at', x, y, 'for item:', item);
            console.log('[DEBUG] Context menu element exists:', !!contextMenu);
            
            if (!contextMenu) {
                console.error('[DEBUG] Context menu element not found!');
                return;
            }
            
            if (state.contextMenu.isOpen) {
                closeContextMenu();
            }
            
            state.contextMenu.isOpen = true;
            state.contextMenu.targetItem = item;
            
            // Position the menu
            const menuWidth = 180; // Approximate width of the menu
            const menuHeight = 200; // Approximate height of the menu
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            let posX = x;
            let posY = y;
            
            // Adjust position if menu would go off screen
            if (x + menuWidth > windowWidth) {
                posX = windowWidth - menuWidth - 10;
            }
            
            if (y + menuHeight > windowHeight) {
                posY = windowHeight - menuHeight - 10;
            }
            
            contextMenu.style.left = `${posX}px`;
            contextMenu.style.top = `${posY}px`;
            contextMenu.style.display = 'block';
            contextMenu.classList.remove('hidden');
            contextMenu.setAttribute('aria-hidden', 'false');
            
            console.log('[DEBUG] Context menu positioned at', posX, posY);
            console.log('[DEBUG] Context menu classes:', contextMenu.className);
            console.log('[DEBUG] Context menu aria-hidden:', contextMenu.getAttribute('aria-hidden'));
            
            // Focus the first menu item
            requestAnimationFrame(() => {
                if (contextMenuItems.length > 0) {
                    contextMenuItems[0].focus();
                }
            });
        }

        function handleContextMenuAction(action) {
            if (!state.contextMenu.targetItem) {
                return;
            }
            
            const item = state.contextMenu.targetItem;
            closeContextMenu();
            
            switch (action) {
                case 'open':
                    if (item.type === 'folder') {
                        navigateTo(item.path);
                    } else {
                        const extension = getFileExtension(item.name);
                        const isTextPreviewable = previewableExtensions.has(extension);
                        const isMediaPreviewable = mediaPreviewableExtensions.has(extension);
                        if (isTextPreviewable) {
                            openTextPreview(item);
                        } else if (isMediaPreviewable) {
                            openMediaPreview(item);
                        } else if (isWordDocument(extension)) {
                            openInWord(item);
                        } else {
                            const url = buildFileUrl(item.path);
                            const newWindow = window.open(url, '_blank');
                            if (newWindow) {
                                newWindow.opener = null;
                            }
                        }
                    }
                    break;
                case 'download':
                    if (item.type === 'file') {
                        triggerFileDownload(item);
                    } else {
                        setError('Download hanya tersedia untuk file.');
                    }
                    break;
                case 'rename':
                    openRenameOverlay(item);
                    break;
                case 'move':
                    openMoveOverlay([item.path]);
                    break;
                case 'delete':
                    console.log('[DEBUG] Delete action triggered for item:', item);
                    openConfirmOverlay({
                        message: `Hapus "${item.name}"?`,
                        description: 'Item yang dihapus tidak dapat dikembalikan.',
                        paths: [item.path],
                        showList: false,
                        confirmLabel: 'Hapus',
                    });
                    break;
            }
        }

        function formatBytes(bytes) {
            if (bytes === null || typeof bytes === 'undefined') {
                return '-';
            }
            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            let size = bytes;
            let unit = 0;
            while (size >= 1024 && unit < units.length - 1) {
                size /= 1024;
                unit++;
            }
            return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
        }

        function formatDate(timestamp) {
            if (!timestamp) {
                return '-';
            }
            const date = new Date(timestamp * 1000);
            return date.toLocaleString('id-ID');
        }

        function buildFileUrl(path) {
            if (!path) {
                return '#';
            }
            return 'file/' + path.split('/').map(encodeURIComponent).join('/');
        }

        // Build absolute URL for a file resource from its relative path
        function buildAbsoluteFileUrl(path) {
            const rel = buildFileUrl(path);
            try {
                return new URL(rel, window.location.href).href;
            } catch (_) {
                const a = document.createElement('a');
                a.href = rel;
                return a.href;
            }
        }

        // Build UNC file URL (file scheme) for network share access, e.g. file://///d.local/public/www/file/dir/name.docx
        function buildUncFileUrl(path) {
            const host = window.location.hostname || 'localhost';
            const encodedSegments = (path || '')
                .split('/')
                .map((segment) => encodeURIComponent(segment))
                .join('/');
            return `file://///${host}/public/www/file/${encodedSegments}`;
        }

        // Build plain UNC share path for user copying, e.g. \\d.local\public\www\file\dir\name.docx
        function buildUncSharePath(path) {
            const host = window.location.hostname || 'localhost';
            const cleaned = (path || '').split('/').join('\\');
            return `\\\\${host}\\public\\www\\file\\${cleaned}`;
        }

        // Detect Microsoft Word document extensions
        function isWordDocument(nameOrExt) {
            const ext = typeof nameOrExt === 'string'
                ? (nameOrExt.includes('.') ? getFileExtension(nameOrExt) : nameOrExt.toLowerCase())
                : '';
            return ext === 'doc' || ext === 'docx';
        }

        // Suggest opening a document in Microsoft Word via ms-word protocol with multi-path attempts and graceful fallback
        function openInWord(item) {
            if (!item || item.type !== 'file') {
                return;
            }

            const httpAbsUrl = buildAbsoluteFileUrl(item.path);
            const uncSharePath = buildUncSharePath(item.path);

            const proceed = window.confirm(
                'Buka dokumen ini di Microsoft Word?\n' +
                'Jika muncul prompt keamanan, pilih "Yes".\n' +
                'Jika gagal via UNC, sistem akan mencoba alamat web.'
            );
            if (!proceed) {
                // Fallback: buka di tab baru (web)
                const url = buildFileUrl(item.path);
                const win = window.open(url, '_blank');
                if (win) {
                    win.opener = null;
                }
                return;
            }

            // Final fallback setelah semua percobaan: buka tab web dan tampilkan overlay bantuan
            const finalFallback = () => {
                flashStatus(`Word tidak dapat membuka langsung. File dibuka di tab baru. Jika masih gagal, lihat bantuan konfigurasi untuk membuka di Word.`);
                const url = buildFileUrl(item.path);
                const win = window.open(url, '_blank');
                if (win) {
                    win.opener = null;
                }

                try {
                    const host = window.location.hostname || 'localhost';
                    const uncPath = uncSharePath;
                    const httpUrl = httpAbsUrl;

                    let ov = document.getElementById('word-help-overlay');
                    if (!ov) {
                        ov = document.createElement('div');
                        ov.id = 'word-help-overlay';
                        ov.setAttribute('role', 'dialog');
                        ov.setAttribute('aria-modal', 'true');
                        ov.style.position = 'fixed';
                        ov.style.inset = '0';
                        ov.style.background = 'rgba(0,0,0,0.45)';
                        ov.style.zIndex = '9999';

                        const panel = document.createElement('div');
                        panel.style.maxWidth = '640px';
                        panel.style.margin = '10vh auto';
                        panel.style.background = '#fff';
                        panel.style.borderRadius = '12px';
                        panel.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
                        panel.style.padding = '20px 24px';
                        panel.style.fontFamily = 'system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif';
                        panel.setAttribute('aria-labelledby', 'word-help-title');

                        const h = document.createElement('h2');
                        h.id = 'word-help-title';
                        h.textContent = 'Buka di Microsoft Word diblokir';
                        h.style.margin = '0 0 8px';

                        const p = document.createElement('p');
                        p.textContent = 'Office memblokir karena sumber berada di Restricted Sites. Ikuti langkah berikut agar klik .docx membuka Word:';
                        p.style.margin = '0 0 12px';

                        const steps = document.createElement('ol');
                        steps.style.margin = '0 0 12px 20px';
                        steps.style.padding = '0';
                        steps.innerHTML = `
<li>Tambahkan host ke Trusted Sites atau Local Intranet:
   buka Internet Options → Security → Trusted sites → Sites, lalu tambahkan:
   <code>http://${host}</code>. Untuk UNC, tambahkan juga <code>file:///${host}</code>.</li>
<li>Di Microsoft Word: File → Options → Trust Center → Trust Center Settings → Protected View.
   Nonaktifkan opsi untuk "files from the Internet" atau "Restricted Sites" sesuai kebijakan (hubungi admin bila perlu).</li>
<li>Alternatif: buka via File Explorer menggunakan jalur UNC di bawah.</li>
`;

                        const label = document.createElement('label');
                        label.textContent = 'UNC path:';
                        label.style.fontWeight = '600';
                        label.style.display = 'block';
                        label.style.margin = '8px 0 4px';

                        const input = document.createElement('input');
                        input.type = 'text';
                        input.value = uncPath;
                        input.readOnly = true;
                        input.style.width = '100%';
                        input.style.padding = '8px';
                        input.style.border = '1px solid #ddd';
                        input.style.borderRadius = '8px';

                        const buttons = document.createElement('div');
                        buttons.style.display = 'flex';
                        buttons.style.gap = '8px';
                        buttons.style.margin = '12px 0 0';

                        const copyBtn = document.createElement('button');
                        copyBtn.type = 'button';
                        copyBtn.textContent = 'Salin UNC';
                        copyBtn.style.padding = '8px 12px';

                        const tryHttpBtn = document.createElement('button');
                        tryHttpBtn.type = 'button';
                        tryHttpBtn.textContent = 'Coba via HTTP';
                        tryHttpBtn.style.padding = '8px 12px';

                        const closeBtn = document.createElement('button');
                        closeBtn.type = 'button';
                        closeBtn.textContent = 'Tutup';
                        closeBtn.style.padding = '8px 12px';

                        buttons.append(copyBtn, tryHttpBtn, closeBtn);

                        panel.append(h, p, steps, label, input, buttons);
                        ov.appendChild(panel);
                        document.body.appendChild(ov);
                        document.body.classList.add('modal-open');

                        copyBtn.addEventListener('click', () => {
                            copyPathToClipboard(uncPath)
                                .then(() => flashStatus('UNC tersalin ke clipboard'))
                                .catch(() => setError('Gagal menyalin UNC'));
                        });
                        tryHttpBtn.addEventListener('click', () => {
                            try {
                                const msWordHttp = 'ms-word:ofe|u|' + encodeURI(httpUrl);
                                window.location.href = msWordHttp;
                            } catch (_) {
                                // ignore
                            }
                        });
                        closeBtn.addEventListener('click', () => {
                            ov.remove();
                            document.body.classList.remove('modal-open');
                        });
                    }
                } catch (_) {
                    // ignore overlay errors
                }
            };

            // Percobaan 1: gunakan UNC path langsung (JANGAN di-encode)
            try {
                const msWordUnc = 'ms-word:ofe|u|' + uncSharePath; // e.g. \\d.local\public\www\file\tugas metopen.docx
                window.location.href = msWordUnc;
            } catch (_) {
                // lanjut ke percobaan HTTP
            }

            // Percobaan 2: gunakan URL HTTP/HTTPS absolut via ms-word setelah jeda singkat
            const httpTryTimer = setTimeout(() => {
                try {
                    const msWordHttp = 'ms-word:ofe|u|' + encodeURI(httpAbsUrl);
                    window.location.href = msWordHttp;
                } catch (_) {
                    // abaikan, lanjut ke fallback terakhir
                }
            }, 1500);

            // Fallback terakhir: buka di browser tab jika percobaan protokol tidak berhasil
            const fallbackTimer = setTimeout(() => {
                clearTimeout(httpTryTimer);
                finalFallback();
            }, 7000);

            // Safety cleanup untuk memastikan tidak ada timer menggantung
            setTimeout(() => {
                clearTimeout(fallbackTimer);
            }, 12000);
        }

        // Trigger browser download for a file item
        function triggerFileDownload(item) {
            if (!item || item.type !== 'file') {
                setError('Download hanya tersedia untuk file.');
                return;
            }
            const url = buildFileUrl(item.path);
            const a = document.createElement('a');
            a.href = url;
            a.download = item.name || '';
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            flashStatus(`Mengunduh "${item.name}"...`);
        }

        function getFileExtension(name) {
            const index = name.lastIndexOf('.');
            return index === -1 ? '' : name.slice(index + 1).toLowerCase();
        }

        function synchronizeSelection(items) {
            const validPaths = new Set(items.map((item) => item.path));
            const nextSelected = new Set();
            state.selected.forEach((path) => {
                if (validPaths.has(path)) {
                    nextSelected.add(path);
                }
            });
            state.selected = nextSelected;
        }

        function updateSelectionUI() {
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

        function toggleSelection(path, shouldSelect) {
            if (!path) {
                return;
            }

            const next = new Set(state.selected);
            if (shouldSelect) {
                next.add(path);
            } else {
                next.delete(path);
            }

            state.selected = next;
            updateSelectionUI();
        }

        function setSelectionForVisible(shouldSelect) {
            const next = new Set(state.selected);

            state.visibleItems.forEach((item) => {
                if (shouldSelect) {
                    next.add(item.path);
                } else {
                    next.delete(item.path);
                }
            });

            state.selected = next;

            tableBody.querySelectorAll('input.item-select').forEach((input) => {
                input.checked = state.selected.has(input.dataset.path);
            });

            updateSelectionUI();
        }

        function openPreviewOverlay() {
            if (state.preview.isOpen) {
                return;
            }

            state.preview.isOpen = true;
            state.preview.lastFocusedElement = document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;

            previewOverlay.hidden = false;
            requestAnimationFrame(() => {
                previewOverlay.classList.add('visible');
            });
            previewOverlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
            previewClose.focus();
        }

        function closePreviewOverlay(force = false) {
            if (!state.preview.isOpen) {
                return Promise.resolve(true);
            }

            if (!force && hasUnsavedChanges()) {
                return confirmDiscardChanges('Perubahan belum disimpan. Tutup tanpa menyimpan?')
                    .then((confirmed) => {
                        if (confirmed === null || confirmed === false) {
                            return false;
                        }
                        return doClosePreviewOverlay();
                    });
            }

            return doClosePreviewOverlay();
        }

        function doClosePreviewOverlay() {
            state.preview.isOpen = false;
            previewOverlay.classList.remove('visible');
            previewOverlay.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            previewOpenRaw.href = '#';
            previewEditor.value = '';
            updateLineNumbers();
            previewEditor.classList.remove('is-loading');
            previewMeta.textContent = '';
            previewStatus.textContent = '';
            previewLoader.hidden = true;
            state.preview.path = null;
            state.preview.originalContent = '';
            state.preview.dirty = false;
            state.preview.isSaving = false;
            previewSave.disabled = true;
            previewEditor.readOnly = true;

            // Cleanup media viewer (if present) and reset mode
            const pvWrapper = document.getElementById('preview-viewer-wrapper');
            if (pvWrapper) {
                pvWrapper.style.display = 'none';
                const pv = document.getElementById('preview-viewer');
                if (pv) {
                    pv.innerHTML = '';
                }
            }
            state.preview.mode = 'text';
            previewCopy.disabled = false;

            setTimeout(() => {
                if (!state.preview.isOpen) {
                    previewOverlay.hidden = true;
                }
            }, 200);

            const { lastFocusedElement } = state.preview;
            if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
                lastFocusedElement.focus();
            }

            return true;
        }

        function setPreviewLoading(isLoading) {
            previewLoader.hidden = !isLoading;
            previewEditor.classList.toggle('is-loading', isLoading);
            previewEditor.readOnly = isLoading || state.preview.isSaving;
            if (isLoading) {
                previewEditor.value = '';
                previewSave.disabled = true;
                updateLineNumbers();
            }
        }

        function updatePreviewStatus(detail = null) {
            const length = previewEditor.value.length;
            const base = `Karakter: ${length.toLocaleString('id-ID')}`;
            let suffix = '';

            if (state.preview.isSaving) {
                suffix = 'Menyimpan...';
            } else if (typeof detail === 'string' && detail !== '') {
                suffix = detail;
            } else if (state.preview.dirty) {
                suffix = 'Perubahan belum disimpan';
            }

            previewStatus.textContent = suffix ? `${base} \u2022 ${suffix}` : base;
        }

        function updateLineNumbers() {
            if (!previewLineNumbersInner) {
                return;
            }

            const value = previewEditor.value;
            const sanitized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            let totalLines = sanitized.length === 0 ? 1 : sanitized.split('\n').length;

            // Fix for files ending with </html> without newline
            if (value.length > 0 && !sanitized.endsWith('\n')) {
                // Add an extra line for files that don't end with newline
                // This ensures the last line number is visible when scrolling to the bottom
                totalLines += 1;
                console.log('[DEBUG] Added extra line for file without newline ending');
            }

            if (totalLines > 10000) {
                previewLineNumbersInner.innerHTML = '<span>1</span>';
                return;
            }

            let html = '';
            for (let i = 1; i <= totalLines; i += 1) {
                html += `<span>${i}</span>`;
            }

            previewLineNumbersInner.innerHTML = html || '<span>1</span>';
            
            // Debug logging
            console.log('[DEBUG] updateLineNumbers:', {
                totalLines,
                editorScrollTop: previewEditor.scrollTop,
                editorScrollHeight: previewEditor.scrollHeight,
                editorClientHeight: previewEditor.clientHeight,
                endsWithNewline: sanitized.endsWith('\n')
            });
            
            // Force a recalculation of styles to ensure alignment
            previewLineNumbersInner.style.transform = 'translateY(0px)';
            
            // Ensure consistent styling between line numbers and editor
            ensureConsistentStyling();
            
            syncLineNumbersScroll();
        }

        function syncLineNumbersScroll() {
            if (!previewLineNumbersInner) {
                return;
            }

            const scrollTop = previewEditor.scrollTop;
            const scrollHeight = previewEditor.scrollHeight;
            const clientHeight = previewEditor.clientHeight;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
            
            // Get the computed line height for more accurate alignment
            const editorStyle = window.getComputedStyle(previewEditor);
            const lineNumbersStyle = window.getComputedStyle(previewLineNumbersInner);
            
            // Calculate the exact line height
            const editorLineHeight = parseFloat(editorStyle.lineHeight);
            const editorFontSize = parseFloat(editorStyle.fontSize);
            const calculatedLineHeight = isNaN(editorLineHeight) ? editorFontSize * 1.6 : editorLineHeight;
            
            // Improved scroll synchronization for files ending with </html>
            let transformOffset = -scrollTop;
            
            // If at bottom and file doesn't end with newline, adjust offset
            if (isAtBottom && previewEditor.value && !previewEditor.value.endsWith('\n')) {
                // Add a small adjustment to ensure the last line number is visible
                // Use the calculated line height for more precise adjustment
                transformOffset -= calculatedLineHeight * 0.125; // 1/8 of line height adjustment
                console.log('[DEBUG] Applied bottom adjustment for file without newline:', calculatedLineHeight * 0.125);
            }
            
            // Debug logging
            console.log('[DEBUG] syncLineNumbersScroll:', {
                scrollTop,
                scrollHeight,
                clientHeight,
                isAtBottom,
                transformOffset,
                calculatedLineHeight,
                editorLineHeight,
                editorFontSize,
                endsWithNewline: previewEditor.value ? previewEditor.value.endsWith('\n') : 'empty'
            });
            
            previewLineNumbersInner.style.transform = `translateY(${transformOffset}px)`;
        }

        // Debug function to check computed styles
        function debugElementStyles() {
            if (!previewLineNumbersInner || !previewEditor) return;
            
            const lineNumbersStyle = window.getComputedStyle(previewLineNumbersInner);
            const editorStyle = window.getComputedStyle(previewEditor);
            
            console.log('[DEBUG] Element styles comparison:', {
                lineNumbers: {
                    fontSize: lineNumbersStyle.fontSize,
                    lineHeight: lineNumbersStyle.lineHeight,
                    fontFamily: lineNumbersStyle.fontFamily,
                    paddingTop: lineNumbersStyle.paddingTop,
                    paddingBottom: lineNumbersStyle.paddingBottom
                },
                editor: {
                    fontSize: editorStyle.fontSize,
                    lineHeight: editorStyle.lineHeight,
                    fontFamily: editorStyle.fontFamily,
                    paddingTop: editorStyle.paddingTop,
                    paddingBottom: editorStyle.paddingBottom
                }
            });
        }
        
        // Function to ensure consistent styling between line numbers and editor
        function ensureConsistentStyling() {
            if (!previewLineNumbersInner || !previewEditor) return;
            
            const editorStyle = window.getComputedStyle(previewEditor);
            const editorLineHeight = parseFloat(editorStyle.lineHeight);
            const editorFontSize = parseFloat(editorStyle.fontSize);
            const calculatedLineHeight = isNaN(editorLineHeight) ? editorFontSize * 1.6 : editorLineHeight;
            
            // Apply the same line height to the line numbers spans for consistency
            const lineSpans = previewLineNumbersInner.querySelectorAll('span');
            lineSpans.forEach(span => {
                span.style.height = `${calculatedLineHeight}px`;
                span.style.lineHeight = `${calculatedLineHeight}px`;
            });
            
            console.log('[DEBUG] Ensured consistent styling with line height:', calculatedLineHeight);
        }

        function preparePreview(item) {
            previewTitle.textContent = item.name;
            previewMeta.textContent = 'Memuat metadata...';
            previewStatus.textContent = '';
            previewOpenRaw.href = buildFileUrl(item.path);
            state.preview.path = item.path;
            state.preview.originalContent = '';
            state.preview.dirty = false;
            state.preview.isSaving = false;
            previewSave.disabled = true;
            previewEditor.readOnly = true;
            setPreviewLoading(true);
            openPreviewOverlay();

            // Force text-editor mode when opening a text file (in case we previously viewed media)
            setPreviewMode('text');
            const pvWrapper = document.getElementById('preview-viewer-wrapper');
            if (pvWrapper) {
                pvWrapper.style.display = 'none';
                const pv = document.getElementById('preview-viewer');
                if (pv) {
                    pv.innerHTML = '';
                }
            }
        }

        async function openTextPreview(item) {
            if (hasUnsavedChanges()) {
                const confirmed = confirmDiscardChanges('Perubahan belum disimpan. Buka file lain tanpa menyimpan?')
                    .then((confirmed) => {
                        if (!confirmed) {
                            return;
                        }
                        preparePreview(item);
                    });
                return;
            }

            preparePreview(item);

            try {
                const response = await fetch(`api.php?action=content&path=${encodePathSegments(item.path)}`);
                if (!response.ok) {
                    throw new Error('Gagal memuat file.');
                }

                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.error || 'Gagal memuat file.');
                }


                previewEditor.value = data.content;
                previewEditor.scrollTop = 0;
                updateLineNumbers();
                const sizeInfo = typeof data.size === 'number' ? formatBytes(data.size) : '-';
                const modifiedInfo = data.modified ? formatDate(data.modified) : '-';
                previewMeta.textContent = `${data.path} \u2022 ${sizeInfo} \u2022 ${modifiedInfo}`;
                state.preview.originalContent = data.content;
                state.preview.path = data.path;
                state.preview.dirty = false;
                previewSave.disabled = true;
                
                // Reset save button text and style
                previewSave.textContent = 'Simpan';
                previewSave.classList.remove('dirty');
                
                // Reset window title
                const originalTitle = document.title.replace(/^\* /, '');
                document.title = originalTitle;
                
                setPreviewLoading(false);
                updatePreviewStatus();
                
                // Debug element styles after loading
                setTimeout(() => {
                    debugElementStyles();
                    ensureConsistentStyling();
                }, 100);
                
                if (typeof previewEditor.focus === 'function') {
                    try {
                        previewEditor.focus({ preventScroll: true });
                    } catch (error) {
                        previewEditor.focus();
                    }
                }
            } catch (error) {
                setPreviewLoading(false);
                closePreviewOverlay(true);
                setError(error.message);
            }
        }

        async function savePreviewContent() {
            if (!state.preview.isOpen || !state.preview.path || !state.preview.dirty || state.preview.isSaving) {
                return;
            }

            state.preview.isSaving = true;
            previewEditor.readOnly = true;
            previewSave.disabled = true;
            updatePreviewStatus();

            const body = {
                content: previewEditor.value,
            };

            try {
                const response = await fetch(`api.php?action=save&path=${encodePathSegments(state.preview.path)}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });

                let data;
                try {
                    data = await response.json();
                } catch (parseError) {
                    data = null;
                }

                if (!response.ok) {
                    const errMessage = data && data.error
                        ? data.error
                        : `Gagal menyimpan perubahan (HTTP ${response.status}).`;
                    throw new Error(errMessage);
                }

                if (!data || !data.success) {
                    const errMessage = data && data.error
                        ? data.error
                        : 'Gagal menyimpan perubahan.';
                    throw new Error(errMessage);
                }

                state.preview.originalContent = body.content;
                state.preview.dirty = false;
                state.preview.path = data.path;

                const sizeInfo = typeof data.size === 'number' ? formatBytes(data.size) : '-';
                const modifiedInfo = data.modified ? formatDate(data.modified) : '-';
                previewMeta.textContent = `${data.path} \u2022 ${sizeInfo} \u2022 ${modifiedInfo}`;
                
                // Reset save button text and style
                previewSave.textContent = 'Simpan';
                previewSave.classList.remove('dirty');
                
                // Reset window title
                const originalTitle = document.title.replace(/^\* /, '');
                document.title = originalTitle;

                updatePreviewStatus('Perubahan tersimpan');
                setTimeout(() => {
                    if (state.preview.isOpen && !state.preview.dirty && !state.preview.isSaving) {
                        updatePreviewStatus();
                    }
                }, 2500);

                fetchDirectory(state.currentPath, { silent: true });
            } catch (error) {
                console.error(error);
                const message = error instanceof Error ? error.message : 'Terjadi kesalahan.';
                updatePreviewStatus(`Gagal menyimpan: ${message}`);
                setError(message);
                previewSave.disabled = false;
                setTimeout(() => {
                    if (state.preview.isOpen && state.preview.dirty && !state.preview.isSaving) {
                        updatePreviewStatus();
                    }
                    if (errorBanner.textContent === message) {
                        setError('');
                    }
                }, 4000);
            } finally {
                state.preview.isSaving = false;
                if (state.preview.isOpen) {
                    previewEditor.readOnly = false;
                }
                if (state.preview.dirty) {
                    previewSave.disabled = false;
                } else {
                    previewSave.disabled = true;
                }
            }
        }

        async function deleteItems(paths) {
            console.log('[DEBUG] deleteItems called with paths:', paths);
            
            if (!Array.isArray(paths) || paths.length === 0) {
                console.log('[DEBUG] No paths provided for deletion');
                return;
            }

            closeConfirmOverlay();
            state.isDeleting = true;
            setLoading(true);
            updateSelectionUI();

            try {
                console.log('[DEBUG] Sending delete request to API');
                const response = await fetch('api.php?action=delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ paths }),
                });

                let data = null;
                try {
                    data = await response.json();
                    console.log('[DEBUG] Delete response received:', data);
                } catch (parseError) {
                    console.log('[DEBUG] Failed to parse response as JSON');
                    data = null;
                }

                if (!response.ok) {
                    const errMessage = data && data.error
                        ? data.error
                        : `Gagal menghapus item (HTTP ${response.status}).`;
                    console.log('[DEBUG] Delete request failed with error:', errMessage);
                    throw new Error(errMessage);
                }

                if (!data || typeof data !== 'object') {
                    console.log('[DEBUG] Invalid response format');
                    throw new Error('Respons penghapusan tidak valid.');
                }

                const deletedList = Array.isArray(data.deleted) ? data.deleted : [];
                const failedList = Array.isArray(data.failed) ? data.failed : [];
                
                console.log('[DEBUG] Deleted items:', deletedList);
                console.log('[DEBUG] Failed items:', failedList);

                const deletedPaths = new Set(
                    deletedList
                        .map((entry) => {
                            if (typeof entry === 'string') {
                                return entry;
                            }
                            if (entry && typeof entry === 'object' && typeof entry.path === 'string') {
                                return entry.path;
                            }
                            return '';
                        })
                        .filter((value) => value !== ''),
                );

                if (state.preview.isOpen && state.preview.path && deletedPaths.has(state.preview.path)) {
                    closePreviewOverlay(true);
                }

                if (failedList.length > 0) {
                    const failedSet = new Set();
                    failedList.forEach((entry) => {
                        if (entry && typeof entry === 'object' && typeof entry.path === 'string' && entry.path !== '') {
                            failedSet.add(entry.path);
                        }
                    });
                    state.selected = failedSet;

                    const example = failedList[0] ?? null;
                    let detail = '';
                    if (example && typeof example === 'object' && 'path' in example) {
                        const examplePath = example.path;
                        const exampleError = example.error ?? 'Tidak diketahui';
                        detail = `${examplePath}: ${exampleError}`;
                    }
                    const message = failedList.length === 1
                        ? `Gagal menghapus ${detail || 'item.'}`
                        : `Gagal menghapus ${failedList.length.toLocaleString('id-ID')} item. ${detail ? `Contoh: ${detail}` : ''}`;
                    setError(message.trim());
                } else {
                    state.selected.clear();
                    setError('');
                }

                await fetchDirectory(state.currentPath, { silent: true });
            } catch (error) {
                console.log('[DEBUG] Delete operation error:', error);
                const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus item.';
                setError(message);
            } finally {
                state.isDeleting = false;
                if (btnDeleteSelected) {
                    btnDeleteSelected.textContent = state.selected.size > 0
                        ? `Hapus (${state.selected.size.toLocaleString('id-ID')})`
                        : 'Hapus Terpilih';
                }
                setLoading(false);
                updateSelectionUI();
            }
        }

        function compareItems(a, b) {
            const direction = state.sortDirection === 'asc' ? 1 : -1;
            const typeOrder = { folder: 0, file: 1 };
            const compareName = () => a.name.localeCompare(b.name, 'id', { sensitivity: 'base', numeric: true });

            switch (state.sortKey) {
                case 'type': {
                    const diff = typeOrder[a.type] - typeOrder[b.type];
                    if (diff !== 0) {
                        return diff * direction;
                    }
                    return compareName() * direction;
                }
                case 'size': {
                    const sizeA = a.type === 'folder' || a.size === null ? -1 : a.size;
                    const sizeB = b.type === 'folder' || b.size === null ? -1 : b.size;
                    if (sizeA !== sizeB) {
                        return sizeA < sizeB ? -direction : direction;
                    }
                    return compareName() * direction;
                }
                case 'modified': {
                    const modifiedA = a.modified ?? 0;
                    const modifiedB = b.modified ?? 0;
                    if (modifiedA !== modifiedB) {
                        return modifiedA < modifiedB ? -direction : direction;
                    }
                    return compareName() * direction;
                }
                case 'name':
                default: {
                    if (a.type !== b.type) {
                        return typeOrder[a.type] - typeOrder[b.type];
                    }
                    return compareName() * direction;
                }
            }
        }

        function getSortDescription(key, direction) {
            const order = direction === 'asc';
            switch (key) {
                case 'type':
                    return order ? 'Jenis (Folder \u2192 File)' : 'Jenis (File \u2192 Folder)';
                case 'size':
                    return order ? 'Ukuran (Kecil \u2192 Besar)' : 'Ukuran (Besar \u2192 Kecil)';
                case 'modified':
                    return order ? 'Terakhir diubah (Lama \u2192 Baru)' : 'Terakhir diubah (Baru \u2192 Lama)';
                case 'name':
                default:
                    return order ? 'Nama (A-Z)' : 'Nama (Z-A)';
            }
        }

        function updateSortUI() {
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

        function changeSort(nextKey) {
            if (!nextKey) {
                return;
            }

            if (state.sortKey === nextKey) {
                state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortKey = nextKey;
                state.sortDirection = (nextKey === 'modified' || nextKey === 'size') ? 'desc' : 'asc';
            }

            renderItems(state.items, state.lastUpdated, false);
        }

        function setLoading(isLoading) {
            state.isLoading = isLoading;
            loaderOverlay.classList.toggle('visible', isLoading);
            btnRefresh.disabled = isLoading;
            updateSelectionUI();
        }

        function setError(message) {
            if (message) {
                errorBanner.textContent = message;
                errorBanner.classList.add('visible', 'error');
            } else {
                errorBanner.textContent = '';
                errorBanner.classList.remove('visible', 'error');
            }
        }

        function updateStatus(totalCount, filteredCount, generatedAt, meta = {}) {
            const {
                totalFolders = 0,
                totalFiles = 0,
                filteredFolders = totalFolders,
                filteredFiles = totalFiles,
            } = meta;

            const displayCount = filteredCount ?? totalCount;
            const formattedDisplay = displayCount.toLocaleString('id-ID');
            const formattedTotal = totalCount.toLocaleString('id-ID');
            const folderDisplay = (state.filter && filteredCount !== totalCount) ? filteredFolders : totalFolders;
            const fileDisplay = (state.filter && filteredCount !== totalCount) ? filteredFiles : totalFiles;

            const infoPrefix = state.filter && filteredCount !== totalCount
                ? `${formattedDisplay} dari ${formattedTotal} item ditampilkan`
                : `${formattedDisplay} item ditampilkan`;

            lastStatusSnapshot = {
                totalCount,
                filteredCount,
                generatedAt,
                meta,
            };

            statusInfo.textContent = `${infoPrefix} • ${folderDisplay.toLocaleString('id-ID')} folder • ${fileDisplay.toLocaleString('id-ID')} file`;

            if (state.filter) {
                statusFilter.hidden = false;
                statusFilter.textContent = `Filter: "${state.filter}" (${filteredCount.toLocaleString('id-ID')} cocok)`;
            } else {
                statusFilter.hidden = true;
                statusFilter.textContent = '';
            }

            if (generatedAt) {
                statusTime.hidden = false;
                statusTime.textContent = `Diperbarui ${new Date(generatedAt * 1000).toLocaleTimeString('id-ID')}`;
            } else {
                statusTime.hidden = true;
                statusTime.textContent = '';
            }
        }

        function renderBreadcrumbs(breadcrumbs) {
            breadcrumbsEl.innerHTML = '';
            breadcrumbs.forEach((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                const element = document.createElement(isLast ? 'span' : 'a');
                element.textContent = crumb.label;

                if (!isLast) {
                    element.href = '#';
                    element.addEventListener('click', (event) => {
                        event.preventDefault();
                        navigateTo(crumb.path);
                    });
                }

                breadcrumbsEl.appendChild(element);

                if (!isLast) {
                    const separator = document.createElement('span');
                    separator.className = 'breadcrumb-separator';
                    separator.textContent = '\u203A';
                    separator.setAttribute('aria-hidden', 'true');
                    breadcrumbsEl.appendChild(separator);
                }
            });
        }

        function renderItems(items, generatedAt, highlightNew) {
            state.items = items;
            state.itemMap = new Map(items.map((item) => [item.path, item]));
            synchronizeSelection(items);
            const query = state.filter.toLowerCase();
            const sortedItems = [...items].sort(compareItems);
            const filtered = query
                ? sortedItems.filter((item) => item.name.toLowerCase().includes(query))
                : sortedItems;
            state.visibleItems = filtered;

            const totalFolders = items.filter((item) => item.type === 'folder').length;
            const filteredFolders = filtered.filter((item) => item.type === 'folder').length;
            const meta = {
                totalFolders,
                totalFiles: items.length - totalFolders,
                filteredFolders,
                filteredFiles: filtered.length - filteredFolders,
            };

            tableBody.innerHTML = '';

            // Insert "Up (..)" row at the top when not at root
            if (state.parentPath !== null) {
                const upRow = document.createElement('tr');
                upRow.className = 'up-row';
                upRow.tabIndex = 0;
    
                // Empty selection cell (no checkbox)
                const upSel = document.createElement('td');
                upSel.className = 'selection-cell';
                upRow.appendChild(upSel);
    
                // Name cell with "↑ .." label (no icon)
                const upName = document.createElement('td');
                upName.className = 'item-name';
                const upLink = document.createElement('a');
                upLink.className = 'item-link';
                upLink.href = '#';
                upLink.textContent = '↑ ..';
                upLink.addEventListener('click', (event) => {
                    event.preventDefault();
                    navigateTo(state.parentPath || '');
                });
                upName.appendChild(upLink);
                upRow.appendChild(upName);
    
                // Size and Modified columns show "-"
                const upSize = document.createElement('td');
                upSize.textContent = '-';
                upRow.appendChild(upSize);
    
                const upModified = document.createElement('td');
                upModified.textContent = '-';
                upRow.appendChild(upModified);
    
                // Empty actions cell (no actions)
                const upActions = document.createElement('td');
                upActions.className = 'actions-cell';
                upRow.appendChild(upActions);
    
                // Keyboard and mouse interactions
                upRow.addEventListener('dblclick', () => navigateTo(state.parentPath || ''));
                upRow.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigateTo(state.parentPath || '');
                    }
                });
    
                // Make the up-row a drop target to move item to parent directory
                upRow.addEventListener('dragover', (event) => {
                    if (!state.drag.isDragging) {
                        return;
                    }
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    // Visual highlight for drop target
                    upRow.classList.add('drop-target');
                });
    
                upRow.addEventListener('dragleave', (event) => {
                    // Only remove when actually leaving the row, not entering children
                    if (event.currentTarget === event.target) {
                        upRow.classList.remove('drop-target');
                    }
                });
    
                upRow.addEventListener('drop', (event) => {
                    if (!state.drag.isDragging || !state.drag.draggedItem) {
                        return;
                    }
                    event.preventDefault();
                    // Prevent bubbling to body to avoid duplicate move requests
                    event.stopPropagation();
                    if (typeof event.stopImmediatePropagation === 'function') {
                        event.stopImmediatePropagation();
                    }
    
                    // Remove global listeners to avoid body drop firing
                    document.body.removeEventListener('dragover', handleBodyDragOver);
                    document.body.removeEventListener('drop', handleBodyDrop);
    
                    const targetPath = state.parentPath || '';
                    console.log('[DEBUG] Dropping', state.drag.draggedItem.name, 'onto up-row to move into parent', targetPath);
    
                    // Perform the move operation to parent directory
                    moveItem(state.drag.draggedItem.path, targetPath);
    
                    // Clean up highlight/state
                    upRow.classList.remove('drop-target');
                    state.drag.dropTarget = null;
                });
    
                tableBody.appendChild(upRow);
            }

            if (filtered.length === 0) {
                emptyState.hidden = false;
                emptyState.textContent = items.length === 0
                    ? 'Direktori ini kosong.'
                    : `Tidak ada hasil untuk "${state.filter}".`;
            } else {
                emptyState.hidden = true;
            }

            filtered.forEach((item) => {
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

                if (!previouslySeen && highlightNew) {
                    row.classList.add('is-new');
                }

                const selectionCell = document.createElement('td');
                selectionCell.className = 'selection-cell';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'item-select';
                checkbox.dataset.path = key;
                checkbox.checked = state.selected.has(key);
                checkbox.setAttribute('aria-label', `Pilih ${item.name}`);
                checkbox.addEventListener('click', (event) => {
                    event.stopPropagation();
                });
                checkbox.addEventListener('keydown', (event) => {
                    event.stopPropagation();
                });
                checkbox.addEventListener('change', (event) => {
                    toggleSelection(key, event.target.checked);
                });
                selectionCell.appendChild(checkbox);
                row.appendChild(selectionCell);

                if (item.type === 'folder') {
                    row.addEventListener('dblclick', () => navigateTo(item.path));
                    row.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigateTo(item.path);
                        }
                    });
                } else if (isPreviewable || isMediaPreviewable) {
                    const openPreview = () => {
                        if (isPreviewable) {
                            openTextPreview(item);
                        } else {
                            openMediaPreview(item);
                        }
                    };
                    row.addEventListener('dblclick', openPreview);
                    row.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openPreview();
                        }
                    });
                } else {
                    const openFile = () => {
                        const ext = getFileExtension(item.name);
                        if (isWordDocument(ext)) {
                            openInWord(item);
                        } else {
                            const url = buildFileUrl(item.path);
                            const newWindow = window.open(url, '_blank');
                            if (newWindow) {
                                newWindow.opener = null;
                            }
                        }
                    };
                    row.addEventListener('dblclick', openFile);
                    row.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openFile();
                        }
                    });
                }

                // Add context menu event listener
                row.addEventListener('contextmenu', (event) => {
                    console.log('[DEBUG] Context menu event triggered for item:', item.name);
                    event.preventDefault();
                    openContextMenu(event.clientX, event.clientY, item);
                });

                // Add drag and drop event listeners
                row.draggable = true;
                row.addEventListener('dragstart', (event) => {
                    handleDragStart(event, item);
                });
                row.addEventListener('dragend', (event) => {
                    handleDragEnd(event);
                });
                
                // Only folders can be drop targets
                if (item.type === 'folder') {
                    row.addEventListener('dragover', (event) => {
                        handleDragOver(event, item);
                    });
                    row.addEventListener('drop', (event) => {
                        handleDrop(event, item);
                    });
                    row.addEventListener('dragleave', (event) => {
                        handleDragLeave(event);
                    });
                }

                const cellName = document.createElement('td');
                cellName.className = 'item-name';

                const iconInfo = getItemIcon(item);
const icon = document.createElement('span');
icon.className = `item-icon ${iconInfo.className}`;
icon.innerHTML = iconInfo.svg;
cellName.appendChild(icon);

                const link = document.createElement('a');
                link.className = 'item-link';
                link.textContent = item.name;

                if (item.type === 'folder') {
                    link.href = '#';
                    link.addEventListener('click', (event) => {
                        event.preventDefault();
                        navigateTo(item.path);
                    });
                } else if (isPreviewable || isMediaPreviewable) {
                    link.href = '#';
                    link.addEventListener('click', (event) => {
                        event.preventDefault();
                        if (isPreviewable) {
                            openTextPreview(item);
                        } else {
                            openMediaPreview(item);
                        }
                    });
                } else {
                    const extForLink = getFileExtension(item.name);
                    if (isWordDocument(extForLink)) {
                        link.href = '#';
                        link.addEventListener('click', (event) => {
                            event.preventDefault();
                            openInWord(item);
                        });
                    } else {
                        link.href = buildFileUrl(item.path);
                        link.target = '_blank';
                        link.rel = 'noopener';
                    }
                }

                cellName.appendChild(link);

                let badge = null;
                if (!previouslySeen && highlightNew) {
                    badge = document.createElement('span');
                    badge.className = 'badge badge-new';
                    badge.textContent = 'Baru';
                    cellName.appendChild(badge);
                }

                const cellSize = document.createElement('td');
                cellSize.textContent = item.type === 'folder' ? '-' : formatBytes(item.size);

                const cellModified = document.createElement('td');
                cellModified.textContent = formatDate(item.modified);

                const actionCell = document.createElement('td');
                actionCell.className = 'actions-cell';
                const actionGroup = document.createElement('div');
                actionGroup.className = 'row-actions';

                if (item.type === 'folder') {
                    actionGroup.appendChild(createRowActionButton(
                        actionIcons.open,
                        'Buka',
                        () => navigateTo(item.path),
                    ));
                } else if (isPreviewable || isMediaPreviewable) {
                    actionGroup.appendChild(createRowActionButton(
                        actionIcons.preview,
                        'Pratinjau',
                        () => {
                            if (isPreviewable) {
                                openTextPreview(item);
                            } else {
                                openMediaPreview(item);
                            }
                        },
                    ));
                } else {
                    const extForAction = getFileExtension(item.name);
                    if (isWordDocument(extForAction)) {
                        actionGroup.appendChild(createRowActionButton(
                            actionIcons.open,
                            'Buka di Word',
                            () => openInWord(item),
                        ));
                    } else {
                        actionGroup.appendChild(createRowActionButton(
                            actionIcons.view,
                            'Lihat File',
                            () => {
                                const url = buildFileUrl(item.path);
                                const newWindow = window.open(url, '_blank');
                                if (newWindow) {
                                    newWindow.opener = null;
                                }
                            },
                        ));
                    }
                }

                actionGroup.appendChild(createRowActionButton(
                    actionIcons.copy,
                    'Salin Path',
                    () => {
                        copyPathToClipboard(item.path)
                            .then(() => {
                                flashStatus(`Path "${item.name}" tersalin.`);
                            })
                            .catch(() => {
                                setError('Gagal menyalin path.');
                            });
                    },
                ));

                actionGroup.appendChild(createRowActionButton(
                    actionIcons.delete,
                    'Hapus Item',
                    () => {
                        if (hasUnsavedChanges()) {
                            const proceed = confirmDiscardChanges('Perubahan belum disimpan. Tetap hapus item terpilih?')
                                .then((proceed) => {
                                    if (!proceed) {
                                        return;
                                    }
                                    openConfirmOverlay({
                                        message: `Hapus "${item.name}"?`,
                                        description: 'Item yang dihapus tidak dapat dikembalikan.',
                                        paths: [item.path],
                                        showList: false,
                                        confirmLabel: 'Hapus',
                                    });
                                });
                            return;
                        }

                        openConfirmOverlay({
                            message: `Hapus "${item.name}"?`,
                            description: 'Item yang dihapus tidak dapat dikembalikan.',
                            paths: [item.path],
                            showList: false,
                            confirmLabel: 'Hapus',
                        });
                    },
                    'danger',
                ));

                actionCell.appendChild(actionGroup);

                row.appendChild(cellName);
                row.appendChild(cellSize);
                row.appendChild(cellModified);
                row.appendChild(actionCell);

                tableBody.appendChild(row);

                if (!previouslySeen && highlightNew) {
                    setTimeout(() => {
                        row.classList.remove('is-new');
                        if (badge) {
                            badge.remove();
                        }
                    }, 5000);
                }
            });

            const newMap = new Map();
            items.forEach((item) => {
                newMap.set(item.path, generatedAt);
            });
            state.knownItems = newMap;

            updateStatus(items.length, filtered.length, generatedAt, meta);
            updateSortUI();
            updateSelectionUI();
        }

        async function fetchDirectory(path = '', options = {}) {
            const { silent = false } = options;
            setError('');

            if (!silent) {
                setLoading(true);
                statusInfo.textContent = 'Memuat data...';
                statusTime.hidden = true;
                statusTime.textContent = '';
            }

            try {
                const encodedPath = encodePathSegments(path);
                const response = await fetch(`api.php?path=${encodedPath}`);
                if (!response.ok) {
                    throw new Error('Gagal mengambil data');
                }

                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.error || 'Gagal mengambil data');
                }

                const previousPath = state.currentPath;
                const previousUpdated = state.lastUpdated;
                const pathChanged = previousPath !== data.path;

                if (pathChanged) {
                    state.knownItems.clear();
                    state.selected.clear();
                }

                state.currentPath = data.path;
                state.lastUpdated = data.generated_at;
                state.parentPath = data.parent;

                renderBreadcrumbs(data.breadcrumbs);
                renderItems(data.items, data.generated_at, !pathChanged && previousUpdated !== null);

                btnUp.disabled = data.parent === null;
                btnUp.dataset.parentPath = data.parent || '';

            } catch (error) {
                console.error(error);
                setError(error.message);
                state.items = [];
                state.itemMap = new Map();
                state.visibleItems = [];
                state.selected.clear();
                tableBody.innerHTML = '';
                emptyState.hidden = false;
                emptyState.textContent = 'Tidak dapat memuat data.';
                statusFilter.hidden = true;
                statusFilter.textContent = '';
                updateStatus(0, 0, null);
                updateSelectionUI();
            } finally {
                if (!silent) {
                    setLoading(false);
                }
            }
        }

        function navigateTo(path) {
            if (hasUnsavedChanges()) {
                const confirmed = confirmDiscardChanges('Perubahan belum disimpan. Lanjutkan tanpa menyimpan?')
                    .then((confirmed) => {
                        if (!confirmed) {
                            return;
                        }
                        navigateTo(path);
                    });
                return;
            }

            fetchDirectory(path);
        }

        // Drag and drop functions
        function handleDragStart(event, item) {
            state.drag.isDragging = true;
            state.drag.draggedItem = item;
            
            // Set the drag effect
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', item.path);
            
            // Add visual feedback
            event.target.classList.add('dragging');
            
            // Show file-card drop zone cosmetic immediately
            if (fileCard) {
                console.log('[DEBUG] Drag started - adding .drag-over to file-card');
                fileCard.classList.add('drag-over');
            }
            
            // Make the entire document a drop zone for dropping in the current directory
            document.body.addEventListener('dragover', handleBodyDragOver);
            document.body.addEventListener('drop', handleBodyDrop);
        }

        function handleDragEnd(event) {
            state.drag.isDragging = false;
            state.drag.draggedItem = null;
            state.drag.dropTarget = null;
            
            // Remove visual feedback
            event.target.classList.remove('dragging');
            
            // Remove file-card drop zone cosmetic immediately
            if (fileCard) {
                console.log('[DEBUG] Drag ended - removing .drag-over from file-card');
                fileCard.classList.remove('drag-over');
            }
            
            // Remove all drop target highlights
            document.querySelectorAll('.drop-target').forEach(el => {
                el.classList.remove('drop-target');
            });
            
            // Remove body event listeners
            document.body.removeEventListener('dragover', handleBodyDragOver);
            document.body.removeEventListener('drop', handleBodyDrop);
        }

        function handleDragOver(event, item) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            
            // Don't allow dropping on itself
            if (state.drag.draggedItem && state.drag.draggedItem.path === item.path) {
                return;
            }
            
            // Don't allow dropping a folder into itself
            if (state.drag.draggedItem && state.drag.draggedItem.type === 'folder') {
                if (item.path.startsWith(state.drag.draggedItem.path + '/')) {
                    return;
                }
            }
            
            // Add visual feedback
            if (state.drag.dropTarget !== item.path) {
                // Remove previous highlight
                document.querySelectorAll('.drop-target').forEach(el => {
                    el.classList.remove('drop-target');
                });
                
                // Add new highlight
                event.currentTarget.classList.add('drop-target');
                state.drag.dropTarget = item.path;
            }
        }

        function handleDragLeave(event) {
            // Only remove highlight if leaving the actual element, not a child
            if (event.currentTarget === event.target) {
                event.currentTarget.classList.remove('drop-target');
                if (state.drag.dropTarget === event.currentTarget.dataset.itemPath) {
                    state.drag.dropTarget = null;
                }
            }
        }

        function handleDrop(event, targetItem) {
            event.preventDefault();
            // Prevent bubbling to body drop handler to avoid duplicate move requests
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
            
            if (!state.drag.draggedItem) {
                return;
            }
            
            // Don't allow dropping on itself
            if (state.drag.draggedItem.path === targetItem.path) {
                return;
            }
            
            // Don't allow dropping a folder into itself
            if (state.drag.draggedItem.type === 'folder') {
                if (targetItem.path.startsWith(state.drag.draggedItem.path + '/')) {
                    return;
                }
            }
            
            console.log('[DEBUG] Dropping', state.drag.draggedItem.name, 'into folder', targetItem.name, 'with path', targetItem.path);
            
            // Ensure targetPath is not empty
            const targetPath = targetItem.path || state.currentPath;
            console.log('[DEBUG] Final target path:', targetPath);
            
            // Remove body drag/drop listeners to avoid global drop firing
            document.body.removeEventListener('dragover', handleBodyDragOver);
            document.body.removeEventListener('drop', handleBodyDrop);
            
            // Perform the move operation
            moveItem(state.drag.draggedItem.path, targetPath);
            
            // Clean up
            event.currentTarget.classList.remove('drop-target');
            state.drag.dropTarget = null;
        }

        function handleBodyDragOver(event) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            
            // Remove all drop target highlights when over the body
            document.querySelectorAll('.drop-target').forEach(el => {
                el.classList.remove('drop-target');
            });
            state.drag.dropTarget = null;
        }

        function handleBodyDrop(event) {
            event.preventDefault();
            
            // Remove file-card drop zone cosmetic on body drop
            if (fileCard) {
                console.log('[DEBUG] Body drop - removing .drag-over from file-card');
                fileCard.classList.remove('drag-over');
            }
            
            if (!state.drag.draggedItem) {
                return;
            }
            
            console.log('[DEBUG] Dropping', state.drag.draggedItem.name, 'in current directory', state.currentPath);
            
            // Drop in the current directory
            moveItem(state.drag.draggedItem.path, state.currentPath);
        }

        async function moveItem(sourcePath, targetPath) {
            try {
                setLoading(true);
                
                console.log('[DEBUG] Moving item from', sourcePath, 'to', targetPath);
                
                const response = await fetch('api.php?action=move', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sourcePath: sourcePath,
                        targetPath: targetPath,
                    }),
                });
                
                const data = await response.json();
                console.log('[DEBUG] Move response:', data);
                
                if (!response.ok || !data.success) {
                    const errorMessage = data && data.error ? data.error : 'Gagal memindahkan item.';
                    throw new Error(errorMessage);
                }
                
                flashStatus(`"${data.item.name}" berhasil dipindahkan.`);
                
                // Refresh the directory
                await fetchDirectory(state.currentPath, { silent: true });
                
                // If the moved item is currently open in preview, update the preview
                if (state.preview.isOpen && state.preview.path === sourcePath) {
                    state.preview.path = data.item.path;
                    previewTitle.textContent = data.item.name;
                    previewMeta.textContent = previewMeta.textContent.replace(
                        state.currentPath === '' ? sourcePath : `${state.currentPath}/${sourcePath}`,
                        state.currentPath === '' ? data.item.path : `${state.currentPath}/${data.item.path}`
                    );
                    previewOpenRaw.href = buildFileUrl(data.item.path);
                }
                
            } catch (error) {
                console.error(error);
                const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat memindahkan item.';
                setError(message);
            } finally {
                setLoading(false);
            }
        }

        // ========== Move overlay implementation ==========
        // Helper utilities for Move overlay
        function setMoveLoading(isMoving) {
            state.move.isMoving = !!isMoving;
            if (moveConfirm) {
                moveConfirm.disabled = true;
                if (isMoving) {
                    moveConfirm.textContent = 'Memindahkan...';
                }
            }
            if (moveSelectHere) moveSelectHere.disabled = !!isMoving;
            if (moveList) {
                moveList.querySelectorAll('button').forEach((btn) => {
                    btn.disabled = !!isMoving;
                });
            }
            if (moveRootShortcut) moveRootShortcut.disabled = !!isMoving;
            if (moveCurrentShortcut) moveCurrentShortcut.disabled = !!isMoving;
            if (moveSearchInput) moveSearchInput.disabled = !!isMoving;
        }
        function loadMoveRecentsFromStorage() {
            try {
                const raw = localStorage.getItem('fm.moveRecents');
                const arr = raw ? JSON.parse(raw) : [];
                if (Array.isArray(arr)) {
                    // Ensure unique and valid strings
                    return Array.from(new Set(arr.filter((p) => typeof p === 'string')));
                }
                return [];
            } catch (_) {
                return [];
            }
        }
        function saveMoveRecentsToStorage(list) {
            try {
                const unique = Array.from(new Set((Array.isArray(list) ? list : []).filter((p) => typeof p === 'string')));
                localStorage.setItem('fm.moveRecents', JSON.stringify(unique.slice(0, 10)));
            } catch (_) {
                // ignore
            }
        }
        function addRecentDestination(path) {
            if (typeof path !== 'string') return;
            const list = Array.isArray(state.move.recents) ? state.move.recents.slice() : [];
            const idx = list.indexOf(path);
            if (idx !== -1) {
                list.splice(idx, 1);
            }
            list.unshift(path);
            state.move.recents = list.slice(0, 10);
            saveMoveRecentsToStorage(state.move.recents);
            updateMoveRecentsUI();
        }
        function updateMoveRecentsUI() {
            if (!moveRecents) return;
            moveRecents.innerHTML = '';
            const recents = Array.isArray(state.move.recents) ? state.move.recents : [];
            if (recents.length === 0) {
                moveRecents.style.display = 'none';
                return;
            }
            moveRecents.style.display = '';
            recents.forEach((p) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'move-chip';
                chip.textContent = p === '' ? 'Root' : (p.split('/').pop() || p);
                chip.title = p || 'Root';
                chip.addEventListener('click', () => {
                    if (state.move.isMoving) return;
                    state.move.browserPath = p || '';
                    fetchMoveDirectory(state.move.browserPath);
                });
                moveRecents.appendChild(chip);
            });
        }
        function openMoveOverlay(sources) {
            console.log('[DEBUG][MOVE] openMoveOverlay sources:', sources);
            closeContextMenu();
            state.move.isOpen = true;
            state.move.sources = Array.isArray(sources) ? sources.filter(Boolean) : [];
            state.move.browserPath = state.currentPath || '';
            state.move.selectedTarget = null;

            // Subtitle
            const names = state.move.sources.map(p => {
                const item = state.itemMap.get(p);
                return item ? item.name : (p.split('/').pop() || p);
            });
            const sub = state.move.sources.length === 1
                ? `Pilih folder tujuan untuk "${names[0]}".`
                : `Pilih folder tujuan untuk ${state.move.sources.length.toLocaleString('id-ID')} item.`;
            const moveSubtitle = document.getElementById('move-subtitle');
            if (moveSubtitle) moveSubtitle.textContent = sub;

            if (moveOverlay) {
                moveOverlay.hidden = false;
                requestAnimationFrame(() => moveOverlay.classList.add('visible'));
                moveOverlay.setAttribute('aria-hidden', 'false');
                document.body.classList.add('modal-open');
            }

            if (moveConfirm) moveConfirm.disabled = true;
            if (moveError) moveError.textContent = '';
            if (moveSearchInput) {
                moveSearchInput.value = '';
                state.move.search = '';
                moveSearchInput.disabled = false;
            }
            state.move.recents = loadMoveRecentsFromStorage();
            updateMoveRecentsUI();

            fetchMoveDirectory(state.move.browserPath);
        }

        function closeMoveOverlay() {
            if (!state.move.isOpen) return;
            state.move.isOpen = false;
            state.move.sources = [];
            state.move.browserPath = '';
            state.move.selectedTarget = null;
            if (moveOverlay) {
                moveOverlay.classList.remove('visible');
                moveOverlay.setAttribute('aria-hidden', 'true');
                if (!state.preview.isOpen && !state.confirm.isOpen && !state.create.isOpen && !state.rename.isOpen && !state.unsaved.isOpen) {
                    document.body.classList.remove('modal-open');
                }
                setTimeout(() => {
                    if (!state.move.isOpen) moveOverlay.hidden = true;
                }, 200);
            }
            if (moveList) moveList.innerHTML = '';
            if (moveBreadcrumbs) moveBreadcrumbs.innerHTML = '';
            if (moveError) moveError.textContent = '';
        }

        async function fetchMoveDirectory(path) {
            try {
                if (moveError) moveError.textContent = '';
                const encoded = encodePathSegments(path || '');
                console.log('[DEBUG][MOVE] fetchMoveDirectory path:', path, 'encoded:', encoded);
                const res = await fetch(`api.php?path=${encoded}`);
                if (!res.ok) throw new Error('Gagal memuat daftar folder.');
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Gagal memuat daftar folder.');
                state.move.lastData = data;
                state.move.currentFolders = Array.isArray(data.items) ? data.items.filter((it) => it.type === 'folder') : [];
                renderMoveUI(data);
            } catch (e) {
                console.error(e);
                if (moveError) moveError.textContent = e instanceof Error ? e.message : 'Terjadi kesalahan saat memuat daftar.';
            }
        }

        function renderMoveUI(data) {
            // breadcrumbs
            if (moveBreadcrumbs) {
                moveBreadcrumbs.innerHTML = '';
                const crumbs = Array.isArray(data.breadcrumbs) ? data.breadcrumbs : [];
                crumbs.forEach((c, idx) => {
                    const isLast = idx === crumbs.length - 1;
                    const el = document.createElement(isLast ? 'span' : 'a');
                    el.textContent = c.label;
                    if (!isLast) {
                        el.href = '#';
                        el.addEventListener('click', (ev) => {
                            ev.preventDefault();
                            state.move.browserPath = c.path || '';
                            fetchMoveDirectory(state.move.browserPath);
                        });
                    }
                    moveBreadcrumbs.appendChild(el);
                    if (!isLast) {
                        const sep = document.createElement('span');
                        sep.className = 'breadcrumb-separator';
                        sep.textContent = '\u203A';
                        sep.setAttribute('aria-hidden','true');
                        moveBreadcrumbs.appendChild(sep);
                    }
                });
            }

            // list folders with optional Up and search filtering
            if (moveList) {
                moveList.innerHTML = '';

                if (data.parent !== null) {
                    const up = document.createElement('li');
                    up.className = 'move-item up';
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'move-folder';
                    btn.textContent = '↑ ..';
                    btn.addEventListener('click', () => {
                        state.move.browserPath = data.parent || '';
                        fetchMoveDirectory(state.move.browserPath);
                    });
                    up.appendChild(btn);
                    moveList.appendChild(up);
                }

                const allFolders = (state.move.currentFolders && Array.isArray(state.move.currentFolders))
                    ? state.move.currentFolders
                    : (Array.isArray(data.items) ? data.items.filter((it) => it.type === 'folder') : []);
                const q = (state.move.search || '').toLowerCase();
                const folders = q ? allFolders.filter((f) => f.name.toLowerCase().includes(q)) : allFolders;

                folders.forEach((folder) => {
                    const li = document.createElement('li');
                    li.className = 'move-item';
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'move-folder';
                    btn.innerHTML = `<span class="item-icon folder">${String.fromCodePoint(0x1F4C1)}</span><span class="move-folder-name" title="${folder.path}">${folder.name}</span>`;
                    btn.addEventListener('click', () => {
                        state.move.browserPath = folder.path || '';
                        fetchMoveDirectory(state.move.browserPath);
                    });
                    li.appendChild(btn);
                    moveList.appendChild(li);
                });
            }

            // update confirm availability if a target selected
            state.move.selectedTarget = state.move.browserPath || '';
            updateMoveConfirmState();
        }

        function getParentPath(p) {
            if (!p) return '';
            const idx = p.lastIndexOf('/');
            return idx === -1 ? '' : p.substring(0, idx);
        }

        function isSubPath(parent, child) {
            if (!parent) return false;
            return child === parent || child.startsWith(parent + '/');
        }

        function validateMoveTarget(targetPath, sources) {
            if (typeof targetPath !== 'string') return { valid: false, message: 'Pilih folder tujuan.' };
            for (const sp of sources) {
                const item = state.itemMap.get(sp);
                const isDir = item ? item.type === 'folder' : false;
                // same folder for file
                if (!isDir && getParentPath(sp) === targetPath) {
                    return { valid: false, message: 'Item sudah berada di folder ini.' };
                }
                // folder into itself or its descendant
                if (isDir && isSubPath(sp, targetPath)) {
                    return { valid: false, message: 'Tidak dapat memindahkan folder ke dirinya sendiri atau subfoldernya.' };
                }
            }
            return { valid: true, message: '' };
        }

        function updateMoveConfirmState() {
            if (!moveConfirm || !moveError) return;
            const t = state.move.selectedTarget;
            const { valid, message } = validateMoveTarget(t ?? '', state.move.sources);
            moveConfirm.disabled = !valid || state.move.isMoving;
            moveError.textContent = valid ? '' : message;

            // Dynamic label
            let targetLabel = 'Root';
            if (t && t !== '') {
                const parts = t.split('/');
                targetLabel = parts[parts.length - 1] || t;
            }
            moveConfirm.textContent = valid ? `Pindahkan ke "${targetLabel}"` : 'Pindahkan';
        }

        async function performMove(sources, targetFolder) {
            if (!Array.isArray(sources) || sources.length === 0) return;
            const check = validateMoveTarget(targetFolder ?? '', sources);
            if (!check.valid) {
                if (moveError) moveError.textContent = check.message || 'Tujuan tidak valid.';
                return;
            }
            if (moveConfirm) moveConfirm.disabled = true;
            if (moveSelectHere) moveSelectHere.disabled = true;
            setMoveLoading(true);
            try {
                setLoading(true);
                const results = [];
                for (const sp of sources) {
                    try {
                        const resp = await fetch('api.php?action=move', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sourcePath: sp, targetPath: targetFolder ?? '' }),
                        });
                        const data = await resp.json().catch(() => null);
                        if (!resp.ok || !data || !data.success) {
                            const err = data && data.error ? data.error : 'Gagal memindahkan item.';
                            results.push({ path: sp, ok: false, error: err });
                        } else {
                            results.push({ path: sp, ok: true, item: data.item });
                        }
                    } catch (e) {
                        results.push({ path: sp, ok: false, error: e instanceof Error ? e.message : 'Gagal memindahkan.' });
                    }
                }

                const okCount = results.filter(r => r.ok).length;
                const failCount = results.length - okCount;

                if (okCount > 0) {
                    // Update recents with chosen destination
                    addRecentDestination(targetFolder ?? '');

                    if (sources.length === 1) {
                        const name = (state.itemMap.get(sources[0])?.name) || (sources[0].split('/').pop() || sources[0]);
                        flashStatus(`"${name}" berhasil dipindahkan.`);
                    } else {
                        flashStatus(`${okCount.toLocaleString('id-ID')} item berhasil dipindahkan${failCount ? `, ${failCount.toLocaleString('id-ID')} gagal` : ''}.`);
                    }
                }
                if (failCount > 0) {
                    const example = results.find(r => !r.ok);
                    const detail = example ? `${example.path}: ${example.error}` : '';
                    setError(`Sebagian item gagal dipindahkan. ${detail}`);
                } else {
                    setError('');
                }

                // Refresh once
                await fetchDirectory(state.currentPath, { silent: true });
                closeMoveOverlay();
            } finally {
                setLoading(false);
                setMoveLoading(false);
                if (moveSelectHere) moveSelectHere.disabled = false;
                updateMoveConfirmState();
            }
        }

        // Event bindings for move overlay
        if (moveSelectHere) {
            moveSelectHere.addEventListener('click', () => {
                state.move.selectedTarget = state.move.browserPath || '';
                console.log('[DEBUG][MOVE] Selected target:', state.move.selectedTarget);
                updateMoveConfirmState();
            });
        }
        if (moveCancel) {
            moveCancel.addEventListener('click', () => {
                if (!state.isLoading) closeMoveOverlay();
            });
        }
        if (moveConfirm) {
            moveConfirm.addEventListener('click', () => {
                if (state.isLoading) return;
                performMove(state.move.sources, state.move.selectedTarget ?? '');
            });
        }
        if (moveOverlay) {
            moveOverlay.addEventListener('click', (event) => {
                if (event.target === moveOverlay && !state.isLoading) {
                    closeMoveOverlay();
                }
            });
        }
        if (btnMoveSelected) {
            btnMoveSelected.addEventListener('click', () => {
                if (state.isLoading) return;
                const paths = Array.from(state.selected);
                if (paths.length === 0) return;
                openMoveOverlay(paths);
            });
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && state.move.isOpen && !state.isLoading) {
                event.preventDefault();
                closeMoveOverlay();
            }
        });

        // Move overlay extra bindings
        if (moveRootShortcut) {
            moveRootShortcut.addEventListener('click', () => {
                if (state.move.isMoving) return;
                state.move.browserPath = '';
                fetchMoveDirectory(state.move.browserPath);
            });
        }
        if (moveCurrentShortcut) {
            moveCurrentShortcut.addEventListener('click', () => {
                if (state.move.isMoving) return;
                state.move.browserPath = state.currentPath || '';
                fetchMoveDirectory(state.move.browserPath);
            });
        }
        if (moveSearchInput) {
            moveSearchInput.addEventListener('input', (e) => {
                state.move.search = (e.target.value || '').trim();
                if (state.move.lastData) {
                    renderMoveUI(state.move.lastData);
                }
            });
            moveSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && moveSearchInput.value !== '') {
                    e.preventDefault();
                    moveSearchInput.value = '';
                    state.move.search = '';
                    if (state.move.lastData) {
                        renderMoveUI(state.move.lastData);
                    }
                } else if (e.key === 'ArrowDown') {
                    const buttons = moveList ? moveList.querySelectorAll('button.move-folder') : [];
                    if (buttons.length > 0) {
                        e.preventDefault();
                        buttons[0].focus();
                    }
                }
            });
        }
        if (moveList) {
            moveList.addEventListener('keydown', (e) => {
                const buttons = moveList.querySelectorAll('button.move-folder');
                if (!buttons.length) return;
                const currentIndex = Array.from(buttons).indexOf(document.activeElement);
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const next = currentIndex >= 0 && currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
                    buttons[next].focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prev = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
                    buttons[prev].focus();
                } else if (e.key === 'Enter' && e.altKey) {
                    e.preventDefault();
                    state.move.selectedTarget = state.move.browserPath || '';
                    updateMoveConfirmState();
                }
            });
        }

        // Initialize recents from storage at load
        state.move.recents = loadMoveRecentsFromStorage();
        // ======== End Move overlay implementation ========

        // ========== Log modal implementation ==========
        function openLogModal() {
            console.log('[DEBUG] openLogModal called');
            if (state.logs.isOpen) {
                console.log('[DEBUG] Log modal already open, returning');
                return;
            }

            state.logs.isOpen = true;
            state.logs.currentPage = 1;
            state.logs.filter = '';
            state.logs.activeFilters = {};
            logFilter.value = '';
            
            // Initialize active filters display
            updateActiveFiltersDisplay({});
            
            logOverlay.hidden = false;
            requestAnimationFrame(() => {
                logOverlay.classList.add('visible');
            });
            logOverlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
            
            // Initialize log filter section functionality
            initializeLogFilterSection();
            
            // Initialize responsive enhancements
            enhanceLogFilterResponsiveness();
            
            console.log('[DEBUG] Loading initial log data');
            // Load initial log data
            fetchLogDataWithFilters({});
        }
        
        // Initialize log filter section functionality
        function initializeLogFilterSection() {
            const filterSection = document.getElementById('log-filter-section');
            const toggleButton = document.getElementById('toggle-filters'); // Correct ID to match HTML
            const clearButton = document.getElementById('reset-filters'); // Correct ID to match HTML
            const applyButton = document.getElementById('apply-filters'); // Correct ID to match HTML
            const filterContent = document.getElementById('filter-content'); // Correct ID to match HTML
            
            if (!filterSection || !toggleButton) return;
            
            // Check screen size and auto-collapse on small screens
            function checkScreenSize() {
                const isSmallScreen = window.innerWidth <= 768;
                const isExtraSmallScreen = window.innerWidth <= 480;
                const isCollapsed = filterSection.classList.contains('collapsed');
                
                // Auto-collapse on small screens if not already collapsed
                if (isSmallScreen && !isCollapsed) {
                    filterSection.classList.add('collapsed');
                    filterSection.classList.remove('expanded');
                    toggleButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 14l5-5 5 5z"/></svg>';
                    toggleButton.setAttribute('aria-label', 'Expand filter section');
                    
                    if (filterContent) {
                        filterContent.style.maxHeight = '0';
                    }
                }
                // Auto-expand on larger screens if not manually collapsed
                else if (!isSmallScreen && !localStorage.getItem('logFilterCollapsed')) {
                    filterSection.classList.remove('collapsed');
                    filterSection.classList.add('expanded');
                    toggleButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>';
                    toggleButton.setAttribute('aria-label', 'Collapse filter section');
                    
                    if (filterContent) {
                        filterContent.style.maxHeight = 'none';
                    }
                }
                
                // Adjust filter layout for extra small screens
                if (isExtraSmallScreen) {
                    filterSection.classList.add('extra-small');
                    // Reorganize filter rows for vertical layout
                    const filterRows = filterSection.querySelectorAll('.filter-row');
                    filterRows.forEach(row => {
                        row.classList.add('vertical');
                    });
                } else {
                    filterSection.classList.remove('extra-small');
                    const filterRows = filterSection.querySelectorAll('.filter-row');
                    filterRows.forEach(row => {
                        row.classList.remove('vertical');
                    });
                }
            }
            
            // Initial check
            checkScreenSize();
            
            // Listen for resize events with debouncing
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(checkScreenSize, 100);
            });
            
            // Handle orientation change for mobile devices
            window.addEventListener('orientationchange', () => {
                setTimeout(checkScreenSize, 200); // Delay to allow for orientation change completion
            });
            
            // Toggle filter section collapse/expand
            toggleButton.addEventListener('click', () => {
                const isCollapsed = filterSection.classList.contains('collapsed');
                
                if (isCollapsed) {
                    // Expand
                    filterSection.classList.remove('collapsed');
                    filterSection.classList.add('expanded');
                    toggleButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>';
                    toggleButton.setAttribute('aria-label', 'Collapse filter section');
                    
                    // Animate content appearance
                    if (filterContent) {
                        // First set the height to 0 to ensure proper animation
                        filterContent.style.maxHeight = '0';
                        filterContent.style.overflow = 'hidden';
                        
                        // Then trigger a reflow and set to the actual height
                        setTimeout(() => {
                            filterContent.style.maxHeight = filterContent.scrollHeight + 'px';
                            
                            // After animation completes, set to none for normal behavior
                            setTimeout(() => {
                                filterContent.style.maxHeight = 'none';
                                filterContent.style.overflow = 'visible';
                            }, 300);
                        }, 10);
                    }
                } else {
                    // Collapse
                    filterSection.classList.add('collapsed');
                    filterSection.classList.remove('expanded');
                    toggleButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 14l5-5 5 5z"/></svg>';
                    toggleButton.setAttribute('aria-label', 'Expand filter section');
                    
                    // Animate content disappearance
                    if (filterContent) {
                        filterContent.style.maxHeight = filterContent.scrollHeight + 'px';
                        filterContent.style.overflow = 'hidden';
                        
                        setTimeout(() => {
                            filterContent.style.maxHeight = '0';
                        }, 10);
                    }
                }
                
                // Save state to localStorage
                localStorage.setItem('logFilterCollapsed', !isCollapsed);
            });
            
            // Restore saved state
            const savedCollapsedState = localStorage.getItem('logFilterCollapsed') === 'true';
            if (savedCollapsedState) {
                filterSection.classList.add('collapsed');
                filterSection.classList.remove('expanded');
                toggleButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 14l5-5 5 5z"/></svg>';
                toggleButton.setAttribute('aria-label', 'Expand filter section');
                if (filterContent) {
                    filterContent.style.maxHeight = '0';
                    filterContent.style.overflow = 'hidden';
                }
            }
            
            // Clear filters button
            if (clearButton) {
                clearButton.addEventListener('click', () => {
                    // Reset all filter inputs
                    const filterInputs = filterSection.querySelectorAll('input, select');
                    filterInputs.forEach(input => {
                        if (input.type === 'date' || input.type === 'text') {
                            input.value = '';
                        } else if (input.tagName === 'SELECT') {
                            input.selectedIndex = 0;
                        }
                    });
                    
                    // Visual feedback
                    clearButton.classList.add('success');
                    clearButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg><span>Cleared!</span>';
                    
                    setTimeout(() => {
                        clearButton.classList.remove('success');
                        clearButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg><span>Clear</span>';
                    }, 1500);
                    
                    // Apply cleared filters
                    applyLogFilter();
                    
                    // Update active filters display immediately
                    updateActiveFiltersDisplay({});
                });
            }
            
            // Apply filters button
            if (applyButton) {
                applyButton.addEventListener('click', () => {
                    // Visual feedback
                    applyButton.classList.add('loading');
                    applyButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" class="spin"><path fill="currentColor" d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.33-2.5h-2.3A7 7 0 0 0 12 20a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z"/></svg><span>Applying...</span>';
                    
                    // Add loading state to filter section
                    filterSection.classList.add('loading');
                    
                    // Apply filters
                    applyLogFilter();
                    
                    // Reset button state after a delay
                    setTimeout(() => {
                        applyButton.classList.remove('loading');
                        applyButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg><span>Apply</span>';
                        filterSection.classList.remove('loading');
                    }, 1000);
                });
            }
            
            // Add input change listeners for auto-apply on Enter key
            const filterInputs = filterSection.querySelectorAll('input, select');
            filterInputs.forEach(input => {
                input.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        applyLogFilter();
                    }
                });
                
                // Add visual feedback for changed inputs
                input.addEventListener('change', () => {
                    input.classList.add('changed');
                    setTimeout(() => {
                        input.classList.remove('changed');
                    }, 300);
                });
            });
            
            // Add filter row hover effects
            const filterRows = filterSection.querySelectorAll('.filter-row');
            filterRows.forEach(row => {
                row.addEventListener('mouseenter', () => {
                    row.classList.add('hover');
                });
                
                row.addEventListener('mouseleave', () => {
                    row.classList.remove('hover');
                });
            });
        }
        
        // Function to update active filters display
        function updateActiveFiltersDisplay(filters) {
            const activeFiltersContainer = document.getElementById('active-filters-display');
            if (!activeFiltersContainer) return;
            
            // Clear existing badges
            activeFiltersContainer.innerHTML = '';
            
            // If no filters, hide the container
            if (Object.keys(filters).length === 0) {
                activeFiltersContainer.style.display = 'none';
                return;
            }
            
            // Show container and add badges for active filters
            activeFiltersContainer.style.display = 'flex';
            
            // Create badge for each active filter
            Object.entries(filters).forEach(([key, value]) => {
                if (!value) return;
                
                const badge = document.createElement('div');
                badge.className = 'active-filter-badge';
                
                // Get readable label for the filter
                let label = '';
                switch(key) {
                    case 'log_action':
                        label = `Action: ${value}`;
                        break;
                    case 'start_date':
                        label = `From: ${value}`;
                        break;
                    case 'end_date':
                        label = `To: ${value}`;
                        break;
                    case 'target_type':
                        label = `Type: ${value}`;
                        break;
                    case 'path_search':
                        label = `Path: ${value}`;
                        break;
                    case 'sort_by':
                        label = `Sort: ${value}`;
                        break;
                    case 'sort_order':
                        label = `Order: ${value}`;
                        break;
                    default:
                        label = `${key}: ${value}`;
                }
                
                badge.textContent = label;
                
                // Add remove button
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-filter';
                removeBtn.innerHTML = '&times;';
                removeBtn.addEventListener('click', () => {
                    // Remove this specific filter
                    const inputElement = document.getElementById(`log-${key.replace('_', '-')}`);
                    if (inputElement) {
                        if (inputElement.tagName === 'SELECT') {
                            inputElement.selectedIndex = 0;
                        } else {
                            inputElement.value = '';
                        }
                    }
                    
                    // Re-apply filters
                    applyLogFilter();
                    
                    // Update active filters display immediately
                    setTimeout(() => {
                        // Get current filter values after removal
                        const filterSelect = document.getElementById('log-filter');
                        const startDateInput = document.getElementById('log-start-date');
                        const endDateInput = document.getElementById('log-end-date');
                        const targetTypeSelect = document.getElementById('log-target-type');
                        const pathSearchInput = document.getElementById('log-path-search');
                        const sortBySelect = document.getElementById('log-sort-by');
                        const sortOrderSelect = document.getElementById('log-sort-order');
                        
                        // Build updated filter object
                        const updatedFilters = {};
                        
                        if (filterSelect && filterSelect.value) {
                            updatedFilters.log_action = filterSelect.value;
                        }
                        
                        if (startDateInput && startDateInput.value) {
                            updatedFilters.start_date = startDateInput.value;
                        }
                        
                        if (endDateInput && endDateInput.value) {
                            updatedFilters.end_date = endDateInput.value;
                        }
                        
                        if (targetTypeSelect && targetTypeSelect.value) {
                            updatedFilters.target_type = targetTypeSelect.value;
                        }
                        
                        if (pathSearchInput && pathSearchInput.value) {
                            updatedFilters.path_search = pathSearchInput.value;
                        }
                        
                        if (sortBySelect && sortBySelect.value) {
                            updatedFilters.sort_by = sortBySelect.value;
                        }
                        
                        if (sortOrderSelect && sortOrderSelect.value) {
                            updatedFilters.sort_order = sortOrderSelect.value;
                        }
                        
                        updateActiveFiltersDisplay(updatedFilters);
                    }, 100);
                });
                
                badge.appendChild(removeBtn);
                activeFiltersContainer.appendChild(badge);
            });
        }
        
        // Add responsive enhancements for log filter section
        function enhanceLogFilterResponsiveness() {
            const filterSection = document.getElementById('log-filter-section');
            if (!filterSection) return;
            
            // Handle window resize events
            function handleResize() {
                const isSmallScreen = window.innerWidth <= 768;
                const isExtraSmallScreen = window.innerWidth <= 480;
                
                // Adjust filter section layout based on screen size
                if (isExtraSmallScreen) {
                    filterSection.classList.add('extra-small');
                    // Reorganize filter rows for vertical layout
                    const filterRows = filterSection.querySelectorAll('.filter-row');
                    filterRows.forEach(row => {
                        row.classList.add('vertical');
                    });
                } else {
                    filterSection.classList.remove('extra-small');
                    const filterRows = filterSection.querySelectorAll('.filter-row');
                    filterRows.forEach(row => {
                        row.classList.remove('vertical');
                    });
                }
                
                // Update active filters display for current screen size
                if (state.logs.activeFilters) {
                    updateActiveFiltersDisplay(state.logs.activeFilters);
                }
            }
            
            // Initial call
            handleResize();
            
            // Add resize listener with debouncing
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(handleResize, 100);
            });
            
            // Handle orientation change for mobile devices
            window.addEventListener('orientationchange', () => {
                setTimeout(handleResize, 200); // Delay to allow for orientation change completion
            });
            
            // Add touch support for mobile devices
            if ('ontouchstart' in window) {
                filterSection.classList.add('touch-device');
                
                // Add touch feedback for buttons
                const buttons = filterSection.querySelectorAll('button');
                buttons.forEach(button => {
                    button.addEventListener('touchstart', () => {
                        button.classList.add('touch-active');
                    });
                    
                    button.addEventListener('touchend', () => {
                        setTimeout(() => {
                            button.classList.remove('touch-active');
                        }, 150);
                    });
                });
            }
        }

        function closeLogModal() {
            if (!state.logs.isOpen) {
                return;
            }

            state.logs.isOpen = false;
            logOverlay.classList.remove('visible');
            logOverlay.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            
            setTimeout(() => {
                if (!state.logs.isOpen) {
                    logOverlay.hidden = true;
                }
            }, 200);
        }

        function setLogLoading(isLoading) {
            state.logs.isLoading = isLoading;
            if (logRefresh) {
                logRefresh.disabled = isLoading;
                if (isLoading) {
                    logRefresh.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.33-2.5h-2.3A7 7 0 0 0 12 20a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z"/></svg><span>Memuat...</span>';
                } else {
                    logRefresh.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-5 5 5 5 0 0 1-4.33-2.5h-2.3A7 7 0 0 0 12 20a7 7 0 0 0 7-7c0-3.87-3.13-7-7-7z"/></svg><span>Refresh</span>';
                }
            }
        }

        function updateLogPagination() {
            if (logPrev) {
                logPrev.disabled = state.logs.currentPage <= 1 || state.logs.isLoading;
            }
            if (logNext) {
                logNext.disabled = state.logs.currentPage >= state.logs.totalPages || state.logs.isLoading;
            }
            if (logPageInfo) {
                logPageInfo.textContent = `Halaman ${state.logs.currentPage} dari ${state.logs.totalPages}`;
            }
        }

        function formatLogEntry(log) {
            const date = new Date(log.timestamp);
            const formattedDate = date.toLocaleString('id-ID', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const actionLabels = {
                'create': 'Buat',
                'delete': 'Hapus',
                'move': 'Pindah',
                'rename': 'Ubah Nama',
                'upload': 'Unggah',
                'download': 'Unduh',
                'read': 'Baca',
                'copy': 'Salin',
                'unknown': 'Tidak Diketahui'
            };
            
            const typeLabels = {
                'file': 'File',
                'folder': 'Folder',
                'unknown': 'Tidak Diketahui'
            };
            
            return {
                ...log,
                formattedDate: formattedDate,
                actionLabel: actionLabels[log.action] || actionLabels['unknown'],
                typeLabel: typeLabels[log.target_type] || typeLabels['unknown']
            };
        }

        function renderLogTable(logs) {
            console.log('[DEBUG] renderLogTable called with logs:', logs);
            
            if (!logTableBody) {
                console.log('[DEBUG] logTableBody element not found');
                return;
            }

            if (logs.length === 0) {
                console.log('[DEBUG] No logs to display, showing empty message');
                logTableBody.innerHTML = '<tr><td colspan="5" class="log-empty">Tidak ada data log yang tersedia.</td></tr>';
                return;
            }

            console.log('[DEBUG] Rendering', logs.length, 'log entries');
            logTableBody.innerHTML = '';
            
            // Check screen size for responsive display
            const isSmallScreen = window.innerWidth <= 768;
            const isExtraSmallScreen = window.innerWidth <= 480;
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            
            logs.forEach((log, index) => {
                console.log(`[DEBUG] Processing log ${index}:`, log);
                const formattedLog = formatLogEntry(log);
                const row = document.createElement('tr');
                
                // Add touch-friendly class for mobile devices
                if (isTouchDevice) {
                    row.classList.add('touch-friendly');
                }
                
                // Time cell with better formatting
                const timeCell = document.createElement('td');
                timeCell.className = 'log-time';
                
                // Format date differently for small screens
                let displayDate = formattedLog.formattedDate;
                if (isSmallScreen) {
                    // Shorten date format for small screens
                    const date = new Date(log.timestamp);
                    displayDate = date.toLocaleString('id-ID', {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
                
                timeCell.innerHTML = `<span class="log-date">${displayDate}</span>`;
                timeCell.title = `Timestamp: ${log.timestamp}`;
                row.appendChild(timeCell);
                
                // Action cell with label
                const actionCell = document.createElement('td');
                actionCell.className = 'log-action';
                
                // Use shorter labels on small screens
                let actionLabel = formattedLog.actionLabel;
                if (isExtraSmallScreen) {
                    switch(log.action) {
                        case 'create': actionLabel = 'Buat'; break;
                        case 'delete': actionLabel = 'Hapus'; break;
                        case 'move': actionLabel = 'Pindah'; break;
                        case 'rename': actionLabel = 'Ubah'; break;
                        case 'upload': actionLabel = 'Unggah'; break;
                        case 'download': actionLabel = 'Unduh'; break;
                        case 'read': actionLabel = 'Baca'; break;
                        case 'copy': actionLabel = 'Salin'; break;
                        default: actionLabel = formattedLog.actionLabel;
                    }
                }
                
                actionCell.innerHTML = `<span class="log-badge log-action-${log.action}">${actionLabel}</span>`;
                row.appendChild(actionCell);
                
                // Target cell with path tooltip
                const targetCell = document.createElement('td');
                targetCell.className = 'log-target';
                let targetName = log.target_name || log.target_path || '-';
                
                // Truncate long paths on small screens
                if (isSmallScreen && targetName.length > 20) {
                    targetName = targetName.substring(0, 18) + '...';
                }
                
                // Add touch-friendly click handler for mobile
                if (isTouchDevice) {
                    targetCell.style.cursor = 'pointer';
                    targetCell.addEventListener('click', () => {
                        // Show full path in a modal or alert on mobile
                        alert(`Path: ${log.target_path || '-'}`);
                    });
                }
                
                targetCell.innerHTML = `<span class="log-target-name" title="${log.target_path || '-'}">${targetName}</span>`;
                row.appendChild(targetCell);
                
                // Type cell with icon
                const typeCell = document.createElement('td');
                typeCell.className = 'log-type';
                const typeIcon = log.target_type === 'folder' ? '📁' : '📄';
                
                // Use shorter type labels on small screens
                let typeLabel = formattedLog.typeLabel;
                if (isExtraSmallScreen) {
                    typeLabel = log.target_type === 'folder' ? 'Fldr' : 'File';
                }
                
                typeCell.innerHTML = `<span class="log-type-badge">${typeIcon} ${typeLabel}</span>`;
                row.appendChild(typeCell);
                
                // IP cell - hide on very small screens
                if (!isExtraSmallScreen) {
                    const ipCell = document.createElement('td');
                    ipCell.className = 'log-ip';
                    let ipAddress = log.ip_address || '-';
                    
                    // Shorten IP on small screens
                    if (isSmallScreen && ipAddress.length > 12) {
                        const parts = ipAddress.split('.');
                        if (parts.length === 4) {
                            ipAddress = `${parts[0]}.${parts[1]}.*.*`;
                        }
                    }
                    
                    ipCell.textContent = ipAddress;
                    ipCell.title = `IP: ${log.ip_address || '-'}`;
                    row.appendChild(ipCell);
                }
                
                logTableBody.appendChild(row);
            });
            
            // Add responsive table wrapper if needed
            const logTable = document.querySelector('.log-table');
            if (logTable && isSmallScreen) {
                // Check if wrapper already exists
                if (!logTable.parentElement.classList.contains('log-table-wrapper')) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'log-table-wrapper';
                    logTable.parentNode.insertBefore(wrapper, logTable);
                    wrapper.appendChild(logTable);
                }
            }
            
            console.log('[DEBUG] Log table rendering completed');
        }

        function applyLogFilter() {
            const filterSelect = document.getElementById('log-filter');
            const startDateInput = document.getElementById('log-start-date');
            const endDateInput = document.getElementById('log-end-date');
            const targetTypeSelect = document.getElementById('log-target-type');
            const pathSearchInput = document.getElementById('log-path-search');
            const sortBySelect = document.getElementById('log-sort-by');
            const sortOrderSelect = document.getElementById('log-sort-order');
            
            // Build filter object
            const filters = {};
            
            if (filterSelect && filterSelect.value) {
                filters.log_action = filterSelect.value;
            }
            
            if (startDateInput && startDateInput.value) {
                filters.start_date = startDateInput.value;
            }
            
            if (endDateInput && endDateInput.value) {
                filters.end_date = endDateInput.value;
            }
            
            if (targetTypeSelect && targetTypeSelect.value) {
                filters.target_type = targetTypeSelect.value;
            }
            
            if (pathSearchInput && pathSearchInput.value) {
                filters.path_search = pathSearchInput.value;
            }
            
            if (sortBySelect && sortBySelect.value) {
                filters.sort_by = sortBySelect.value;
            }
            
            if (sortOrderSelect && sortOrderSelect.value) {
                filters.sort_order = sortOrderSelect.value;
            }
            
            // Reset to first page when applying new filters
            state.logs.currentPage = 1;
            state.logs.activeFilters = filters;
            
            // Add visual feedback for active filters
            updateActiveFiltersDisplay(filters);
            
            // Fetch data with new filters
            fetchLogDataWithFilters(filters);
        }

        async function fetchLogDataWithFilters(filters = {}) {
            try {
                console.log('[DEBUG] fetchLogDataWithFilters called with filters:', filters);
                setLogLoading(true);
                if (logError) {
                    logError.hidden = true;
                    logError.textContent = '';
                }

                const params = new URLSearchParams();
                params.append('action', 'logs');
                params.append('limit', '50');
                params.append('offset', String((state.logs.currentPage - 1) * 50));

                // Add filters to params
                Object.keys(filters).forEach(key => {
                    if (filters[key]) {
                        params.append(key, filters[key]);
                    }
                });

                const url = `api.php?${params.toString()}`;
                console.log('[DEBUG] Fetching logs from URL:', url);
                
                const response = await fetch(url);
                console.log('[DEBUG] Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('[DEBUG] Response data:', data);
                
                if (!data.success) {
                    throw new Error(data.error || 'Gagal mengambil data log.');
                }

                state.logs.data = data.logs || [];
                state.logs.totalPages = Math.ceil(data.total / 50) || 1;
                
                console.log('[DEBUG] Logs data loaded:', state.logs.data.length, 'entries');
                console.log('[DEBUG] Total pages:', state.logs.totalPages);
                
                // Add fade-in animation to the log table
                const logTable = document.querySelector('.log-table');
                if (logTable) {
                    logTable.classList.add('fade-in');
                    // Remove animation class after animation completes
                    setTimeout(() => {
                        logTable.classList.remove('fade-in');
                    }, 500);
                }
                
                renderLogTable(state.logs.data);
                updateLogPagination();
            } catch (error) {
                console.error('[DEBUG] Error fetching log data:', error);
                if (logError) {
                    logError.textContent = error.message || 'Terjadi kesalahan saat memuat data log.';
                    logError.hidden = false;
                }
                if (logTableBody) {
                    logTableBody.innerHTML = '<tr><td colspan="5" class="log-error">Gagal memuat data log.</td></tr>';
                }
            } finally {
                setLogLoading(false);
                // Remove loading state from filter section
                const filterSection = document.getElementById('log-filter-section');
                if (filterSection) {
                    filterSection.classList.remove('loading');
                }
            }
        }

        async function fetchLogData() {
            return fetchLogDataWithFilters(state.logs.activeFilters || {});
        }

        function exportLogs(format = 'csv') {
            if (!state.logs.data || state.logs.data.length === 0) {
                setError('Tidak ada data log untuk diekspor.');
                return;
            }

            try {
                let content, filename, mimeType;
                
                if (format === 'csv') {
                    content = exportLogsToCSV(state.logs.data);
                    filename = `logs_${new Date().toISOString().split('T')[0]}.csv`;
                    mimeType = 'text/csv';
                } else if (format === 'json') {
                    content = JSON.stringify(state.logs.data, null, 2);
                    filename = `logs_${new Date().toISOString().split('T')[0]}.json`;
                    mimeType = 'application/json';
                } else {
                    throw new Error('Format export tidak didukung.');
                }

                // Create download link
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                flashStatus(`Log berhasil diekspor sebagai ${format.toUpperCase()}.`);
            } catch (error) {
                console.error('Error exporting logs:', error);
                setError(`Gagal mengekspor log: ${error.message}`);
            }
        }

        function exportLogsToCSV(logs) {
            if (!logs || logs.length === 0) return '';
            
            const headers = ['Timestamp', 'Action', 'Target', 'Type', 'IP Address'];
            const csvRows = [headers.join(',')];
            
            logs.forEach(log => {
                const formattedLog = formatLogEntry(log);
                const row = [
                    `"${log.timestamp}"`,
                    `"${formattedLog.actionLabel}"`,
                    `"${log.target_path || ''}"`,
                    `"${formattedLog.typeLabel}"`,
                    `"${log.ip_address || ''}"`
                ];
                csvRows.push(row.join(','));
            });
            
            return csvRows.join('\n');
        }

        function startRealTimeRefresh(interval = 30000) { // 30 seconds default
            if (state.logs.refreshInterval) {
                clearInterval(state.logs.refreshInterval);
            }
            
            state.logs.refreshInterval = setInterval(() => {
                if (state.logs.isOpen && !state.logs.isLoading) {
                    fetchLogData();
                }
            }, interval);
        }

        function stopRealTimeRefresh() {
            if (state.logs.refreshInterval) {
                clearInterval(state.logs.refreshInterval);
                state.logs.refreshInterval = null;
            }
        }

        // Log modal event listeners
        if (btnLogs) {
            btnLogs.addEventListener('click', () => {
                if (state.isLoading) return;
                openLogModal();
            });
        }

        if (logClose) {
            logClose.addEventListener('click', () => {
                if (state.logs.isLoading) return;
                closeLogModal();
                stopRealTimeRefresh();
            });
        }

        if (logRefresh) {
            logRefresh.addEventListener('click', () => {
                if (state.logs.isLoading) return;
                fetchLogData();
            });
        }

        if (logFilter) {
            logFilter.addEventListener('change', () => {
                if (state.logs.isLoading) return;
                applyLogFilter();
            });
        }

        if (logPrev) {
            logPrev.addEventListener('click', () => {
                if (state.logs.currentPage <= 1 || state.logs.isLoading) return;
                state.logs.currentPage--;
                fetchLogData();
            });
        }

        if (logNext) {
            logNext.addEventListener('click', () => {
                if (state.logs.currentPage >= state.logs.totalPages || state.logs.isLoading) return;
                state.logs.currentPage++;
                fetchLogData();
            });
        }

        if (logCleanup) {
            logCleanup.addEventListener('click', () => {
                if (state.logs.isLoading || state.logs.isCleaningUp) return;
                const days = parseInt(logCleanupDays.value);
                cleanupLogs(days);
            });
        }

        if (logOverlay) {
            logOverlay.addEventListener('click', (event) => {
                if (event.target === logOverlay && !state.logs.isLoading) {
                    closeLogModal();
                    stopRealTimeRefresh();
                }
            });
        }

        // Additional filter event listeners
        const logStartDate = document.getElementById('log-start-date');
        const logEndDate = document.getElementById('log-end-date');
        const logTargetType = document.getElementById('log-target-type');
        const logPathSearch = document.getElementById('log-path-search');
        const logSortBy = document.getElementById('log-sort-by');
        const logSortOrder = document.getElementById('log-sort-order');
        const logExportCsv = document.getElementById('log-export-csv');
        const logExportJson = document.getElementById('log-export-json');
        const logAutoRefresh = document.getElementById('log-auto-refresh');

        if (logStartDate) {
            logStartDate.addEventListener('change', () => {
                if (state.logs.isLoading) return;
                applyLogFilter();
            });
        }

        if (logEndDate) {
            logEndDate.addEventListener('change', () => {
                if (state.logs.isLoading) return;
                applyLogFilter();
            });
        }

        if (logTargetType) {
            logTargetType.addEventListener('change', () => {
                if (state.logs.isLoading) return;
                applyLogFilter();
            });
        }

        if (logPathSearch) {
            let searchTimeout;
            logPathSearch.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (state.logs.isLoading) return;
                    applyLogFilter();
                }, 500); // Debounce search
            });
        }

        if (logSortBy) {
            logSortBy.addEventListener('change', () => {
                if (state.logs.isLoading) return;
                applyLogFilter();
            });
        }

        if (logSortOrder) {
            logSortOrder.addEventListener('change', () => {
                if (state.logs.isLoading) return;
                applyLogFilter();
            });
        }

        if (logExportCsv) {
            logExportCsv.addEventListener('click', () => {
                exportLogs('csv');
            });
        }

        if (logExportJson) {
            logExportJson.addEventListener('click', () => {
                exportLogs('json');
            });
        }

        if (logAutoRefresh) {
            logAutoRefresh.addEventListener('change', (event) => {
                if (event.target.checked) {
                    startRealTimeRefresh(30000); // 30 seconds
                    flashStatus('Auto-refresh diaktifkan (30 detik)');
                } else {
                    stopRealTimeRefresh();
                    flashStatus('Auto-refresh dinonaktifkan');
                }
            });
        }

        // Keyboard navigation for log modal
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && state.logs.isOpen && !state.logs.isLoading) {
                event.preventDefault();
                closeLogModal();
                stopRealTimeRefresh();
            }
        });
        // Cleanup logs function
        async function cleanupLogs(days) {
            if (state.logs.isCleaningUp || state.logs.isLoading) {
                return;
            }

            const confirmed = await new Promise((resolve) => {
                openConfirmOverlay({
                    message: `Hapus log yang lebih tua dari ${days} hari?`,
                    description: 'Log yang dihapus tidak dapat dikembalikan. Operasi ini akan membersihkan log lama untuk menghemat ruang penyimpanan.',
                    paths: [],
                    showList: false,
                    confirmLabel: 'Hapus Log',
                    onSave: () => {
                        closeConfirmOverlay();
                        resolve(true);
                    },
                    onDiscard: () => {
                        closeConfirmOverlay();
                        resolve(false);
                    },
                    onCancel: () => {
                        closeConfirmOverlay();
                        resolve(false);
                    }
                });
            });

            if (!confirmed) {
                return;
            }

            try {
                state.logs.isCleaningUp = true;
                setLogLoading(true);

                const response = await fetch(`api.php?action=cleanup_logs&days=${days}`);
                if (!response.ok) {
                    throw new Error('Gagal membersihkan log.');
                }

                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.error || 'Gagal membersihkan log.');
                }

                flashStatus(`${data.deleted_count} log berhasil dihapus. ${data.remaining_count} log tersisa.`);
                
                // Refresh log data after cleanup
                await fetchLogData();
            } catch (error) {
                console.error('Error cleaning up logs:', error);
                setError(error.message || 'Terjadi kesalahan saat membersihkan log.');
            } finally {
                state.logs.isCleaningUp = false;
                setLogLoading(false);
            }
        }

        // ======== End Log modal implementation ========

        btnUp.addEventListener('click', () => {
            const parent = btnUp.dataset.parentPath || '';
            if (parent !== state.currentPath) {
                navigateTo(parent);
            }
        });

        btnRefresh.addEventListener('click', () => {
            if (hasUnsavedChanges()) {
                const confirmed = confirmDiscardChanges('Perubahan belum disimpan. Muat ulang daftar dan buang perubahan?')
                    .then((confirmed) => {
                        if (!confirmed) {
                            return;
                        }
                        fetchDirectory(state.currentPath);
                    });
                return;
            }

            fetchDirectory(state.currentPath);
        });

        function closeCreateOverlay() {
            if (!state.create.isOpen) {
                return;
            }
            state.create.isOpen = false;
            state.create.kind = 'file';
            createOverlay.classList.remove('visible');
            createOverlay.setAttribute('aria-hidden', 'true');
            createForm.reset();
            createHint.textContent = '';
            createSubmit.disabled = false;
            createName.disabled = false;
            if (!state.preview.isOpen && !state.confirm.isOpen) {
                document.body.classList.remove('modal-open');
            }
            setTimeout(() => {
                if (!state.create.isOpen) {
                    createOverlay.hidden = true;
                }
            }, 200);
        }

        function closeRenameOverlay() {
            if (!state.rename.isOpen) {
                return;
            }
            state.rename.isOpen = false;
            state.rename.targetItem = null;
            state.rename.originalName = '';
            renameOverlay.classList.remove('visible');
            renameOverlay.setAttribute('aria-hidden', 'true');
            renameForm.reset();
            renameHint.textContent = '';
            renameSubmit.disabled = false;
            renameName.disabled = false;
            if (!state.preview.isOpen && !state.confirm.isOpen && !state.create.isOpen) {
                document.body.classList.remove('modal-open');
            }
            setTimeout(() => {
                if (!state.rename.isOpen) {
                    renameOverlay.hidden = true;
                }
            }, 200);
        }

        function submitRename() {
            if (!state.rename.isOpen || !state.rename.targetItem) {
                return;
            }

            const newName = renameName.value.trim();
            if (newName === '') {
                renameHint.textContent = 'Nama tidak boleh kosong.';
                renameHint.classList.add('error');
                return;
            }

            if (newName === state.rename.originalName) {
                closeRenameOverlay();
                return;
            }

            setLoading(true);
            renameSubmit.disabled = true;
            renameName.disabled = true;

            const item = state.rename.targetItem;
            const oldPath = item.path;
            const directory = oldPath.substring(0, oldPath.lastIndexOf('/'));
            const newPath = directory ? `${directory}/${newName}` : newName;

            fetch(`api.php?action=rename&path=${encodePathSegments(oldPath)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    newName: newName,
                    newPath: newPath,
                }),
            })
                .then(async (response) => {
                    const data = await response.json().catch(() => null);
                    if (!response.ok || !data || !data.success) {
                        const errorMessage = data && data.error ? data.error : 'Gagal mengubah nama item.';
                        throw new Error(errorMessage);
                    }
                    
                    flashStatus(`${item.name} berhasil diubah namanya menjadi ${newName}.`);
                    closeRenameOverlay();
                    
                    // If the renamed item is currently open in preview, update the preview
                    if (state.preview.isOpen && state.preview.path === oldPath) {
                        state.preview.path = newPath;
                        previewTitle.textContent = newName;
                        previewMeta.textContent = previewMeta.textContent.replace(item.name, newName);
                        previewOpenRaw.href = buildFileUrl(newPath);
                    }
                    
                    return fetchDirectory(state.currentPath, { silent: true });
                })
                .catch((error) => {
                    const message = error instanceof Error ? error.message : 'Gagal mengubah nama item.';
                    setError(message);
                    renameHint.textContent = message;
                    renameHint.classList.add('error');
                    renameSubmit.disabled = false;
                    renameName.disabled = false;
                    renameName.focus();
                })
                .finally(() => {
                    setLoading(false);
                });
        }

        function openRenameOverlay(item) {
            state.rename.isOpen = true;
            state.rename.targetItem = item;
            state.rename.originalName = item.name;

            const isFolder = item.type === 'folder';
            renameTitle.textContent = 'Rename Item';
            renameSubtitle.textContent = `Ubah nama ${isFolder ? 'folder' : 'file'} "${item.name}".`;
            renameLabel.textContent = 'Nama Baru';
            renameName.value = item.name;
            renameName.placeholder = isFolder ? 'Masukkan nama folder baru' : 'Masukkan nama file baru';
            renameHint.textContent = isFolder
                ? 'Gunakan huruf, angka, titik, atau garis bawah.'
                : 'Sertakan ekstensi file jika diperlukan.';
            renameSubmit.textContent = 'Rename';

            renameOverlay.hidden = false;
            requestAnimationFrame(() => {
                renameOverlay.classList.add('visible');
            });
            renameOverlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');

            // Select the filename without extension for files
            if (!isFolder) {
                const dotIndex = item.name.lastIndexOf('.');
                if (dotIndex > 0) {
                    renameName.focus();
                    renameName.setSelectionRange(0, dotIndex);
                } else {
                    renameName.select();
                }
            } else {
                renameName.select();
            }
        }

        function openCreateOverlay(kind) {
            state.create.isOpen = true;
            state.create.kind = kind;

            const isFolder = kind === 'folder';
            createTitle.textContent = isFolder ? 'Tambah Folder' : 'Tambah File';
            createSubtitle.textContent = isFolder
                ? 'Buat folder baru pada lokasi saat ini.'
                : 'Buat file baru pada lokasi saat ini.';
            createLabel.textContent = isFolder ? 'Nama Folder' : 'Nama File';
            createName.placeholder = isFolder ? 'Misal: dokumen' : 'Misal: catatan.txt';
            createHint.textContent = isFolder
                ? 'Gunakan huruf, angka, titik, atau garis bawah.'
                : 'Sertakan ekstensi file jika diperlukan.';
            createSubmit.textContent = 'Buat';

            createOverlay.hidden = false;
            requestAnimationFrame(() => {
                createOverlay.classList.add('visible');
            });
            createOverlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');

            createName.value = '';
            createName.focus();
        }

        function submitCreate(kind, name) {
            const trimmed = name.trim();
            if (trimmed === '') {
                createHint.textContent = 'Nama tidak boleh kosong.';
                createHint.classList.add('error');
                return;
            }

            setLoading(true);
            createSubmit.disabled = true;
            createName.disabled = true;

            fetch(`api.php?action=create&path=${encodePathSegments(state.currentPath)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: kind,
                    name: trimmed,
                }),
            })
                .then(async (response) => {
                    const data = await response.json().catch(() => null);
                    if (!response.ok || !data || !data.success) {
                        const errorMessage = data && data.error ? data.error : 'Gagal membuat item baru.';
                        throw new Error(errorMessage);
                    }
                    flashStatus(`${data.item.name} berhasil dibuat.`);
                    closeCreateOverlay();
                    return fetchDirectory(state.currentPath, { silent: true });
                })
                .catch((error) => {
                    const message = error instanceof Error ? error.message : 'Gagal membuat item baru.';
                    setError(message);
                    createHint.textContent = message;
                    createHint.classList.add('error');
                    createSubmit.disabled = false;
                    createName.disabled = false;
                    createName.focus();
                })
                .finally(() => {
                    setLoading(false);
                });
        }

        function closeSplitMenu() {
            if (!splitToggle || !splitMenu) {
                return;
            }
            splitToggle.setAttribute('aria-expanded', 'false');
            splitMenu.setAttribute('aria-hidden', 'true');
        }

        function toggleSplitMenu() {
            if (!splitToggle || !splitMenu) {
                return;
            }
            const expanded = splitToggle.getAttribute('aria-expanded') === 'true';
            splitToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            splitMenu.setAttribute('aria-hidden', expanded ? 'true' : 'false');
        }

        if (splitToggle && splitMenu && splitOptions) {
            const closeMenu = () => {
                splitToggle.setAttribute('aria-expanded', 'false');
                splitMenu.setAttribute('aria-hidden', 'true');
            };

            splitToggle.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleSplitMenu();
                if (splitMenu.getAttribute('aria-hidden') === 'false') {
                    splitMenu.querySelector('button')?.focus();
                }
            });

            document.addEventListener('click', (event) => {
                if (splitMenu && splitAction && !splitAction.contains(event.target)) {
                    closeMenu();
                }
            });

            splitOptions.forEach((option) => {
                option.addEventListener('click', (event) => {
                    const button = event.currentTarget;
                    const action = button.dataset.action;
                    if (!action) {
                        closeMenu();
                        return;
                    }

                    if (action === 'add-modal') {
                        const kind = button.dataset.kind === 'folder' ? 'folder' : 'file';
                        openCreateOverlay(kind);
                    }

                    closeMenu();
                });
            });

            splitMenu.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    closeMenu();
                    splitToggle.focus();
                }
            });
        }

        if (splitMain) {
            splitMain.addEventListener('click', () => {
                openCreateOverlay('file');
            });
        }

        if (splitAction) {
            splitAction.addEventListener('keydown', (event) => {
                if ((event.key === 'Enter' || event.key === ' ') && splitMain && event.target === splitMain) {
                    event.preventDefault();
                    openCreateOverlay('file');
                }
                if (event.key === 'ArrowDown' && splitToggle) {
                    event.preventDefault();
                    toggleSplitMenu();
                    if (splitMenu && splitMenu.getAttribute('aria-hidden') === 'false') {
                        splitMenu.querySelector('button')?.focus();
                    }
                }
                if (event.key === 'Escape' && splitMenu && splitMenu.getAttribute('aria-hidden') === 'false') {
                    closeSplitMenu();
                    splitToggle.focus();
                }
            });
        }

        if (btnUpload && uploadInput) {
            btnUpload.addEventListener('click', () => {
                if (state.isLoading) {
                    return;
                }
                uploadInput.value = '';
                uploadInput.click();
            });

            uploadInput.addEventListener('change', async (event) => {
                const { files } = event.target;
                if (!files || files.length === 0) {
                    return;
                }

                if (hasUnsavedChanges()) {
                    const proceed = confirmDiscardChanges('Perubahan belum disimpan. Tetap unggah file baru?')
                        .then((proceed) => {
                            if (!proceed) {
                                uploadInput.value = '';
                                return;
                            }
                            // Continue with upload logic
                            const formData = new FormData();
                            Array.from(files).forEach((file) => {
                                formData.append('files[]', file, file.name);
                            });
                            formData.append('path', state.currentPath);
                            // ... rest of upload logic
                        });
                    uploadInput.value = '';
                    return;
                }

                const formData = new FormData();
                Array.from(files).forEach((file) => {
                    formData.append('files[]', file, file.name);
                });
                formData.append('path', state.currentPath);

                setLoading(true);
                btnUpload.disabled = true;

                try {
                    const response = await fetch('api.php?action=upload', {
                        method: 'POST',
                        body: formData,
                    });

                    let data = null;
                    try {
                        data = await response.json();
                    } catch (parseError) {
                        data = null;
                    }

                    if (!response.ok || !data || !data.success) {
                        const errMessage = data && data.error
                            ? data.error
                            : `Gagal mengunggah file${files.length > 1 ? ' (sebagian atau semua).' : '.'}`;
                        throw new Error(errMessage);
                    }

                    const uploaded = Array.isArray(data.uploaded) ? data.uploaded : [];
                    const failures = Array.isArray(data.errors) ? data.errors : [];
                    if (uploaded.length > 0) {
                        const names = uploaded.map((item) => item.name).join(', ');
                        flashStatus(`File diunggah: ${names}`);
                    } else {
                        flashStatus('Tidak ada file yang diunggah.');
                    }

                    if (failures.length > 0) {
                        const firstFailure = failures[0];
                        const detail = firstFailure && typeof firstFailure === 'object'
                            ? `${firstFailure.name || 'File'}: ${firstFailure.error || 'Tidak diketahui'}`
                            : 'Beberapa file gagal diunggah.';
                        setError(`Sebagian file gagal diunggah. ${detail}`);
                    } else {
                        setError('');
                    }

                    await fetchDirectory(state.currentPath, { silent: true });
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat mengunggah.';
                    setError(message);
                } finally {
                    setLoading(false);
                    btnUpload.disabled = false;
                    uploadInput.value = '';
                }
            });
        }

        clearSearch.hidden = true;

        filterInput.addEventListener('input', (event) => {
            state.filter = event.target.value.trim();
            clearSearch.hidden = state.filter === '';
            renderItems(state.items, state.lastUpdated, false);
        });

        filterInput.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && filterInput.value !== '') {
                event.preventDefault();
                filterInput.value = '';
                state.filter = '';
                clearSearch.hidden = true;
                renderItems(state.items, state.lastUpdated, false);
            }
        });

        clearSearch.addEventListener('click', () => {
            filterInput.value = '';
            state.filter = '';
            clearSearch.hidden = true;
            renderItems(state.items, state.lastUpdated, false);
            filterInput.focus();
        });

        sortHeaders.forEach((header) => {
            header.setAttribute('role', 'button');
            header.tabIndex = 0;
            header.addEventListener('click', () => changeSort(header.dataset.sortKey));
            header.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    changeSort(header.dataset.sortKey);
                }
            });
        });

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (event) => {
                if (state.isLoading || state.isDeleting) {
                    event.preventDefault();
                    updateSelectionUI();
                    return;
                }
                setSelectionForVisible(event.target.checked);
            });
        }

        if (btnDeleteSelected) {
            btnDeleteSelected.addEventListener('click', () => {
                if (state.isLoading || state.isDeleting || state.selected.size === 0) {
                    return;
                }

                const paths = Array.from(state.selected);
                const labels = paths.map((path) => {
                    const item = state.itemMap.get(path);
                    return item ? item.name : path;
                });

                if (hasUnsavedChanges()) {
                    const proceed = confirmDiscardChanges('Perubahan belum disimpan. Tetap hapus item terpilih?')
                        .then((proceed) => {
                            if (!proceed) {
                                return;
                            }
                            const paths = Array.from(state.selected);
                            const labels = paths.map((path) => {
                                const item = state.itemMap.get(path);
                                return item ? item.name : path;
                            });
                            const message = paths.length === 1
                                ? `Hapus "${labels[0]}"?`
                                : `Hapus ${paths.length.toLocaleString('id-ID')} item terpilih?`;
                            const description = 'Item yang dihapus tidak dapat dikembalikan.';
                            openConfirmOverlay({
                                message,
                                description,
                                paths,
                                showList: paths.length > 1,
                                confirmLabel: 'Hapus',
                            });
                        });
                    return;
                }

                const message = paths.length === 1
                    ? `Hapus "${labels[0]}"?`
                    : `Hapus ${paths.length.toLocaleString('id-ID')} item terpilih?`;

                const description = 'Item yang dihapus tidak dapat dikembalikan.';

                openConfirmOverlay({
                    message,
                    description,
                    paths,
                    showList: paths.length > 1,
                    confirmLabel: 'Hapus',
                });
            });
        }

        previewClose.addEventListener('click', () => {
            closePreviewOverlay().catch(() => {});
        });

        previewCopy.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(previewEditor.value);
                updatePreviewStatus('Konten disalin ke clipboard.');
            } catch (error) {
                updatePreviewStatus('Gagal menyalin konten.');
                console.error(error);
            }
        });

        previewSave.addEventListener('click', () => {
            savePreviewContent();
        });

        previewEditor.addEventListener('input', () => {
            if (!state.preview.isOpen) {
                return;
            }

            const isDirty = previewEditor.value !== state.preview.originalContent;
            state.preview.dirty = isDirty;

            if (!state.preview.isSaving) {
                previewEditor.readOnly = false;
            }

            previewSave.disabled = !isDirty;
            
            // Update save button text and style
            if (isDirty) {
                previewSave.textContent = 'Simpan *';
                previewSave.classList.add('dirty');
            } else {
                previewSave.textContent = 'Simpan';
                previewSave.classList.remove('dirty');
            }
            
            updatePreviewStatus();
            updateLineNumbers();
            
            // Ensure consistent styling after content changes
            setTimeout(() => ensureConsistentStyling(), 0);
            
            syncLineNumbersScroll();
            
            // Update window title to indicate unsaved changes
            const originalTitle = document.title.replace(/^\* /, '');
            document.title = isDirty ? `* ${originalTitle}` : originalTitle;
        });

        previewEditor.addEventListener('scroll', () => {
            syncLineNumbersScroll();
            
            // Debug scroll alignment every 10 scroll events
            if (!window.scrollDebugCounter) window.scrollDebugCounter = 0;
            if (++window.scrollDebugCounter % 10 === 0) {
                debugElementStyles();
            }
        });

        previewEditor.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                if (!previewSave.disabled) {
                    savePreviewContent();
                }
            }
        });

        previewOverlay.addEventListener('click', (event) => {
            if (event.target === previewOverlay) {
                closePreviewOverlay().catch(() => {});
            }
        });

        confirmCancel.addEventListener('click', () => {
            if (state.isDeleting) {
                return;
            }
            closeConfirmOverlay();
        });

        confirmConfirm.addEventListener('click', () => {
            if (state.isDeleting) {
                return;
            }
            const { paths } = state.confirm;
            deleteItems(paths);
        });

        confirmOverlay.addEventListener('click', (event) => {
            if (event.target === confirmOverlay && !state.isDeleting) {
                closeConfirmOverlay();
            }
        });

        createName.addEventListener('input', () => {
            if (createHint.classList.contains('error')) {
                createHint.classList.remove('error');
                createHint.textContent = state.create.kind === 'folder'
                    ? 'Gunakan huruf, angka, titik, atau garis bawah.'
                    : 'Sertakan ekstensi file jika diperlukan.';
            }
        });

        createForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (state.isLoading) {
                return;
            }
            submitCreate(state.create.kind, createName.value);
        });

        createCancel.addEventListener('click', () => {
            if (state.isLoading) {
                return;
            }
            closeCreateOverlay();
        });

        createOverlay.addEventListener('click', (event) => {
            if (event.target === createOverlay && !state.isLoading) {
                closeCreateOverlay();
            }
        });

        renameName.addEventListener('input', () => {
            if (renameHint.classList.contains('error')) {
                renameHint.classList.remove('error');
                renameHint.textContent = state.rename.targetItem && state.rename.targetItem.type === 'folder'
                    ? 'Gunakan huruf, angka, titik, atau garis bawah.'
                    : 'Sertakan ekstensi file jika diperlukan.';
            }
        });

        renameForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (state.isLoading) {
                return;
            }
            submitRename();
        });

        renameCancel.addEventListener('click', () => {
            if (state.isLoading) {
                return;
            }
            closeRenameOverlay();
        });

        renameOverlay.addEventListener('click', (event) => {
            if (event.target === renameOverlay && !state.isLoading) {
                closeRenameOverlay();
            }
        });

        unsavedSave.addEventListener('click', async (event) => {
            event.stopPropagation();
            console.log('[DEBUG] unsavedSave clicked');
            console.log('[DEBUG] state.unsaved.callback:', state.unsaved.callback);
            console.log('[DEBUG] onSave exists:', !!(state.unsaved.callback && state.unsaved.callback.onSave));
            
            if (state.unsaved.callback && state.unsaved.callback.onSave) {
                console.log('[DEBUG] Calling onSave callback');
                // Don't close overlay yet, let the callback handle it
                await state.unsaved.callback.onSave();
            } else {
                console.log('[DEBUG] No onSave callback found, closing overlay');
                closeUnsavedOverlay();
            }
        });

        unsavedDiscard.addEventListener('click', async (event) => {
            event.stopPropagation();
            console.log('[DEBUG] unsavedDiscard clicked');
            console.log('[DEBUG] state.unsaved.callback:', state.unsaved.callback);
            console.log('[DEBUG] onDiscard exists:', !!(state.unsaved.callback && state.unsaved.callback.onDiscard));
            
            if (state.unsaved.callback && state.unsaved.callback.onDiscard) {
                console.log('[DEBUG] Calling onDiscard callback');
                await state.unsaved.callback.onDiscard();
            } else {
                console.log('[DEBUG] No onDiscard callback found, closing overlay');
                closeUnsavedOverlay();
            }
        });


        unsavedCancel.addEventListener('click', async (event) => {
            event.stopPropagation();
            console.log('[DEBUG] unsavedCancel clicked');
            console.log('[DEBUG] state.unsaved.callback:', state.unsaved.callback);
            console.log('[DEBUG] onCancel exists:', !!(state.unsaved.callback && state.unsaved.callback.onCancel));
            
            if (state.unsaved.callback && state.unsaved.callback.onCancel) {
                console.log('[DEBUG] Calling onCancel callback');
                await state.unsaved.callback.onCancel();
            } else {
                console.log('[DEBUG] No onCancel callback found, closing overlay');
                closeUnsavedOverlay();
            }
        });

        unsavedOverlay.addEventListener('click', async (event) => {
            console.log('[DEBUG] unsavedOverlay clicked, target:', event.target);
            if (event.target === unsavedOverlay) {
                console.log('[DEBUG] Click on overlay background, triggering cancel');
                if (state.unsaved.callback && state.unsaved.callback.onCancel) {
                    await state.unsaved.callback.onCancel();
                } else {
                    closeUnsavedOverlay();
                }
            }
        });

        document.addEventListener('keydown', async (event) => {
            if (event.key === 'Escape') {
                if (state.unsaved.isOpen) {
                    event.preventDefault();
                    if (state.unsaved.callback && state.unsaved.callback.onCancel) {
                        await state.unsaved.callback.onCancel();
                    } else {
                        closeUnsavedOverlay();
                    }
                    return;
                }

                if (state.confirm.isOpen && !state.isDeleting) {
                    event.preventDefault();
                    closeConfirmOverlay();
                    return;
                }

                if (state.create.isOpen && !state.isLoading) {
                    event.preventDefault();
                    closeCreateOverlay();
                    return;
                }

                if (state.rename.isOpen && !state.isLoading) {
                    event.preventDefault();
                    closeRenameOverlay();
                    return;
                }

                if (state.preview.isOpen) {
                    event.preventDefault();
                    closePreviewOverlay().catch(() => {});
                }
            }
        });

        window.addEventListener('beforeunload', (event) => {
            if (hasUnsavedChanges()) {
                event.preventDefault();
                event.returnValue = '';
            }
        });

        updateSortUI();
        updateSelectionUI();

        function startPolling() {
            if (state.polling) {
                clearInterval(state.polling);
            }
            state.polling = setInterval(() => {
                fetchDirectory(state.currentPath, { silent: true });
            }, 5000);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearInterval(state.polling);
                state.polling = null;
            } else {
                fetchDirectory(state.currentPath).then(startPolling);
            }
        });

        // Context menu event listeners
        console.log('[DEBUG] Setting up context menu event listeners for', contextMenuItems.length, 'items');
        contextMenuItems.forEach((item, index) => {
            console.log('[DEBUG] Setting up listener for context menu item', index, 'with action:', item.dataset.action);
            item.addEventListener('click', (event) => {
                const action = event.currentTarget.dataset.action;
                console.log('[DEBUG] Context menu item clicked with action:', action);
                handleContextMenuAction(action);
            });
        });

        document.addEventListener('click', (event) => {
            if (state.contextMenu.isOpen && !contextMenu.contains(event.target)) {
                closeContextMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (state.contextMenu.isOpen) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closeContextMenu();
                } else if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    const focusedItem = document.activeElement;
                    const currentIndex = Array.from(contextMenuItems).indexOf(focusedItem);
                    if (currentIndex < contextMenuItems.length - 1) {
                        contextMenuItems[currentIndex + 1].focus();
                    }
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    const focusedItem = document.activeElement;
                    const currentIndex = Array.from(contextMenuItems).indexOf(focusedItem);
                    if (currentIndex > 0) {
                        contextMenuItems[currentIndex - 1].focus();
                    }
                }
            }
        });

        // Make the file card a drop zone for the current directory
        const fileCard = document.querySelector('.file-card');
        if (fileCard) {
            fileCard.addEventListener('dragover', (event) => {
                if (state.drag.isDragging) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    fileCard.classList.add('drag-over');
                }
            });
            
            fileCard.addEventListener('dragleave', (event) => {
                // Keep highlight while dragging; only remove when drag ends or drop
                if (!state.drag.isDragging) {
                    console.log('[DEBUG] File card dragleave while not dragging - removing .drag-over');
                    fileCard.classList.remove('drag-over');
                }
            });
            
            fileCard.addEventListener('drop', (event) => {
                if (state.drag.isDragging) {
                    event.preventDefault();
                    // Prevent bubbling to body drop handler to avoid duplicate move requests
                    event.stopPropagation();
                    if (typeof event.stopImmediatePropagation === 'function') {
                        event.stopImmediatePropagation();
                    }
                    console.log('[DEBUG] File card drop - removing .drag-over');
                    fileCard.classList.remove('drag-over');
                    
                    if (state.drag.draggedItem) {
                        console.log('[DEBUG] Dropping', state.drag.draggedItem.name, 'in current directory via file card', state.currentPath);
                        // Remove body drag/drop listeners to avoid global drop firing
                        document.body.removeEventListener('dragover', handleBodyDragOver);
                        document.body.removeEventListener('drop', handleBodyDrop);
                        // Drop in the current directory
                        moveItem(state.drag.draggedItem.path, state.currentPath);
                    }
                }
            });
        }

        fetchDirectory('').then(startPolling);

// === File-type icon helpers (appended) ===

// Determine a file kind string from an extension
function fileKindFromExtension(ext) {
    const e = (ext || '').toLowerCase();

    const images = new Set(['png','jpg','jpeg','gif','webp','svg','bmp','ico','tiff','tif','avif']);
    const pdf = new Set(['pdf']);
    const code = new Set(['js','jsx','ts','tsx','php','html','htm','css','scss','less','json','xml','yml','yaml']);
    const text = new Set(['txt','md','markdown','log','ini','conf','cfg','env','csv']);
    const archives = new Set(['zip','rar','7z','tar','gz','bz2','tgz','xz']);
    const audio = new Set(['mp3','wav','flac','ogg','m4a','aac']);
    const video = new Set(['mp4','webm','mkv','mov','avi','m4v']);
    const sheets = new Set(['xls','xlsx','ods','csv']);
    const docs = new Set(['doc','docx','odt','rtf']);
    const ppts = new Set(['ppt','pptx','odp']);

    if (images.has(e)) return 'image';
    if (pdf.has(e)) return 'pdf';
    if (docs.has(e)) return 'doc';
    if (ppts.has(e)) return 'ppt';
    if (sheets.has(e)) return 'sheet';
    if (archives.has(e)) return 'archive';
    if (audio.has(e)) return 'audio';
    if (video.has(e)) return 'video';
    if (code.has(e)) return 'code';
    if (text.has(e)) return 'text';
    return 'file';
}

// SVG icons for each kind
const itemTypeIcons = {
    folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 4l2 2h7a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2h5zm11 6v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8h18z"/></svg>',
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1v5h5"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 19V5a2 2 0 0 0-2-2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2zM8.5 11.5A2.5 2.5 0 1 0 8.5 6a2.5 2.5 0 0 0 0 5.5zM5 19l5.5-7 4 5 3-4L19 19H5z"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path fill="currentColor" d="M14 2v6h6"/><path fill="currentColor" d="M7 14h2.5a1.5 1.5 0 0 0 0-3H7v3zm0 1v3h1.5v-1H10a2.5 2.5 0 1 0 0-5H7v3zm7.5-4H12v7h1.5v-2.5h1.4c1.38 0 2.6-1.12 2.6-2.5s-1.22-2-2.5-2z"/></svg>',
    code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m9.4 16.6-1.4 1.4L2 12l6-6 1.4 1.4L4.8 12l4.6 4.6zm5.2 0 1.4 1.4 6-6-6-6-1.4 1.4L19.2 12l-4.6 4.6z"/></svg>',
    archive: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 5.5l-2-2h-13l-2 2V9h17V5.5zM3.5 20.5a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V10.5h-17v10zM11 6h2v2h-2V6z"/></svg>',
    text: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm2 8h8v2H8v-2zm0 4h8v2H8v-2z"/></svg>',
    sheet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm10 7H8V5h8v4zm0 2H8v2h8v-2zm0 4H8v4h8v-4z"/></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path fill="currentColor" d="M14 2v6h6"/><path fill="currentColor" d="M7 12h10v2H7zm0 4h7v2H7z"/></svg>',
    ppt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5h18v14H3zM5 7h10v2H5zm0 4h8v2H5zm0 4h6v2H5zm12-6h3v8h-3z"/></svg>',
    audio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>',
    video: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 10.5V6c0-1.1-.9-2-2-2H5C3.9 4 3 4.9 3 6v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-4.5l4 4v-11l-4 4z"/></svg>',
};

// Get icon info { className, svg } for an item
function getItemIcon(item) {
    if (!item || !item.type) {
        return { className: 'file', svg: itemTypeIcons.file };
    }
    if (item.type === 'folder') {
        return { className: 'folder', svg: itemTypeIcons.folder };
    }
    const ext = typeof item.name === 'string' ? getFileExtension(item.name) : '';
    const kind = fileKindFromExtension(ext);
    const svg = itemTypeIcons[kind] || itemTypeIcons.file;
    return { className: `file ${kind}`, svg };
}
