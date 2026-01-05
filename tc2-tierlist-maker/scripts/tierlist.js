/**
 * Tierlist Management
 * Handles loading tierlists from folders, saving rankings to localStorage
 */

class TierlistManager {
    constructor() {
        this.currentTierlist = null;
        this.tierlists = [];
        this.rankings = {};
    }
    
    /**
     * Initialize with available tierlists
     * In production, this would scan the tierlists/ folder
     * For now, we'll use a config-based approach that can be extended
     */
    async init() {
        // Load tierlist configurations
        // Each tierlist folder should have a manifest or we scan for images
        this.tierlists = await this.discoverTierlists();
        
        // Load saved rankings from localStorage
        this.loadRankings();
        
        return this.tierlists;
    }
    
    /**
     * Discover available tierlists
     * Since browsers can't scan directories, we use a manifest approach
     */
    async discoverTierlists() {
        try {
            const response = await fetch('./tierlists/manifest.json');
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.warn('No manifest found, using demo tierlist');
        }
        
        // Return demo tierlist if no manifest
        return [{
            id: 'demo',
            name: 'Demo Tierlist',
            images: [
                { id: 'demo-1', src: './tierlists/demo/item1.png', name: 'Item 1' },
                { id: 'demo-2', src: './tierlists/demo/item2.png', name: 'Item 2' },
                { id: 'demo-3', src: './tierlists/demo/item3.png', name: 'Item 3' },
            ]
        }];
    }
    
    /**
     * Load a specific tierlist
     */
    loadTierlist(tierlistId) {
        const tierlist = this.tierlists.find(t => t.id === tierlistId);
        if (!tierlist) {
            console.error(`Tierlist ${tierlistId} not found`);
            return null;
        }
        
        this.currentTierlist = tierlist;
        
        // Get saved rankings or default to all items in pool
        const saved = this.rankings[tierlistId];
        if (saved) {
            return {
                ...tierlist,
                tiers: saved
            };
        }
        
        // Default: all items in pool
        return {
            ...tierlist,
            tiers: {
                S: [],
                A: [],
                B: [],
                C: [],
                D: [],
                E: [],
                F: [],
                pool: tierlist.images.map(img => img.id)
            }
        };
    }
    
    /**
     * Save current rankings (in-memory only, no persistence)
     */
    saveRankings(tierlistId, tiers) {
        this.rankings[tierlistId] = tiers;
        // No localStorage - resets on refresh
    }
    
    /**
     * Load rankings (no persistence)
     */
    loadRankings() {
        // No localStorage - always start fresh
        this.rankings = {};
    }
    
    /**
     * Reset rankings for a tierlist
     */
    resetRankings(tierlistId) {
        delete this.rankings[tierlistId];
    }
    
    /**
     * Get image data by ID
     */
    getImageById(imageId) {
        if (!this.currentTierlist) return null;
        return this.currentTierlist.images.find(img => img.id === imageId);
    }
    
    /**
     * Get all tierlists
     */
    getTierlists() {
        return this.tierlists;
    }
    
    /**
     * Format folder name to display name
     */
    static formatName(folderName) {
        return folderName
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}

export { TierlistManager };
