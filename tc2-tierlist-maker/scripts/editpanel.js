/**
 * Edit Panel Manager
 * Handles tier customization UI (labels, colors, add/delete tiers)
 */

// Preset swatches for color picker
const COLOR_SWATCHES = [
    '#ff7f7e', '#ffbf7f', '#ffd180', '#feff7f', '#beff7f', '#97ef80',
    '#7fff7f', '#7fffff', '#7fbfff', '#807fff', '#ff7fbe', '#bf7fbe',
    '#3b3b3b', '#858585', '#c1c1c1', '#f7f7f7'
];

class EditPanelManager {
    constructor(options = {}) {
        this.getTierConfig = options.getTierConfig || (() => []);
        this.getTiers = options.getTiers || (() => ({}));
        this.generateTierId = options.generateTierId || (() => `tier_${Date.now()}`);
        this.onTierConfigChange = options.onTierConfigChange || (() => {});
        this.onPanelClose = options.onPanelClose || (() => {});
        this.isOpen = false;
    }

    /**
     * Initialize Coloris color picker with preset swatches
     */
    initColorPicker() {
        if (typeof Coloris !== 'undefined') {
            Coloris({
                el: '.edit-tier-color',
                swatches: COLOR_SWATCHES,
                theme: 'polaroid',
                themeMode: 'dark',
                alpha: false,
                formatToggle: false,
                closeButton: true,
                closeLabel: 'Done'
            });
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.getElementById('edit-mode-btn')?.addEventListener('click', () => this.open());
        document.getElementById('close-edit-btn')?.addEventListener('click', () => this.close());
        document.getElementById('add-tier-edit-btn')?.addEventListener('click', () => this.addTier());
    }

    /**
     * Open edit panel
     */
    open() {
        this.isOpen = true;
        const panel = document.getElementById('edit-panel');
        if (panel) {
            panel.style.display = 'flex';
            this.render();
        }
    }

    /**
     * Close edit panel
     */
    close() {
        this.isOpen = false;
        const panel = document.getElementById('edit-panel');
        if (panel) {
            panel.style.display = 'none';
        }
        this.onPanelClose();
    }

    /**
     * Render edit panel tier list
     */
    render() {
        const list = document.getElementById('edit-tiers-list');
        if (!list) return;

        const tierConfig = this.getTierConfig();

        list.innerHTML = tierConfig.map(tier => `
            <div class="edit-tier-row" data-tier-id="${tier.id}">
                <input type="text" 
                       class="edit-tier-color" 
                       value="${tier.color}"
                       data-tier-id="${tier.id}"
                       data-coloris
                       style="background: ${tier.color}; color: transparent; cursor: pointer;">
                <input type="text" 
                       class="edit-tier-label" 
                       value="${tier.label}"
                       data-tier-id="${tier.id}"
                       maxlength="25"
                       placeholder="Label">
                <button class="edit-tier-delete" data-tier-id="${tier.id}" title="Delete tier">×</button>
            </div>
        `).join('');

        this.bindEvents();
    }

    /**
     * Bind edit panel events
     */
    bindEvents() {
        const tierConfig = this.getTierConfig();

        // Label changes
        document.querySelectorAll('.edit-tier-label').forEach(input => {
            input.addEventListener('change', (e) => {
                const tierId = e.target.dataset.tierId;
                const tier = tierConfig.find(t => t.id === tierId);
                if (tier) {
                    tier.label = e.target.value || tier.id;
                    this.onTierConfigChange();
                }
            });
        });

        // Color changes (via Coloris)
        document.querySelectorAll('.edit-tier-color').forEach(input => {
            input.addEventListener('change', (e) => {
                const tierId = e.target.dataset.tierId;
                const color = e.target.value;
                const tier = tierConfig.find(t => t.id === tierId);
                if (tier) {
                    tier.color = color;
                    e.target.style.background = color;
                    this.onTierConfigChange();
                }
            });
        });

        // Delete buttons
        document.querySelectorAll('.edit-tier-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const tierId = btn.dataset.tierId;
                this.deleteTier(tierId);
                this.render();
            });
        });
    }

    /**
     * Add new tier
     */
    addTier() {
        const tierConfig = this.getTierConfig();
        const tiers = this.getTiers();
        const newId = this.generateTierId();
        
        const newTier = {
            id: newId,
            label: '?',
            color: '#858585'
        };

        tierConfig.push(newTier);
        tiers[newId] = [];

        if (this.isOpen) {
            this.render();
        }
        
        this.onTierConfigChange();
    }

    /**
     * Delete tier and move items to pool
     */
    deleteTier(tierId) {
        const tierConfig = this.getTierConfig();
        const tiers = this.getTiers();

        // Don't delete if only one tier left
        if (tierConfig.length <= 1) return;

        // Move items to pool
        const items = tiers[tierId] || [];
        tiers.pool = [...(tiers.pool || []), ...items];
        delete tiers[tierId];

        // Remove from config
        const index = tierConfig.findIndex(t => t.id === tierId);
        if (index !== -1) {
            tierConfig.splice(index, 1);
        }

        this.onTierConfigChange();
    }
}

export { EditPanelManager };
