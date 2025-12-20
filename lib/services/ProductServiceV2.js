const fs = require('fs').promises;
const path = require('path');
const Product = require('../models/Product');

/**
 * Product Service with MySQL Support
 * Handles product catalog operations with both MySQL and JSON storage
 */
class ProductService {
    constructor(dbAdapter = null) {
        this.dbAdapter = dbAdapter; // MySQL adapter (null = use JSON)
        this.dataPath = path.join(__dirname, '../../data/products.json');
        this.products = new Map();
        this.categories = new Set();
        this.useMySQL = dbAdapter !== null;
    }

    /**
     * Initialize service and load products
     */
    async initialize() {
        try {
            if (this.useMySQL) {
                await this.loadProductsFromMySQL();
                console.log(`✅ Product service initialized with MySQL (${this.products.size} products)`);
            } else {
                await this.loadProductsFromJSON();
                console.log(`✅ Product service initialized with JSON (${this.products.size} products)`);
            }
        } catch (error) {
            console.error('❌ Failed to initialize product service:', error.message);
            this.products = new Map();
        }
    }

    /**
     * Load products from MySQL database
     */
    async loadProductsFromMySQL() {
        try {
            const rows = await this.dbAdapter.query(`
                SELECT * FROM products 
                WHERE stok > 0 
                ORDER BY created_at DESC
            `);

            this.products.clear();
            this.categories.clear();

            rows.forEach(row => {
                const productData = {
                    id: row.id,
                    sku: row.sku || row.id,
                    name: row.nama_produk,
                    description: row.deskripsi || '',
                    price: parseFloat(row.harga),
                    stock: parseInt(row.stok),
                    category: row.kategori,
                    images: row.gambar ? [row.gambar] : [],
                    variants: row.variants ? JSON.parse(row.variants) : [],
                    isAvailable: row.stok > 0
                };

                const product = new Product(productData);
                this.products.set(product.id, product);
                this.categories.add(product.category);
            });
        } catch (error) {
            console.error('Error loading products from MySQL:', error.message);
            throw error;
        }
    }

    /**
     * Load products from JSON file
     */
    async loadProductsFromJSON() {
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
                await this.saveProductsToJSON();
            } else {
                throw error;
            }
        }
    }

    /**
     * Save products to JSON file
     */
    async saveProductsToJSON() {
        const productsArray = Array.from(this.products.values()).map(p => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            description: p.description,
            price: p.price,
            stock: p.stock,
            category: p.category,
            images: p.images,
            variants: p.variants,
            isAvailable: p.isAvailable
        }));

        await fs.writeFile(this.dataPath, JSON.stringify(productsArray, null, 2), 'utf8');
    }

    /**
     * Reload products (useful for syncing with website)
     */
    async reload() {
        console.log('🔄 Reloading products...');
        await this.initialize();
    }

    /**
     * Get all products
     */
    getAllProducts() {
        return Array.from(this.products.values());
    }

    /**
     * Get product by ID
     */
    getProductById(id) {
        return this.products.get(id);
    }

    /**
     * Get products by category
     */
    getProductsByCategory(category) {
        return this.getAllProducts().filter(p => 
            p.category.toLowerCase() === category.toLowerCase() && p.isAvailable
        );
    }

    /**
     * Search products by name
     */
    searchProducts(query) {
        const searchTerm = query.toLowerCase();
        return this.getAllProducts().filter(p => 
            p.name.toLowerCase().includes(searchTerm) && p.isAvailable
        );
    }

    /**
     * Get all categories
     */
    getCategories() {
        return Array.from(this.categories);
    }

    /**
     * Format catalog for WhatsApp
     */
    formatCatalog(limit = null) {
        const products = this.getAllProducts()
            .filter(p => p.isAvailable)
            .slice(0, limit || undefined);

        if (products.length === 0) {
            return '📦 Maaf, produk sedang kosong.';
        }

        let message = '🛍️ *KATALOG PRODUK* 🛍️\n\n';

        products.forEach((product, index) => {
            message += product.toWhatsAppFormat(index + 1) + '\n';
        });

        message += '\n💬 *Cara Order:*\n';
        message += 'Ketik: BELI <ID> <JUMLAH>\n';
        message += 'Contoh: BELI 001 2\n\n';
        message += 'Ketik *KERANJANG* untuk lihat keranjang\n';
        message += 'Ketik *CHECKOUT* untuk proses order';

        return message;
    }

    /**
     * Format catalog by category
     */
    formatCatalogByCategory(category) {
        const products = this.getProductsByCategory(category);

        if (products.length === 0) {
            return `📦 Maaf, tidak ada produk dalam kategori "${category}".`;
        }

        let message = `🛍️ *KATEGORI: ${category.toUpperCase()}* 🛍️\n\n`;

        products.forEach((product, index) => {
            message += product.toWhatsAppFormat(index + 1) + '\n';
        });

        return message;
    }

    /**
     * Update stock (after purchase)
     */
    async updateStock(productId, quantity) {
        const product = this.products.get(productId);
        if (!product) {
            throw new Error(`Product ${productId} not found`);
        }

        product.reduceStock(quantity);

        // Update in database
        if (this.useMySQL) {
            await this.dbAdapter.query(
                'UPDATE products SET stok = stok - ? WHERE id = ?',
                [quantity, productId]
            );
        } else {
            await this.saveProductsToJSON();
        }
    }

    /**
     * Add new product (for admin)
     */
    async addProduct(productData) {
        try {
            if (this.useMySQL) {
                // Insert to MySQL - id will auto-increment, we don't insert SKU
                const result = await this.dbAdapter.query(
                    `INSERT INTO products (nama_produk, deskripsi, harga, stok, kategori, gambar) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        productData.name,
                        productData.description || '',
                        productData.price,
                        productData.stock,
                        productData.category,
                        productData.image || ''
                    ]
                );

                // Reload products to get the new one with auto-generated id
                await this.loadProductsFromMySQL();
                
                return { success: true, id: result.insertId, sku: result.insertId };
            } else {
                // Add to JSON
                const newProduct = new Product({
                    id: productData.sku,
                    ...productData
                });
                
                this.products.set(newProduct.id, newProduct);
                this.categories.add(newProduct.category);
                
                await this.saveProductsToJSON();
                
                return { success: true, id: newProduct.id, sku: productData.sku };
            }
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    }

    /**
     * Update product (for admin)
     */
    async updateProduct(idOrSku, updates) {
        try {
            if (this.useMySQL) {
                // Find product by ID or SKU first
                const product = this.getProductBySKU(idOrSku);
                if (!product) {
                    throw new Error(`Product with ID/SKU ${idOrSku} not found`);
                }

                // Build dynamic update query
                const fields = [];
                const values = [];

                if (updates.name) {
                    fields.push('nama_produk = ?');
                    values.push(updates.name);
                }
                if (updates.description !== undefined) {
                    fields.push('deskripsi = ?');
                    values.push(updates.description);
                }
                if (updates.price !== undefined) {
                    fields.push('harga = ?');
                    values.push(updates.price);
                }
                if (updates.stock !== undefined) {
                    fields.push('stok = ?');
                    values.push(updates.stock);
                }
                if (updates.category) {
                    fields.push('kategori = ?');
                    values.push(updates.category);
                }
                if (updates.image) {
                    fields.push('gambar = ?');
                    values.push(updates.image);
                }

                if (fields.length === 0) {
                    return { success: true, message: 'No changes' };
                }

                values.push(product.id); // Use product.id from MySQL

                await this.dbAdapter.query(
                    `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
                    values
                );

                // Reload products
                await this.loadProductsFromMySQL();

                return { success: true, id: product.id };
            } else {
                // Update in JSON
                const product = this.getProductBySKU(idOrSku);
                if (!product) {
                    throw new Error(`Product with ID/SKU ${idOrSku} not found`);
                }

                Object.assign(product, updates);
                await this.saveProductsToJSON();

                return { success: true, id: product.id };
            }
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    /**
     * Delete product (for admin)
     */
    async deleteProduct(idOrSku) {
        try {
            if (this.useMySQL) {
                // Find product by ID or SKU first
                const product = this.getProductBySKU(idOrSku);
                if (!product) {
                    throw new Error(`Product with ID/SKU ${idOrSku} not found`);
                }

                await this.dbAdapter.query(
                    'DELETE FROM products WHERE id = ?',
                    [product.id] // Use product.id from MySQL
                );

                // Reload products
                await this.loadProductsFromMySQL();

                return { success: true, id: product.id };
            } else {
                const product = this.getProductBySKU(idOrSku);
                if (!product) {
                    throw new Error(`Product with ID/SKU ${idOrSku} not found`);
                }

                this.products.delete(product.id);
                await this.saveProductsToJSON();

                return { success: true, id: product.id };
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }

    /**
     * Get product by SKU or ID
     */
    getProductBySKU(idOrSku) {
        // Try to find by id first (exact match)
        const byId = this.products.get(idOrSku);
        if (byId) return byId;
        
        // Then try to find by sku field
        return this.getAllProducts().find(p => 
            p.sku === idOrSku || 
            p.id == idOrSku || 
            p.id === String(idOrSku)
        );
    }

    /**
     * Sync products from website (webhook endpoint will call this)
     */
    async syncFromWebsite(productsData) {
        console.log(`🔄 Syncing ${productsData.length} products from website...`);

        this.products.clear();
        this.categories.clear();

        productsData.forEach(data => {
            const product = new Product(data);
            this.products.set(product.id, product);
            this.categories.add(product.category);
        });

        // Save to JSON as backup
        if (!this.useMySQL) {
            await this.saveProductsToJSON();
        }

        console.log(`✅ Synced ${this.products.size} products`);
        return { success: true, count: this.products.size };
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const products = this.getAllProducts();
        const available = products.filter(p => p.isAvailable);
        
        const totalValue = available.reduce((sum, p) => sum + (p.price * p.stock), 0);
        
        const categoryCounts = {};
        this.categories.forEach(cat => {
            categoryCounts[cat] = products.filter(p => p.category === cat && p.isAvailable).length;
        });

        return {
            totalProducts: this.products.size,
            availableProducts: available.length,
            totalCategories: this.categories.size,
            categoryCounts,
            totalValue,
            lowStockProducts: available.filter(p => p.stock < 5).length
        };
    }
}

module.exports = ProductService;
