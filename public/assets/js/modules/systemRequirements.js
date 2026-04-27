/**
 * System Requirements Handler
 * Handles system requirements checking and display in settings modal
 */

const SystemRequirements = {
    isLoading: false,
    data: null,

    /**
     * Initialize the system requirements handler
     */
    init() {
        this.bindEvents();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Tab switching
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.handleTabClick(e));
        });

        // Refresh button
        const refreshBtn = document.getElementById('system-req-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadRequirements());
        }
    },

    /**
     * Handle tab click
     */
    handleTabClick(e) {
        const tab = e.currentTarget;
        const tabName = tab.dataset.tab;

        // Update tab states
        document.querySelectorAll('.settings-tab').forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
            t.style.borderBottomColor = 'transparent';
            t.style.color = '';
        });

        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        tab.style.borderBottomColor = 'var(--accent, #3b82f6)';
        tab.style.color = 'var(--accent, #3b82f6)';

        // Show/hide panels
        document.querySelectorAll('.settings-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        const targetPanel = document.getElementById(`settings-panel-${tabName}`);
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
        }

        // Load requirements when system tab is clicked
        if (tabName === 'system' && !this.data) {
            this.loadRequirements();
        }
    },

    /**
     * Load system requirements from API
     */
    async loadRequirements() {
        if (this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.showLoading(true);

        try {
            const response = await fetch('api.php?action=system-requirements');
            const data = await response.json();

            if (data.success) {
                this.data = data.requirements;
                this.renderRequirements(data.requirements);
            } else {
                this.showError('Gagal memuat data: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            this.showError('Gagal terhubung ke server');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    },

    /**
     * Show/hide loading state
     */
    showLoading(show) {
        const loading = document.getElementById('system-req-loading');
        const content = document.getElementById('system-req-content');

        if (loading) {
            loading.classList.toggle('hidden', !show);
        }
        if (content) {
            content.classList.toggle('hidden', show);
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        const content = document.getElementById('system-req-content');
        if (content) {
            content.innerHTML = `
                <div class="sysreq-error">
                    <svg class="sysreq-error-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <p class="sysreq-error-text">${message}</p>
                    <button type="button" onclick="SystemRequirements.loadRequirements()" 
                        class="sysreq-retry-btn">
                        Coba Lagi
                    </button>
                </div>
            `;
        }
    },

    /**
     * Render requirements data
     */
    renderRequirements(requirements) {
        // PHP Version
        this.updateRequirementItem('php', requirements.php);

        // PHP Extensions
        this.updateRequirementItem('ext', requirements.extensions);

        // 7-Zip
        this.updateRequirementItem('7zip', requirements['7zip']);

        // Permissions
        this.updateRequirementItem('perms', requirements.permissions);

        // Server
        this.updateRequirementItem('server', requirements.server);
    },

    /**
     * Update a requirement item in the UI
     */
    updateRequirementItem(id, data) {
        const statusEl = document.getElementById(`req-${id}-status`);
        const detailEl = document.getElementById(`req-${id}-detail`);
        const iconEl = document.getElementById(`req-${id}-icon`);

        if (!data) {
            return;
        }

        // Update status badge
        if (statusEl) {
            const isOptional = data.optional === true;

            if (data.ok) {
                statusEl.textContent = '✓ OK';
                statusEl.className = 'req-status req-status--ok';
            } else if (isOptional) {
                statusEl.textContent = 'Opsional';
                statusEl.className = 'req-status req-status--warning';
            } else {
                statusEl.textContent = '✕ Error';
                statusEl.className = 'req-status req-status--error';
            }
        }

        // Update detail text
        if (detailEl) {
            detailEl.textContent = data.detail || '';

            // Add extra info for 7-Zip
            if (id === '7zip' && data.path) {
                detailEl.textContent += ` | Path: ${data.path}`;
            }

            // Add extra info for server
            if (id === 'server') {
                const info = [];
                if (data.maxUpload) {
                    info.push(`Upload: ${data.maxUpload}`);
                }
                if (data.maxPost) {
                    info.push(`POST: ${data.maxPost}`);
                }
                if (data.memoryLimit) {
                    info.push(`Memory: ${data.memoryLimit}`);
                }
                detailEl.textContent = info.join(' | ') || data.detail;
            }
        }

        // Update icon color
        if (iconEl) {
            const isOptional = data.optional === true;

            if (data.ok) {
                iconEl.className = 'req-icon req-icon--ok';
            } else if (isOptional) {
                iconEl.className = 'req-icon req-icon--warning';
            } else {
                iconEl.className = 'req-icon req-icon--error';
            }
        }
    },

    /**
     * Reset tab to General when modal closes
     */
    resetTabs() {
        const generalTab = document.getElementById('settings-tab-general');
        if (generalTab) {
            generalTab.click();
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SystemRequirements.init());
} else {
    SystemRequirements.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemRequirements;
}

// Make available globally
window.SystemRequirements = SystemRequirements;
