const fs = require('fs').promises;
const path = require('path');
const Product = require('../models/Product');

/**
 * Product Service
 * Handles product catalog operations and persistence
 */
class ProductService {
    constructor() {
        this.dataPath = path.join(__dirname, '../../data/products.json');
        this.products = new Map();
        this.categories = new Set();
    }

    /**
     * Initialize service and load products
     */
    async initialize() {
        try {
            await this.loadProducts();
            console.log(`✅ Product service initialized with ${this.products.size} products`);
        } catch (error) {
            console.error('❌ Failed to initialize product service:', error.message);
            // Initialize with empty catalog
            this.products = new Map();
        }
    }

    /**
     * Load products from JSON file
     */
    async loadProducts() {
        try {
            const data = await fs.readFile(this.dataPath, 'utf8');
            const productsData = JSON.parse(data);
            
            this.products.clear();
            this.categories.clear();
            
            productsData.forEach(productData => {
                const product = new Product(productData);
                this.products.set(product.id, product);
                this.categories.add(product.category);
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, create empty catalog
                await this.saveProducts();
            } else {
                throw error;
            }
        }
    }

    /**
     * Save products to JSON file
     */
    async saveProducts() {
        try {
            const productsArray = Array.from(this.products.values());
            await fs.writeFile(this.dataPath, JSON.stringify(productsArray, null, 2));
        } catch (error) {
            console.error('Failed to save products:', error);
            throw error;
        }
    }

    /**
     * Get all products
     */
    getAllProducts() {
        return Array.from(this.products.values());
    }

    /**
     * Get products by category
     */
    getProductsByCategory(category) {
        return Array.from(this.products.values()).filter(p => 
            p.category.toLowerCase() === category.toLowerCase()
        );
    }

    /**
     * Get product by ID
     */
    getProductById(id) {
        return this.products.get(id);
    }

    /**
     * Get product by SKU
     */
    getProductBySku(sku) {
        return Array.from(this.products.values()).find(p => 
            p.sku.toLowerCase() === sku.toLowerCase()
        );
    }

    /**
     * Search products by name or description
     */
    searchProducts(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.products.values()).filter(p => 
            p.name.toLowerCase().includes(lowerQuery) ||
            p.description.toLowerCase().includes(lowerQuery) ||
            p.sku.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get available products only
     */
    getAvailableProducts() {
        return Array.from(this.products.values()).filter(p => 
            p.isAvailable && p.stock > 0
        );
    }

    /**
     * Get all categories
     */
    getCategories() {
        return Array.from(this.categories);
    }

    /**
     * Add or update product
     */
    async saveProduct(productData) {
        const product = new Product(productData);
        const validation = product.validate();
        
        if (!validation.valid) {
            throw new Error(`Invalid product: ${validation.errors.join(', ')}`);
        }
        
        if (!product.id) {
            product.id = this.generateProductId();
        }
        
        product.updatedAt = new Date().toISOString();
        this.products.set(product.id, product);
        this.categories.add(product.category);
        
        await this.saveProducts();
        return product;
    }

    /**
     * Delete product
     */
    async deleteProduct(id) {
        const deleted = this.products.delete(id);
        if (deleted) {
            await this.saveProducts();
        }
        return deleted;
    }

    /**
     * Update product stock
     */
    async updateStock(productId, quantity) {
        const product = this.products.get(productId);
        if (!product) {
            throw new Error('Product not found');
        }
        
        product.stock = quantity;
        product.updatedAt = new Date().toISOString();
        await this.saveProducts();
        return product;
    }

    /**
     * Reduce product stock (for orders)
     */
    async reduceStock(productId, quantity) {
        const product = this.products.get(productId);
        if (!product) {
            throw new Error('Product not found');
        }
        
        if (!product.reduceStock(quantity)) {
            throw new Error('Insufficient stock');
        }
        
        await this.saveProducts();
        return product;
    }

    /**
     * Generate unique product ID
     */
    generateProductId() {
        return `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
    }

    /**
     * Sync products from website API
     */
    async syncFromWebsite(products) {
        try {
            this.products.clear();
            this.categories.clear();
            
            products.forEach(productData => {
                const product = new Product(productData);
                this.products.set(product.id, product);
                this.categories.add(product.category);
            });
            
            await this.saveProducts();
            console.log(`✅ Synced ${products.length} products from website`);
            return true;
        } catch (error) {
            console.error('❌ Failed to sync products:', error);
            throw error;
        }
    }

    /**
     * Format catalog for WhatsApp
     */
    formatCatalog(category = null) {
        let products = category 
            ? this.getProductsByCategory(category)
            : this.getAvailableProducts();
        
        if (products.length === 0) {
            return '❌ Tidak ada produk tersedia.';
        }
        
        let message = category 
            ? `📦 *Katalog Produk - ${category}*\n\n`
            : `📦 *Katalog Produk*\n\n`;
        
        products.forEach((product, index) => {
            message += `${index + 1}. *${product.name}*\n`;
            message += `   💰 Rp ${product.price.toLocaleString('id-ID')}\n`;
            message += `   📦 Stok: ${product.stock}\n`;
            message += `   📝 Kode: ${product.sku}\n\n`;
        });
        
        message += `\n💬 Ketik *PRODUK <kode>* untuk detail\n`;
        message += `Contoh: PRODUK ${products[0]?.sku || 'ABC123'}`;
        
        return message;
    }

    /**
     * Format categories list
     */
    formatCategories() {
        const categories = this.getCategories();
        
        if (categories.length === 0) {
            return '❌ Tidak ada kategori tersedia.';
        }
        
        let message = `📂 *Kategori Produk*\n\n`;
        
        categories.forEach((category, index) => {
            const count = this.getProductsByCategory(category).length;
            message += `${index + 1}. ${category} (${count} produk)\n`;
        });
        
        message += `\n💬 Ketik *KATEGORI <nama>* untuk melihat produk\n`;
        message += `Contoh: KATEGORI ${categories[0]}`;
        
        return message;
    }
}

module.exports = ProductService;
