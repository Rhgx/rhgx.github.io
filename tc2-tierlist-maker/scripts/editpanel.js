/**
 * Edit Panel Manager
 * Handles tier customization UI (labels, colors, add/delete tiers)
 */

import { Modal } from './modal.js';

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
        this.modal = null;
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
    }

    /**
     * Open edit panel
     */
    open() {
        this.isOpen = true;
        
        // Destroy existing modal if any
        if (this.modal) {
            this.modal.destroy();
        }
        
        this.modal = new Modal({
            title: 'Edit Tiers',
            content: this._renderContent(),
            size: 'small',
            onClose: () => {
                this.isOpen = false;
                this.onPanelClose();
            }
        });
        
        this.modal.open();
        this._bindEvents();
        this._reinitColorPicker();
    }

    /**
     * Close edit panel
     */
    close() {
        if (this.modal) {
            this.modal.close();
        }
        this.isOpen = false;
        this.onPanelClose();
    }

    /**
     * Render edit panel content HTML
     */
    _renderContent() {
        const tierConfig = this.getTierConfig();
        
        const tierRows = tierConfig.map(tier => `
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
        
        return `
            <div class="edit-tiers-list">${tierRows}</div>
            <button class="btn btn--add-tier" id="modal-add-tier-btn">+ Add Tier</button>
        `;
    }

    /**
     * Re-render the tier list content
     */
    render() {
        if (!this.modal) return;
        
        this.modal.setContent(this._renderContent());
        this._bindEvents();
        this._reinitColorPicker();
    }

    /**
     * Reinitialize Coloris for dynamically added inputs
     */
    _reinitColorPicker() {
        if (typeof Coloris !== 'undefined') {
            // Reinitialize Coloris to pick up new [data-coloris] elements
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
     * Bind edit panel events
     */
    _bindEvents() {
        if (!this.modal) return;
        
        const tierConfig = this.getTierConfig();

        // Label changes
        this.modal.querySelectorAll('.edit-tier-label').forEach(input => {
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
        this.modal.querySelectorAll('.edit-tier-color').forEach(input => {
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
        this.modal.querySelectorAll('.edit-tier-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const tierId = btn.dataset.tierId;
                this.deleteTier(tierId);
                this.render();
            });
        });
        
        // Add tier button (inside modal)
        const addBtn = this.modal.querySelector('#modal-add-tier-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addTier());
        }
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
