/**
 * Modal Component System
 * React-style reusable modal creation for static pages
 */

class Modal {
    /**
     * Create a new modal
     * @param {Object} options - Modal configuration
     * @param {string} options.title - Modal title text
     * @param {string} options.content - HTML content for modal body
     * @param {Array} options.actions - Array of action button configs
     * @param {Function} options.onClose - Callback when modal closes
     * @param {string} options.size - Modal size: 'small' (500px), 'medium' (800px default), 'large' (1000px)
     * @param {boolean} options.showCloseButton - Whether to show close button (default: true)
     */
    constructor(options = {}) {
        this.title = options.title || '';
        this.content = options.content || '';
        this.actions = options.actions || [];
        this.onClose = options.onClose || null;
        this.size = options.size || 'medium';
        this.showCloseButton = options.showCloseButton !== false;
        this.element = null;
        this.isOpen = false;
        
        this._create();
    }
    
    /**
     * Create modal DOM structure
     */
    _create() {
        this.element = document.createElement('div');
        this.element.className = 'modal';
        
        const sizeClass = `modal__content--${this.size}`;
        const closeButtonHtml = this.showCloseButton 
            ? `<button class="modal__close btn btn--back btn--square"><i data-lucide="x"></i></button>`
            : '';
        
        this.element.innerHTML = `
            <div class="modal__content ${sizeClass}">
                <div class="modal__header">
                    <h2 class="modal__title">${this.title}</h2>
                    ${closeButtonHtml}
                </div>
                <div class="modal__body">
                    ${this.content}
                    ${this._renderActions()}
                </div>
            </div>
        `;
        
        document.body.appendChild(this.element);
        
        // Bind close button if present
        const closeBtn = this.element.querySelector('.modal__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Bind action buttons
        this._bindActions();
        
        // Render icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ icons: lucide.icons, root: this.element });
        }
    }
    
    /**
     * Render action buttons HTML
     */
    _renderActions() {
        if (!this.actions.length) return '';
        
        const buttons = this.actions.map((action, index) => {
            const iconHtml = action.icon ? `<i data-lucide="${action.icon}"></i> ` : '';
            const className = action.className || 'btn';
            return `<button class="${className}" data-action-index="${index}">${iconHtml}${action.label}</button>`;
        }).join('');
        
        return `<div class="modal__actions">${buttons}</div>`;
    }
    
    /**
     * Bind action button click handlers
     */
    _bindActions() {
        this.actions.forEach((action, index) => {
            const btn = this.element.querySelector(`[data-action-index="${index}"]`);
            if (btn && action.onClick) {
                btn.addEventListener('click', (e) => action.onClick(e, this));
            }
        });
    }
    
    /**
     * Open the modal with animation
     */
    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        
        // Force reflow for animation
        this.element.offsetHeight;
        this.element.classList.add('active');
        
        // Re-render icons in case content changed
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ icons: lucide.icons, root: this.element });
        }
    }
    
    /**
     * Close the modal with animation
     */
    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        
        this.element.classList.remove('active');
        
        if (this.onClose) {
            this.onClose();
        }
    }
    
    /**
     * Update modal body content
     * @param {string} html - New HTML content
     */
    setContent(html) {
        const body = this.element.querySelector('.modal__body');
        if (body) {
            body.innerHTML = html + this._renderActions();
            this._bindActions();
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ icons: lucide.icons, root: this.element });
            }
        }
    }
    
    /**
     * Get an element within the modal
     * @param {string} selector - CSS selector
     */
    querySelector(selector) {
        return this.element.querySelector(selector);
    }
    
    /**
     * Get all elements matching selector within modal
     * @param {string} selector - CSS selector
     */
    querySelectorAll(selector) {
        return this.element.querySelectorAll(selector);
    }
    
    /**
     * Destroy modal and remove from DOM
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
}

export { Modal };
