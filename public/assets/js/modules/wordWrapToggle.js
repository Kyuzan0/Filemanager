/**
 * Word Wrap Toggle Module
 * Handles toggling word wrap for the CodeMirror text editor
 * inside the preview dialog, with user preference persistence.
 */

// Storage key for word wrap preference
const WORD_WRAP_STORAGE_KEY = 'fileManagerWordWrap';

// Store CodeMirror editor reference for dynamic word wrap control
let codeMirrorEditor = null;

/**
 * Initialize word wrap toggle functionality
 */
export function initWordWrapToggle() {
    const previewToggleButton = document.getElementById('previewWordWrapToggle');

    if (!previewToggleButton) {
        console.warn('[WordWrap] Preview toggle button not found');
    }

    // Load saved preference
    const savedPreference = localStorage.getItem(WORD_WRAP_STORAGE_KEY);
    const isWordWrapEnabled = savedPreference === 'true';

    // Apply initial state to preview dialog
    updatePreviewWordWrapState(isWordWrapEnabled);

    // Add click event listener
    if (previewToggleButton) {
        previewToggleButton.addEventListener('click', handlePreviewWordWrapToggle);
    }

    // Store reference to CodeMirror editor for dynamic control
    if (window.CodeMirrorEditor) {
        const originalInit = window.CodeMirrorEditor.init;
        window.CodeMirrorEditor.init = async function(container, content, filename, onChange) {
            const result = await originalInit.call(this, container, content, filename, onChange);
            if (result && result.state) {
                codeMirrorEditor = result;
                applyCodeMirrorWordWrap(isWordWrapEnabled);
            }
            return result;
        };
    }

    console.log('[WordWrap] Initialized with state:', isWordWrapEnabled);
}

/**
 * Handle preview word wrap toggle button click
 */
function handlePreviewWordWrapToggle() {
    const previewDialog = document.querySelector('.preview-dialog');
    const toggleButton = document.getElementById('previewWordWrapToggle');

    if (!previewDialog || !toggleButton) {
        return;
    }

    const isCurrentlyEnabled = previewDialog.classList.contains('word-wrap-enabled');
    const newState = !isCurrentlyEnabled;

    updatePreviewWordWrapState(newState);
    applyCodeMirrorWordWrap(newState);

    // Save preference
    localStorage.setItem(WORD_WRAP_STORAGE_KEY, newState.toString());

    // Show feedback
    showWordWrapFeedback(newState);

    console.log('[WordWrap] Toggled to:', newState);
}

/**
 * Update word wrap state in the UI for preview dialog
 * @param {boolean} isEnabled - Whether word wrap should be enabled
 */
function updatePreviewWordWrapState(isEnabled) {
    const previewDialog = document.querySelector('.preview-dialog');
    const previewToggleButton = document.getElementById('previewWordWrapToggle');

    if (previewDialog && previewToggleButton) {
        if (isEnabled) {
            previewDialog.classList.add('word-wrap-enabled');
            previewToggleButton.classList.add('active');
            previewToggleButton.innerHTML = '<i class="ri-text"></i><span class="hidden sm:inline text-xs">No Wrap</span>';
            previewToggleButton.title = 'Disable Word Wrap';
        } else {
            previewDialog.classList.remove('word-wrap-enabled');
            previewToggleButton.classList.remove('active');
            previewToggleButton.innerHTML = '<i class="ri-text-wrap"></i><span class="hidden sm:inline text-xs">Wrap</span>';
            previewToggleButton.title = 'Enable Word Wrap';
        }
    }
}

/**
 * Show visual feedback when word wrap state changes
 * @param {boolean} isEnabled - Whether word wrap was enabled
 */
function showWordWrapFeedback(isEnabled) {
    if (typeof window.showToast === 'function') {
        const message = isEnabled ? 'Word wrap enabled' : 'Word wrap disabled';
        const type = isEnabled ? 'success' : 'info';
        window.showToast(type, message);
    } else {
        const notification = document.createElement('div');
        notification.className = `word-wrap-notification ${isEnabled ? 'enabled' : 'disabled'}`;
        notification.textContent = isEnabled ? 'Word wrap enabled' : 'Word wrap disabled';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${isEnabled ? 'var(--accent)' : 'var(--muted)'};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }
}

/**
 * Get current word wrap state
 * @returns {boolean} Whether word wrap is currently enabled
 */
export function getWordWrapState() {
    const savedPreference = localStorage.getItem(WORD_WRAP_STORAGE_KEY);
    return savedPreference === 'true';
}

/**
 * Set word wrap state programmatically
 * @param {boolean} isEnabled - Whether word wrap should be enabled
 */
export function setWordWrapState(isEnabled) {
    updatePreviewWordWrapState(isEnabled);
    applyCodeMirrorWordWrap(isEnabled);
    localStorage.setItem(WORD_WRAP_STORAGE_KEY, isEnabled.toString());
    showWordWrapFeedback(isEnabled);
}

/**
 * Sync preview dialog word wrap state with saved preference
 */
export function syncPreviewWordWrapState() {
    const isEnabled = getWordWrapState();
    updatePreviewWordWrapState(isEnabled);
    applyCodeMirrorWordWrap(isEnabled);
}

/**
 * Apply word wrap state to CodeMirror editor
 * @param {boolean} isEnabled - Whether word wrap should be enabled
 */
function applyCodeMirrorWordWrap(isEnabled) {
    if (!codeMirrorEditor) {
        const cmContainer = document.querySelector('.cm-editor');
        if (cmContainer && cmContainer.cmView) {
            codeMirrorEditor = cmContainer.cmView;
        } else {
            return;
        }
    }

    try {
        const { EditorView } = codeMirrorEditor.constructor.module || {};

        if (isEnabled) {
            codeMirrorEditor.dispatch({
                effects: [EditorView.lineWrapping.of(true)]
            });
        } else {
            codeMirrorEditor.dispatch({
                effects: [EditorView.lineWrapping.of(false)]
            });
        }

        console.log('[WordWrap] CodeMirror word wrap set to:', isEnabled);
    } catch (error) {
        // Fallback: manipulate CSS directly
        const cmContent = document.querySelector('.cm-content');
        const cmLines = document.querySelectorAll('.cm-line');

        if (cmContent) {
            if (isEnabled) {
                cmContent.style.whiteSpace = 'pre-wrap';
                cmContent.style.wordWrap = 'break-word';
                cmContent.style.overflowWrap = 'break-word';
                cmContent.style.wordBreak = 'break-word';
            } else {
                cmContent.style.whiteSpace = 'pre';
                cmContent.style.wordWrap = 'normal';
                cmContent.style.overflowWrap = 'normal';
                cmContent.style.wordBreak = 'normal';
            }
        }

        cmLines.forEach(line => {
            if (isEnabled) {
                line.style.whiteSpace = 'pre-wrap';
                line.style.wordWrap = 'break-word';
                line.style.overflowWrap = 'break-word';
                line.style.wordBreak = 'break-word';
            } else {
                line.style.whiteSpace = 'pre';
                line.style.wordWrap = 'normal';
                line.style.overflowWrap = 'normal';
                line.style.wordBreak = 'normal';
            }
        });
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWordWrapToggle);
} else {
    initWordWrapToggle();
}
