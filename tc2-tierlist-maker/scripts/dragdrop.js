/**
 * Drag and Drop Functionality
 * Handles moving items between tiers using native HTML5 drag/drop API
 */

class DragDropManager {
    constructor(options = {}) {
        this.onItemMoved = options.onItemMoved || (() => {});
        this.draggedElement = null;
        this.draggedItemId = null;
        this.sourceTier = null;
        this.sourceContainer = null;
        this.sourceNextSibling = null;
        this.placeholder = null;
        this.lastDropZone = null;
    }
    
    /**
     * Initialize drag/drop on tier items
     */
    init() {
        this.setupDropZones();
        this.setupDraggableItems();
    }
    
    /**
     * Re-initialize after DOM changes
     */
    refresh() {
        this.setupDropZones();
        this.setupDraggableItems();
    }
    
    /**
     * Setup drop zones (tier rows and pool)
     */
    setupDropZones() {
        const dropZones = document.querySelectorAll('.tier-items, .pool-items');
        
        dropZones.forEach(zone => {
            // Remove existing listeners by cloning
            const newZone = zone.cloneNode(true);
            zone.parentNode.replaceChild(newZone, zone);
        });
        
        // Re-query and add fresh listeners
        document.querySelectorAll('.tier-items, .pool-items').forEach(zone => {
            zone.addEventListener('dragover', (e) => this.handleDragOver(e));
            zone.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            zone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            zone.addEventListener('drop', (e) => this.handleDrop(e));
        });
    }
    
    /**
     * Setup draggable items
     */
    setupDraggableItems() {
        const items = document.querySelectorAll('.tier-item');
        
        items.forEach(item => {
            item.setAttribute('draggable', 'true');
            
            // Clone to remove old listeners
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
        });
        
        // Re-query and add fresh listeners
        document.querySelectorAll('.tier-item').forEach(item => {
            item.addEventListener('dragstart', (e) => this.handleDragStart(e));
            item.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
    }
    
    /**
     * Create placeholder element
     */
    createPlaceholder() {
        const placeholder = document.createElement('div');
        placeholder.className = 'tier-item tier-item--placeholder';
        placeholder.style.cssText = `
            width: 70px;
            height: 70px;
            border: 2px dashed var(--highlight, #8E8A75);
            border-radius: 4px;
            background: rgba(142, 138, 117, 0.1);
            box-sizing: border-box;
        `;
        return placeholder;
    }
    
    /**
     * Handle drag start
     */
    handleDragStart(e) {
        this.draggedElement = e.target.closest('.tier-item');
        if (!this.draggedElement) return;
        
        this.draggedItemId = this.draggedElement.dataset.id;
        this.sourceTier = this.draggedElement.closest('[data-tier]')?.dataset.tier || 'pool';
        this.sourceContainer = this.draggedElement.parentNode;
        this.sourceNextSibling = this.draggedElement.nextElementSibling;
        
        // Create placeholder
        this.placeholder = this.createPlaceholder();
        
        // Add dragging class
        this.draggedElement.classList.add('tier-item--dragging');
        
        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.draggedItemId);
        
        // Create ghost image
        const ghost = this.draggedElement.cloneNode(true);
        ghost.classList.remove('tier-item--dragging');
        ghost.style.position = 'absolute';
        ghost.style.top = '-1000px';
        ghost.style.opacity = '1';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 35, 35);
        
        // Remove ghost and hide original after drag starts
        requestAnimationFrame(() => {
            ghost.remove();
            if (this.draggedElement) {
                this.draggedElement.style.display = 'none';
            }
        });
    }
    
    /**
     * Handle drag over (required for drop to work)
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (!this.placeholder || !this.draggedElement) return;
        
        const dropZone = e.target.closest('.tier-items, .pool-items');
        if (!dropZone) return;
        
        this.lastDropZone = dropZone;
        
        // Find insertion point
        const afterElement = this.getDragAfterElement(dropZone, e.clientX);
        
        // Move placeholder
        if (afterElement) {
            if (this.placeholder.nextElementSibling !== afterElement) {
                dropZone.insertBefore(this.placeholder, afterElement);
            }
        } else {
            if (this.placeholder.parentNode !== dropZone || this.placeholder.nextElementSibling !== null) {
                dropZone.appendChild(this.placeholder);
            }
        }
    }
    
    /**
     * Get element to insert after based on mouse position
     */
    getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.tier-item:not(.tier-item--dragging):not(.tier-item--placeholder)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    /**
     * Handle drag enter
     */
    handleDragEnter(e) {
        e.preventDefault();
        const dropZone = e.target.closest('.tier-items, .pool-items');
        if (dropZone) {
            dropZone.classList.add('drag-over');
        }
    }
    
    /**
     * Handle drag leave
     */
    handleDragLeave(e) {
        const dropZone = e.target.closest('.tier-items, .pool-items');
        const relatedTarget = e.relatedTarget?.closest('.tier-items, .pool-items');
        
        if (dropZone && dropZone !== relatedTarget) {
            dropZone.classList.remove('drag-over');
        }
    }
    
    /**
     * Handle drop
     */
    handleDrop(e) {
        e.preventDefault();
        
        const dropZone = e.target.closest('.tier-items, .pool-items');
        if (!dropZone || !this.draggedElement || !this.placeholder) return;
        
        dropZone.classList.remove('drag-over');
        
        const targetTier = dropZone.closest('[data-tier]')?.dataset.tier || 'pool';
        
        // Show and insert the dragged element at placeholder position
        this.draggedElement.style.display = '';
        this.draggedElement.classList.remove('tier-item--dragging');
        
        // Insert at placeholder position
        this.placeholder.parentNode.insertBefore(this.draggedElement, this.placeholder);
        
        // Remove placeholder
        this.placeholder.remove();
        
        // Add dropped animation
        this.draggedElement.classList.add('tier-item--dropped');
        setTimeout(() => {
            this.draggedElement?.classList.remove('tier-item--dropped');
        }, 200);
        
        // Notify callback
        this.onItemMoved({
            itemId: this.draggedItemId,
            fromTier: this.sourceTier,
            toTier: targetTier,
            element: this.draggedElement
        });
        
        this.cleanup();
    }
    
    /**
     * Handle drag end (covers cancel/escape)
     */
    handleDragEnd(e) {
        if (this.draggedElement) {
            // Show element again
            this.draggedElement.style.display = '';
            this.draggedElement.classList.remove('tier-item--dragging');
            
            // If placeholder still exists (drag was cancelled), restore original position
            if (this.placeholder && this.placeholder.parentNode) {
                this.placeholder.remove();
                
                // Restore to original position
                if (this.sourceContainer) {
                    if (this.sourceNextSibling) {
                        this.sourceContainer.insertBefore(this.draggedElement, this.sourceNextSibling);
                    } else {
                        this.sourceContainer.appendChild(this.draggedElement);
                    }
                }
            }
        }
        
        // Remove all drag-over classes
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        this.cleanup();
    }
    
    /**
     * Cleanup state
     */
    cleanup() {
        this.draggedElement = null;
        this.draggedItemId = null;
        this.sourceTier = null;
        this.sourceContainer = null;
        this.sourceNextSibling = null;
        this.placeholder = null;
        this.lastDropZone = null;
    }
}

export { DragDropManager };
