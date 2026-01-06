/**
 * Screenshot Manager
 * Handles screenshot capture, preview modal, download, and clipboard copy
 */

import { Modal } from './modal.js';

// Lazy-loaded html-to-image module
let toPng = null;

class ScreenshotManager {
    constructor(options = {}) {
        this.getCurrentTierlist = options.getCurrentTierlist || (() => null);
        this.onAfterCapture = options.onAfterCapture || (() => {});
        this.copyInProgress = false;
        this.modal = null;
        this.currentDataUrl = null;
    }

    /**
     * Lazy load html-to-image library (only when needed)
     */
    async loadHtmlToImage() {
        if (!toPng) {
            const module = await import('https://esm.sh/html-to-image');
            toPng = module.toPng;
        }
        return toPng;
    }

    /**
     * Setup event listeners for screenshot buttons
     */
    setupEventListeners() {
        document.getElementById('screenshot-btn')?.addEventListener('click', () => this.takeScreenshot());
        
        // Start preloading the library in the background
        this.preloadLibrary();
    }

    /**
     * Preload html-to-image library in the background during idle time
     */
    preloadLibrary() {
        // Use requestIdleCallback if available, otherwise use setTimeout
        const schedulePreload = window.requestIdleCallback || ((cb) => setTimeout(cb, 2000));
        
        schedulePreload(() => {
            this.loadHtmlToImage().catch(() => {
                // Silently ignore preload failures - will retry on actual use
            });
        });
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

            // Lazy load html-to-image library
            const toPngFn = await this.loadHtmlToImage();

            // Wait a tick for DOM to settle
            await new Promise(resolve => setTimeout(resolve, 100));

            const dataUrl = await toPngFn(exportContainer, {
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
        this.currentDataUrl = dataUrl;
        
        // Destroy existing modal if any
        if (this.modal) {
            this.modal.destroy();
        }
        
        this.modal = new Modal({
            title: 'Screenshot Preview',
            content: `
                <div class="screenshot-preview-container">
                    <img src="${dataUrl}" alt="Screenshot Preview">
                </div>
            `,
            actions: [
                {
                    label: 'Copy to Clipboard',
                    icon: 'clipboard-copy',
                    className: 'btn',
                    onClick: () => this.copyToClipboard()
                },
                {
                    label: 'Download Image',
                    icon: 'download',
                    className: 'btn',
                    onClick: () => this.download()
                }
            ]
        });
        
        this.modal.open();
    }

    /**
     * Close screenshot modal
     */
    closeModal() {
        if (this.modal) {
            this.modal.close();
        }
    }

    /**
     * Download screenshot
     */
    download() {
        const currentTierlist = this.getCurrentTierlist();
        if (!currentTierlist || !this.currentDataUrl) return;

        const link = document.createElement('a');
        link.download = `tierlist-${currentTierlist.id}.png`;
        link.href = this.currentDataUrl;
        link.click();
        this.closeModal();
    }

    /**
     * Copy screenshot to clipboard
     */
    async copyToClipboard() {
        // Debounce - prevent spam clicking
        if (this.copyInProgress || !this.currentDataUrl) return;
        
        this.copyInProgress = true;

        try {
            const response = await fetch(this.currentDataUrl);
            const blob = await response.blob();

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);

            // Show feedback on the copy button
            const copyBtn = this.modal?.querySelector('[data-action-index="0"]');
            if (copyBtn) {
                const originalText = copyBtn.innerHTML;
                const originalWidth = copyBtn.offsetWidth;
                
                // Preserve width to prevent shrinking
                copyBtn.style.minWidth = `${originalWidth}px`;
                copyBtn.innerHTML = '<i data-lucide="check"></i> Copied!';
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons({ icons: lucide.icons, root: copyBtn });
                }

                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.minWidth = '';
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons({ icons: lucide.icons, root: copyBtn });
                    }
                    this.copyInProgress = false;
                }, 2000);
            } else {
                this.copyInProgress = false;
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            alert('Failed to copy to clipboard. Your browser may not support this feature.');
            this.copyInProgress = false;
        }
    }
}

export { ScreenshotManager };
