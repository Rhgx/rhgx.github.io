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
            
            // Remove old listeners to prevent duplicates
            item.removeEventListener('dragstart', this.handleDragStartBound);
            item.removeEventListener('dragend', this.handleDragEndBound);
            
            // Create bound handlers
            this.handleDragStartBound = (e) => this.handleDragStart(e);
            this.handleDragEndBound = (e) => this.handleDragEnd(e);
            
            item.addEventListener('dragstart', this.handleDragStartBound);
            item.addEventListener('dragend', this.handleDragEndBound);
        });
    }
    
    /**
     * Handle drag start
     */
    handleDragStart(e) {
        this.draggedElement = e.target.closest('.tier-item');
        this.draggedItemId = this.draggedElement.dataset.id;
        this.sourceTier = this.draggedElement.closest('[data-tier]')?.dataset.tier || 'pool';
        
        // Add dragging class
        this.draggedElement.classList.add('tier-item--dragging');
        
        // Set drag image
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.draggedItemId);
        
        // Create ghost image
        const ghost = this.draggedElement.cloneNode(true);
        ghost.classList.add('tier-item--ghost');
        ghost.style.position = 'absolute';
        ghost.style.top = '-1000px';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 35, 35);
        
        // Remove ghost after drag starts
        setTimeout(() => ghost.remove(), 0);
    }
    
    /**
     * Handle drag over (required for drop to work)
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Optional: show insertion point
        const dropZone = e.target.closest('.tier-items, .pool-items');
        if (dropZone) {
            const afterElement = this.getDragAfterElement(dropZone, e.clientX);
            if (afterElement) {
                dropZone.insertBefore(this.draggedElement, afterElement);
            } else {
                dropZone.appendChild(this.draggedElement);
            }
        }
    }
    
    /**
     * Get element to insert after based on mouse position
     */
    getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.tier-item:not(.tier-item--dragging)')];
        
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
        if (!dropZone) return;
        
        dropZone.classList.remove('drag-over');
        
        const targetTier = dropZone.closest('[data-tier]')?.dataset.tier || 'pool';
        
        // Add dropped animation
        if (this.draggedElement) {
            this.draggedElement.classList.remove('tier-item--dragging');
            this.draggedElement.classList.add('tier-item--dropped');
            
            setTimeout(() => {
                this.draggedElement?.classList.remove('tier-item--dropped');
            }, 200);
        }
        
        // Notify callback
        this.onItemMoved({
            itemId: this.draggedItemId,
            fromTier: this.sourceTier,
            toTier: targetTier,
            element: this.draggedElement
        });
    }
    
    /**
     * Handle drag end
     */
    handleDragEnd(e) {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('tier-item--dragging');
        }
        
        // Remove all drag-over classes
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        this.draggedElement = null;
        this.draggedItemId = null;
        this.sourceTier = null;
    }
}

export { DragDropManager };
