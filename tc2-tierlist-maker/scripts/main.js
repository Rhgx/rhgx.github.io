/**
 * Main Application Entry Point
 */

import { toPng } from 'https://esm.sh/html-to-image';
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
    async openTierlist(tierlistId) {
        // Show loading overlay
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
        
        // Render tier rows (clean, no inline controls)
        this.renderTierRows();
        this.render();
        
        // Hide loading overlay
        this.hideLoading();
        
        // Animate transition
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
                image.onerror = resolve; // Continue even if image fails
                image.src = `./tierlists/${tierlistId}/${img.src}`;
            });
        });
        
        // Wait for all images with a timeout of 10 seconds
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
     * Calculate font size based on label length for tier labels
     */
    calculateLabelFontSize(label) {
        const len = label.length;
        if (len <= 2) return '2rem';     // Original size for short labels
        if (len <= 4) return '1.5rem';
        if (len <= 8) return '1rem';
        if (len <= 12) return '0.8rem';
        if (len <= 18) return '0.65rem';
        return '0.55rem';                // Very long labels
    }
    
    /**
     * Render dynamic tier rows (clean version for drag/drop)
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
                       maxlength="25"
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
        
        // Modal buttons
        document.getElementById('close-screenshot-btn')?.addEventListener('click', () => this.closeScreenshotModal());
        document.getElementById('download-screenshot-btn')?.addEventListener('click', () => this.downloadScreenshot());
    }
    
    resetTierlist() {
        if (!this.currentTierlist) return;
        this.tierlistManager.resetRankings(this.currentTierlist.id);
        this.openTierlist(this.currentTierlist.id);
    }
    
    /**
     * Take screenshot using html-to-image
     */
    async takeScreenshot() {
        if (!this.currentTierlist) return;
        
        const sourceElement = document.getElementById('tier-container');
        if (!sourceElement) return;
        
        // Create export container
        const exportContainer = document.createElement('div');
        exportContainer.className = 'screenshot-container';
        
        // Clone the tier container
        const clonedTiers = sourceElement.cloneNode(true);
        
        // CRITICAL: Remove all IDs from the clone to avoid conflicts with main app
        const nodesWithIds = clonedTiers.querySelectorAll('[id]');
        nodesWithIds.forEach(node => node.removeAttribute('id'));
        if (clonedTiers.id) clonedTiers.removeAttribute('id');
        
        exportContainer.appendChild(clonedTiers);
        document.body.appendChild(exportContainer);
        
        try {
            document.body.style.cursor = 'wait';
            
            // Wait a tick for DOM to settle
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const dataUrl = await toPng(exportContainer, {
                backgroundColor: '#414254',
                pixelRatio: 1.3, // High quality (1.3x)
                style: {
                    transform: 'none',
                }
            });
            
            // Show modal instead of auto-download
            this.showScreenshotModal(dataUrl);
            
        } catch (error) {
            console.error('Screenshot failed:', error);
            alert('Failed to take screenshot. Please try again.');
        } finally {
            document.body.removeChild(exportContainer);
            document.body.style.cursor = 'default';
        }
    }

    showScreenshotModal(dataUrl) {
        const modal = document.getElementById('screenshot-modal');
        const img = document.getElementById('screenshot-preview');
        const downloadBtn = document.getElementById('download-screenshot-btn');
        
        if (modal && img && downloadBtn) {
            img.src = dataUrl;
            // Store data URL for download button
            downloadBtn.dataset.url = dataUrl; 
            modal.classList.add('active');
            
            // Re-initialize icons just in case
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    closeScreenshotModal() {
        const modal = document.getElementById('screenshot-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    downloadScreenshot() {
        if (!this.currentTierlist) return;
        
        const btn = document.getElementById('download-screenshot-btn');
        const dataUrl = btn.dataset.url;
        
        if (dataUrl) {
            const link = document.createElement('a');
            link.download = `tierlist-${this.currentTierlist.id}.png`;
            link.href = dataUrl;
            link.click();
            this.closeScreenshotModal();
        }
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
