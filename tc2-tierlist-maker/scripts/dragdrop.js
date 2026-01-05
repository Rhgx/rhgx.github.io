/**
 * Drag and Drop Functionality
 * Uses SortableJS for smooth drag/drop with mobile touch support
 */

class DragDropManager {
    constructor(options = {}) {
        this.onItemMoved = options.onItemMoved || (() => {});
        this.sortableInstances = [];
    }
    
    /**
     * Initialize drag/drop on tier items
     */
    init() {
        this.setupSortable();
    }
    
    /**
     * Re-initialize after DOM changes
     */
    refresh() {
        // Destroy existing instances
        this.destroy();
        // Create new instances
        this.setupSortable();
    }
    
    /**
     * Destroy all sortable instances
     */
    destroy() {
        this.sortableInstances.forEach(instance => {
            if (instance && instance.destroy) {
                instance.destroy();
            }
        });
        this.sortableInstances = [];
    }
    
    /**
     * Setup SortableJS instances for all drop zones
     */
    setupSortable() {
        const dropZones = document.querySelectorAll('.tier-items, .pool-items');
        
        dropZones.forEach(zone => {
            const sortable = new Sortable(zone, {
                group: 'tierlist-items',
                animation: 150,
                easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
                
                // Ghost element styling
                ghostClass: 'tier-item--ghost',
                chosenClass: 'tier-item--chosen',
                dragClass: 'tier-item--dragging',
                
                // Sorting options
                sort: true,
                delay: 0,
                delayOnTouchOnly: true,
                touchStartThreshold: 3,
                
                // Scroll options
                scroll: true,
                scrollSensitivity: 80,
                scrollSpeed: 10,
                bubbleScroll: true,
                
                // Draggable items
                draggable: '.tier-item',
                
                // Handlers
                onStart: (evt) => this.handleDragStart(evt),
                onEnd: (evt) => this.handleDragEnd(evt),
                onChange: (evt) => this.handleChange(evt)
            });
            
            this.sortableInstances.push(sortable);
        });
    }
    
    /**
     * Handle drag start
     */
    handleDragStart(evt) {
        const item = evt.item;
        if (item) {
            // Add visual feedback
            item.classList.add('tier-item--active');
        }
    }
    
    /**
     * Handle drag end (item dropped)
     */
    handleDragEnd(evt) {
        const item = evt.item;
        if (item) {
            // Remove visual feedback
            item.classList.remove('tier-item--active');
            
            // Add drop animation
            item.classList.add('tier-item--dropped');
            setTimeout(() => {
                item.classList.remove('tier-item--dropped');
            }, 200);
        }
        
        // Get tier info
        const fromTier = evt.from.closest('[data-tier]')?.dataset.tier || 'pool';
        const toTier = evt.to.closest('[data-tier]')?.dataset.tier || 'pool';
        
        // Notify callback
        this.onItemMoved({
            itemId: item.dataset.id,
            fromTier: fromTier,
            toTier: toTier,
            element: item,
            oldIndex: evt.oldIndex,
            newIndex: evt.newIndex
        });
    }
    
    /**
     * Handle item position change during drag
     */
    handleChange(evt) {
        // This fires whenever the item position changes during drag
        // Can be used for real-time feedback if needed
    }
}

export { DragDropManager };
