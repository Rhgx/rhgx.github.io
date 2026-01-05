/**
 * Main Application Entry Point
 */

import { GridShader } from './shader.js';
import { TierlistManager } from './tierlist.js';
import { DragDropManager } from './dragdrop.js';
import { Animations } from './animations.js';

// Default tier configuration
const DEFAULT_TIERS = [
    { id: 'S', label: 'S', color: '#ff7f7e' },
    { id: 'A', label: 'A', color: '#ffbf7f' },
    { id: 'B', label: 'B', color: '#ffd180' },
    { id: 'C', label: 'C', color: '#feff7f' },
    { id: 'D', label: 'D', color: '#beff7f' },
    { id: 'E', label: 'E', color: '#7eff80' },
    { id: 'F', label: 'F', color: '#7fffff' }
];

// Preset swatches for color picker
const COLOR_SWATCHES = [
    '#ff7f7e', '#ffbf7f', '#ffd180', '#feff7f', '#beff7f', '#97ef80',
    '#7fff7f', '#7fffff', '#7fbfff', '#807fff', '#ff7fbe', '#bf7fbe',
    '#3b3b3b', '#858585', '#c1c1c1', '#f7f7f7'
];

class TierlistApp {
    constructor() {
        this.tierlistManager = new TierlistManager();
        this.dragDropManager = null;
        this.animations = null;
        this.currentTierlist = null;
        this.tierConfig = [...DEFAULT_TIERS];
        this.tiers = {};
        this.tierIdCounter = 0;
        this.editPanelOpen = false;
    }
    
    async init() {
        // Initialize WebGL shader background
        const canvas = document.getElementById('shader-canvas');
        if (canvas) {
            new GridShader(canvas);
        }
        
        // Initialize Coloris
        this.initColorPicker();
        
        // Initialize animations
        this.animations = new Animations();
        
        // Initialize tierlist manager
        await this.tierlistManager.init();
        
        // Setup menu buttons
        this.setupMenuButtons();
        
        // Initialize drag/drop
        this.dragDropManager = new DragDropManager({
            onItemMoved: (data) => this.handleItemMoved(data)
        });
        this.dragDropManager.init();
        
        // Setup action buttons
        this.setupActionButtons();
        
        // Animate menu on load
        this.animations.animateMenu();
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
     * Setup tierlist selection buttons in main menu
     */
    setupMenuButtons() {
        const container = document.getElementById('tierlist-buttons');
        if (!container) return;
        
        const tierlists = this.tierlistManager.getTierlists();
        
        container.innerHTML = tierlists.map(tl => 
            `<button class="menu__btn" data-tierlist-id="${tl.id}">${tl.name}</button>`
        ).join('');
        
        // Add click handlers
        container.querySelectorAll('.menu__btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.tierlistId;
                this.openTierlist(id);
            });
        });
    }
    
    /**
     * Navigate to tierlist view
     */
    openTierlist(tierlistId) {
        const data = this.tierlistManager.loadTierlist(tierlistId);
        if (!data) return;
        
        this.currentTierlist = data;
        
        // Reset tier config to defaults
        this.tierConfig = DEFAULT_TIERS.map(t => ({ ...t }));
        this.tierIdCounter = 0;
        
        // Initialize tiers from saved data or fresh
        this.tiers = {};
        this.tierConfig.forEach(t => {
            this.tiers[t.id] = data.tiers[t.id] || [];
        });
        this.tiers.pool = data.tiers.pool || [];
        
        // Update title
        const title = document.getElementById('tierlist-title');
        if (title) title.textContent = data.name;
        
        // Render tier rows (clean, no inline controls)
        this.renderTierRows();
        this.render();
        
        // Animate transition
        this.animations.transitionToTierlist();
    }
    
    /**
     * Generate unique tier ID
     */
    generateTierId() {
        return `tier_${++this.tierIdCounter}_${Date.now()}`;
    }
    
    /**
     * Render dynamic tier rows (clean version for drag/drop)
     */
    renderTierRows() {
        const container = document.getElementById('tier-container');
        if (!container) return;
        
        container.innerHTML = this.tierConfig.map(tier => `
            <div class="tier-row" data-tier="${tier.id}">
                <div class="tier-label" style="background: ${tier.color}; color: #1a1a1a;">
                    ${tier.label}
                </div>
                <div class="tier-items"></div>
            </div>
        `).join('');
        
        // Refresh drag/drop for new elements
        this.dragDropManager.refresh();
    }
    
    /**
     * Open edit panel
     */
    openEditPanel() {
        this.editPanelOpen = true;
        const panel = document.getElementById('edit-panel');
        if (panel) {
            panel.style.display = 'flex';
            this.renderEditPanel();
        }
    }
    
    /**
     * Close edit panel
     */
    closeEditPanel() {
        this.editPanelOpen = false;
        const panel = document.getElementById('edit-panel');
        if (panel) {
            panel.style.display = 'none';
        }
        
        // Re-render tier rows with updated config
        this.renderTierRows();
        this.render();
    }
    
    /**
     * Render edit panel tier list
     */
    renderEditPanel() {
        const list = document.getElementById('edit-tiers-list');
        if (!list) return;
        
        list.innerHTML = this.tierConfig.map(tier => `
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
                       maxlength="5"
                       placeholder="Label">
                <button class="edit-tier-delete" data-tier-id="${tier.id}" title="Delete tier">×</button>
            </div>
        `).join('');
        
        this.bindEditPanelEvents();
    }
    
    /**
     * Bind edit panel events
     */
    bindEditPanelEvents() {
        // Label changes
        document.querySelectorAll('.edit-tier-label').forEach(input => {
            input.addEventListener('change', (e) => {
                const tierId = e.target.dataset.tierId;
                this.updateTierLabel(tierId, e.target.value);
            });
        });
        
        // Color changes (via Coloris)
        document.querySelectorAll('.edit-tier-color').forEach(input => {
            input.addEventListener('change', (e) => {
                const tierId = e.target.dataset.tierId;
                const color = e.target.value;
                this.updateTierColor(tierId, color);
                e.target.style.background = color;
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.edit-tier-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const tierId = btn.dataset.tierId;
                this.deleteTier(tierId);
                this.renderEditPanel();
            });
        });
    }
    
    /**
     * Update tier label
     */
    updateTierLabel(tierId, label) {
        const tier = this.tierConfig.find(t => t.id === tierId);
        if (tier) {
            tier.label = label || tier.id;
        }
    }
    
    /**
     * Update tier color
     */
    updateTierColor(tierId, color) {
        const tier = this.tierConfig.find(t => t.id === tierId);
        if (tier) {
            tier.color = color;
        }
    }
    
    /**
     * Add new tier
     */
    addTier() {
        const newId = this.generateTierId();
        const newTier = {
            id: newId,
            label: '?',
            color: '#858585'
        };
        
        this.tierConfig.push(newTier);
        this.tiers[newId] = [];
        
        if (this.editPanelOpen) {
            this.renderEditPanel();
        } else {
            this.renderTierRows();
            this.render();
        }
    }
    
    /**
     * Delete tier and move items to pool
     */
    deleteTier(tierId) {
        // Don't delete if only one tier left
        if (this.tierConfig.length <= 1) return;
        
        // Move items to pool
        const items = this.tiers[tierId] || [];
        this.tiers.pool = [...this.tiers.pool, ...items];
        delete this.tiers[tierId];
        
        // Remove from config
        this.tierConfig = this.tierConfig.filter(t => t.id !== tierId);
    }
    
    /**
     * Navigate back to menu
     */
    goToMenu() {
        if (this.editPanelOpen) {
            this.closeEditPanel();
        }
        this.animations.transitionToMenu();
    }
    
    render() {
        this.tierConfig.forEach(tier => {
            const container = document.querySelector(`#tierlist-view [data-tier="${tier.id}"] .tier-items`);
            if (container) {
                container.innerHTML = this.renderItems(this.tiers[tier.id] || []);
            }
        });
        
        const poolContainer = document.querySelector('#tierlist-view .pool-items');
        if (poolContainer) {
            poolContainer.innerHTML = this.renderItems(this.tiers.pool || []);
        }
        
        this.dragDropManager.refresh();
    }
    
    renderItems(itemIds) {
        const tierlistId = this.currentTierlist?.id || '';
        
        return itemIds.map(id => {
            const img = this.tierlistManager.getImageById(id);
            if (!img) return '';
            
            const fullSrc = `./tierlists/${tierlistId}/${img.src}`;
            
            return `
                <div class="tier-item" data-id="${img.id}" data-name="${img.name}">
                    <img src="${fullSrc}" alt="${img.name}" loading="lazy">
                </div>
            `;
        }).join('');
    }
    
    handleItemMoved(data) {
        const newTiers = { pool: [] };
        
        // Collect items from all current tier rows
        this.tierConfig.forEach(tier => {
            const container = document.querySelector(`#tierlist-view [data-tier="${tier.id}"] .tier-items`);
            if (container) {
                newTiers[tier.id] = [...container.querySelectorAll('.tier-item')]
                    .map(el => el.dataset.id);
            }
        });
        
        // Collect pool items
        const poolContainer = document.querySelector('#tierlist-view .pool-items');
        if (poolContainer) {
            newTiers.pool = [...poolContainer.querySelectorAll('.tier-item')]
                .map(el => el.dataset.id);
        }
        
        this.tiers = newTiers;
        
        // Save
        if (this.currentTierlist) {
            this.tierlistManager.saveRankings(this.currentTierlist.id, this.tiers);
        }
    }
    
    setupActionButtons() {
        // Back button
        document.getElementById('back-btn')?.addEventListener('click', () => this.goToMenu());
        
        // Edit mode button
        document.getElementById('edit-mode-btn')?.addEventListener('click', () => this.openEditPanel());
        
        // Close edit panel
        document.getElementById('close-edit-btn')?.addEventListener('click', () => this.closeEditPanel());
        
        // Add tier (in edit panel)
        document.getElementById('add-tier-edit-btn')?.addEventListener('click', () => this.addTier());
        
        // Reset button
        document.getElementById('reset-btn')?.addEventListener('click', () => this.resetTierlist());
        
        // Screenshot button
        document.getElementById('screenshot-btn')?.addEventListener('click', () => this.takeScreenshot());
    }
    
    resetTierlist() {
        if (!this.currentTierlist) return;
        this.tierlistManager.resetRankings(this.currentTierlist.id);
        this.openTierlist(this.currentTierlist.id);
    }
    
    /**
     * Take screenshot using Canvas 2D API
     */
    async takeScreenshot() {
        if (!this.currentTierlist) return;
        
        const LABEL_WIDTH = 70;
        const ROW_HEIGHT = 70;
        const ITEM_SIZE = 60;
        const GAP = 4;
        const PADDING = 12;
        const CANVAS_WIDTH = 1200;
        
        const tierlistId = this.currentTierlist.id;
        const totalHeight = this.tierConfig.length * (ROW_HEIGHT + GAP) - GAP + PADDING * 2;
        
        const mainCanvas = document.createElement('canvas');
        mainCanvas.width = CANVAS_WIDTH * 2;
        mainCanvas.height = totalHeight * 2;
        const ctx = mainCanvas.getContext('2d');
        ctx.scale(2, 2);
        
        ctx.fillStyle = '#414254';
        ctx.fillRect(0, 0, CANVAS_WIDTH, totalHeight);
        
        let y = PADDING;
        
        for (const tier of this.tierConfig) {
            const gradient = ctx.createLinearGradient(0, y, 0, y + ROW_HEIGHT);
            gradient.addColorStop(0, '#2B2C35');
            gradient.addColorStop(0.5, '#30313C');
            gradient.addColorStop(1, '#26262F');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(PADDING, y, CANVAS_WIDTH - PADDING * 2, ROW_HEIGHT, 4);
            ctx.fill();
            
            ctx.fillStyle = tier.color;
            ctx.beginPath();
            ctx.roundRect(PADDING, y, LABEL_WIDTH, ROW_HEIGHT, [4, 0, 0, 4]);
            ctx.fill();
            
            ctx.fillStyle = '#1a1a1a';
            ctx.font = 'bold 28px Oswald, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tier.label, PADDING + LABEL_WIDTH / 2, y + ROW_HEIGHT / 2);
            
            ctx.strokeStyle = '#8E8A75';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(PADDING + LABEL_WIDTH, y);
            ctx.lineTo(PADDING + LABEL_WIDTH, y + ROW_HEIGHT);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.roundRect(PADDING, y, CANVAS_WIDTH - PADDING * 2, ROW_HEIGHT, 4);
            ctx.stroke();
            
            const items = this.tiers[tier.id] || [];
            let x = PADDING + LABEL_WIDTH + GAP;
            
            for (const itemId of items) {
                const imgData = this.tierlistManager.getImageById(itemId);
                if (!imgData) continue;
                
                const fullSrc = `./tierlists/${tierlistId}/${imgData.src}`;
                
                try {
                    const img = await this.loadImage(fullSrc);
                    
                    ctx.fillStyle = '#26262F';
                    ctx.beginPath();
                    ctx.roundRect(x, y + (ROW_HEIGHT - ITEM_SIZE) / 2, ITEM_SIZE, ITEM_SIZE, 3);
                    ctx.fill();
                    
                    ctx.strokeStyle = '#8E8A75';
                    ctx.beginPath();
                    ctx.roundRect(x, y + (ROW_HEIGHT - ITEM_SIZE) / 2, ITEM_SIZE, ITEM_SIZE, 3);
                    ctx.stroke();
                    
                    ctx.drawImage(img, x + 2, y + (ROW_HEIGHT - ITEM_SIZE) / 2 + 2, ITEM_SIZE - 4, ITEM_SIZE - 4);
                    
                    x += ITEM_SIZE + GAP;
                } catch (e) {
                    x += ITEM_SIZE + GAP;
                }
            }
            
            y += ROW_HEIGHT + GAP;
        }
        
        const link = document.createElement('a');
        link.download = `tierlist-${this.currentTierlist.id}.png`;
        link.href = mainCanvas.toDataURL('image/png');
        link.click();
    }
    
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new TierlistApp();
    app.init();
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

export { TierlistApp };
