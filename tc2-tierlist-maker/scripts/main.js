/**
 * Main Application Entry Point
 */

import { GridShader } from './shader.js';
import { TierlistManager } from './tierlist.js';
import { DragDropManager } from './dragdrop.js';
import { Animations } from './animations.js';
import { ScreenshotManager } from './screenshot.js';
import { EditPanelManager } from './editpanel.js';

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

class TierlistApp {
    constructor() {
        this.tierlistManager = new TierlistManager();
        this.dragDropManager = null;
        this.animations = null;
        this.currentTierlist = null;
        this.tierConfig = [...DEFAULT_TIERS];
        this.tiers = {};
        this.tierIdCounter = 0;
        
        // Initialize managers
        this.screenshotManager = new ScreenshotManager({
            getCurrentTierlist: () => this.currentTierlist,
            onAfterCapture: () => {
                this.renderTierRows();
                this.render();
            }
        });
        
        this.editPanelManager = new EditPanelManager({
            getTierConfig: () => this.tierConfig,
            getTiers: () => this.tiers,
            generateTierId: () => this.generateTierId(),
            onTierConfigChange: () => {
                if (!this.editPanelManager.isOpen) {
                    this.renderTierRows();
                    this.render();
                }
            },
            onPanelClose: () => {
                this.renderTierRows();
                this.render();
            }
        });
    }
    
    async init() {
        // Initialize WebGL shader background
        const canvas = document.getElementById('shader-canvas');
        if (canvas) {
            new GridShader(canvas);
        }
        
        // Initialize color picker (via EditPanelManager)
        this.editPanelManager.initColorPicker();
        
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
     * Setup tierlist selection buttons in main menu
     */
    setupMenuButtons() {
        const container = document.getElementById('tierlist-buttons');
        if (!container) return;
        
        const tierlists = this.tierlistManager.getTierlists();
        
        container.innerHTML = tierlists.map(tl => 
            `<button class="menu__btn" data-tierlist-id="${tl.id}">${tl.name}</button>`
        ).join('');
        
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
    async openTierlist(tierlistId) {
        this.showLoading();
        
        const data = this.tierlistManager.loadTierlist(tierlistId);
        if (!data) {
            this.hideLoading();
            return;
        }
        
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
        
        // Preload all images
        await this.preloadImages(tierlistId, data.images);
        
        // Update title
        const title = document.getElementById('tierlist-title');
        if (title) title.textContent = data.name;
        
        // Render tier rows
        this.renderTierRows();
        this.render();
        
        this.hideLoading();
        this.animations.transitionToTierlist();
    }
    
    /**
     * Show loading overlay
     */
    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'flex';
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }
    
    /**
     * Preload all images for a tierlist
     */
    async preloadImages(tierlistId, images) {
        const promises = images.map(img => {
            return new Promise((resolve) => {
                const image = new Image();
                image.onload = resolve;
                image.onerror = resolve;
                image.src = `./tierlists/${tierlistId}/${img.src}`;
            });
        });
        
        await Promise.race([
            Promise.all(promises),
            new Promise(resolve => setTimeout(resolve, 10000))
        ]);
    }
    
    /**
     * Generate unique tier ID
     */
    generateTierId() {
        return `tier_${++this.tierIdCounter}_${Date.now()}`;
    }
    
    /**
     * Calculate font size based on label length
     */
    calculateLabelFontSize(label) {
        const len = label.length;
        if (len <= 2) return '2rem';
        if (len <= 4) return '1.5rem';
        if (len <= 8) return '1rem';
        if (len <= 12) return '0.8rem';
        if (len <= 18) return '0.65rem';
        return '0.55rem';
    }
    
    /**
     * Render dynamic tier rows
     */
    renderTierRows() {
        const container = document.getElementById('tier-container');
        if (!container) return;
        
        container.innerHTML = this.tierConfig.map(tier => {
            const fontSize = this.calculateLabelFontSize(tier.label);
            return `
            <div class="tier-row" data-tier="${tier.id}">
                <div class="tier-label" style="background: ${tier.color}; color: #1a1a1a; font-size: ${fontSize};">
                    ${tier.label}
                </div>
                <div class="tier-items"></div>
            </div>
        `}).join('');
        
        this.dragDropManager.refresh();
    }
    
    /**
     * Navigate back to menu
     */
    goToMenu() {
        if (this.editPanelManager.isOpen) {
            this.editPanelManager.close();
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
        
        this.tierConfig.forEach(tier => {
            const container = document.querySelector(`#tierlist-view [data-tier="${tier.id}"] .tier-items`);
            if (container) {
                newTiers[tier.id] = [...container.querySelectorAll('.tier-item')]
                    .map(el => el.dataset.id);
            }
        });
        
        const poolContainer = document.querySelector('#tierlist-view .pool-items');
        if (poolContainer) {
            newTiers.pool = [...poolContainer.querySelectorAll('.tier-item')]
                .map(el => el.dataset.id);
        }
        
        this.tiers = newTiers;
        
        if (this.currentTierlist) {
            this.tierlistManager.saveRankings(this.currentTierlist.id, this.tiers);
        }
    }
    
    setupActionButtons() {
        // Back button
        document.getElementById('back-btn')?.addEventListener('click', () => this.goToMenu());
        
        // Reset button
        document.getElementById('reset-btn')?.addEventListener('click', () => this.resetTierlist());
        
        // Setup managers' event listeners
        this.screenshotManager.setupEventListeners();
        this.editPanelManager.setupEventListeners();
    }
    
    resetTierlist() {
        if (!this.currentTierlist) return;
        this.tierlistManager.resetRankings(this.currentTierlist.id);
        this.openTierlist(this.currentTierlist.id);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new TierlistApp();
    app.init();
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

export { TierlistApp };
