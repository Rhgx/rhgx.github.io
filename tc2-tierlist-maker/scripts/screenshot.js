/**
 * Screenshot Manager
 * Handles screenshot capture, preview modal, download, and clipboard copy
 */

import { toPng } from 'https://esm.sh/html-to-image';

class ScreenshotManager {
    constructor(options = {}) {
        this.getCurrentTierlist = options.getCurrentTierlist || (() => null);
        this.onAfterCapture = options.onAfterCapture || (() => {});
        this.copyInProgress = false;
    }

    /**
     * Setup event listeners for screenshot buttons
     */
    setupEventListeners() {
        document.getElementById('screenshot-btn')?.addEventListener('click', () => this.takeScreenshot());
        document.getElementById('close-screenshot-btn')?.addEventListener('click', () => this.closeModal());
        document.getElementById('download-screenshot-btn')?.addEventListener('click', () => this.download());
        document.getElementById('copy-screenshot-btn')?.addEventListener('click', () => this.copyToClipboard());
    }

    /**
     * Take screenshot using html-to-image
     */
    async takeScreenshot() {
        const currentTierlist = this.getCurrentTierlist();
        if (!currentTierlist) return;

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
                pixelRatio: 1.3,
                skipFonts: true,
                style: {
                    transform: 'none',
                }
            });

            // Show modal
            this.showModal(dataUrl);

        } catch (error) {
            console.error('Screenshot failed:', error);
            alert('Failed to take screenshot. Please try again.');
        } finally {
            document.body.removeChild(exportContainer);
            document.body.style.cursor = 'default';

            // Clear any inline styles on tier-items only
            const tierContainer = document.getElementById('tier-container');
            if (tierContainer) {
                tierContainer.querySelectorAll('.tier-row, .tier-items').forEach(el => {
                    el.removeAttribute('style');
                });
            }

            // Callback to re-render
            this.onAfterCapture();
        }
    }

    /**
     * Show screenshot preview modal
     */
    showModal(dataUrl) {
        const modal = document.getElementById('screenshot-modal');
        const img = document.getElementById('screenshot-preview');
        const downloadBtn = document.getElementById('download-screenshot-btn');

        if (modal && img && downloadBtn) {
            img.src = dataUrl;
            downloadBtn.dataset.url = dataUrl;
            modal.classList.add('active');

            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    /**
     * Close screenshot modal
     */
    closeModal() {
        const modal = document.getElementById('screenshot-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Download screenshot
     */
    download() {
        const currentTierlist = this.getCurrentTierlist();
        if (!currentTierlist) return;

        const btn = document.getElementById('download-screenshot-btn');
        const dataUrl = btn?.dataset.url;

        if (dataUrl) {
            const link = document.createElement('a');
            link.download = `tierlist-${currentTierlist.id}.png`;
            link.href = dataUrl;
            link.click();
            this.closeModal();
        }
    }

    /**
     * Copy screenshot to clipboard
     */
    async copyToClipboard() {
        // Debounce - prevent spam clicking
        if (this.copyInProgress) return;
        
        const btn = document.getElementById('download-screenshot-btn');
        const dataUrl = btn?.dataset.url;

        if (!dataUrl) return;
        
        this.copyInProgress = true;

        try {
            const response = await fetch(dataUrl);
            const blob = await response.blob();

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);

            // Show feedback
            const copyBtn = document.getElementById('copy-screenshot-btn');
            if (copyBtn) {
                const originalText = copyBtn.innerHTML;
                const originalWidth = copyBtn.offsetWidth;
                
                // Preserve width to prevent shrinking
                copyBtn.style.minWidth = `${originalWidth}px`;
                copyBtn.innerHTML = '<i data-lucide="check"></i> Copied!';
                if (typeof lucide !== 'undefined') lucide.createIcons();

                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.minWidth = '';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                    this.copyInProgress = false;
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            alert('Failed to copy to clipboard. Your browser may not support this feature.');
        }
    }
}

export { ScreenshotManager };
