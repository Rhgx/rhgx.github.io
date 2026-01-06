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
     * Discover available tierlists from the index
     * Loads tierlists.json first, then fetches each tierlist's manifest
     */
    async discoverTierlists() {
        try {
            // Load the index of available tierlists
            const response = await fetch('./tierlists/tierlists.json');
            if (!response.ok) {
                throw new Error('Index not found');
            }
            
            const tierlistIndex = await response.json();
            
            // Process the index, loading manifests for tierlists only
            return await this.processIndexEntries(tierlistIndex);
        } catch (e) {
            console.warn('No tierlists.json found, using demo tierlist');
        }
        
        // Return demo tierlist if no index
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
     * Process index entries recursively, handling folders and tierlists
     */
    async processIndexEntries(entries) {
        const result = [];
        
        for (const entry of entries) {
            if (entry.type === 'folder') {
                // Folders don't have manifests, just pass through with processed children
                const processedChildren = await this.processIndexEntries(entry.children || []);
                result.push({
                    type: 'folder',
                    id: entry.id,
                    name: entry.name,
                    children: processedChildren
                });
            } else {
                // Regular tierlist - load its manifest
                try {
                    const manifestResponse = await fetch(`./tierlists/${entry.id}/manifest.json`);
                    if (manifestResponse.ok) {
                        const tierlist = await manifestResponse.json();
                        result.push(tierlist);
                    } else {
                        console.warn(`Failed to load manifest for: ${entry.id}`);
                    }
                } catch (e) {
                    console.warn(`Error loading tierlist ${entry.id}:`, e);
                }
            }
        }
        
        return result;
    }
    
    /**
     * Load a specific tierlist
     */
    loadTierlist(tierlistId) {
        const tierlist = this.findTierlistById(tierlistId, this.tierlists);
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
     * Find a tierlist by ID, searching recursively through folders
     */
    findTierlistById(id, items) {
        for (const item of items) {
            if (item.type === 'folder') {
                // Search recursively in folder children
                const found = this.findTierlistById(id, item.children || []);
                if (found) return found;
            } else if (item.id === id) {
                return item;
            }
        }
        return null;
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
