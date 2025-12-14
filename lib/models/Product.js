/**
 * Product Model
 * Represents a product in the e-commerce catalog
 */
class Product {
    constructor(data) {
        this.id = data.id || null;
        this.sku = data.sku || null;
        this.name = data.name || '';
        this.description = data.description || '';
        this.price = parseFloat(data.price) || 0;
        this.stock = parseInt(data.stock) || 0;
        this.category = data.category || 'uncategorized';
        this.images = data.images || [];
        this.variants = data.variants || []; // [{name: 'Size', options: ['S','M','L']}, ...]
        this.isAvailable = data.isAvailable !== undefined ? data.isAvailable : true;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Format product for WhatsApp display
     */
    toWhatsAppFormat() {
        const stockStatus = this.stock > 0 ? `✅ Stok: ${this.stock}` : '❌ Stok Habis';
        const availability = this.isAvailable ? '' : '\n⚠️ Tidak Tersedia';
        
        let message = `🛍️ *${this.name}*\n`;
        message += `📦 SKU: ${this.sku}\n`;
        message += `💰 Harga: Rp ${this.price.toLocaleString('id-ID')}\n`;
        message += `${stockStatus}${availability}\n`;
        
        if (this.description) {
            message += `\n📝 ${this.description}\n`;
        }
        
        if (this.variants && this.variants.length > 0) {
            message += `\n🎨 Variasi:\n`;
            this.variants.forEach(variant => {
                message += `• ${variant.name}: ${variant.options.join(', ')}\n`;
            });
        }
        
        return message;
    }

    /**
     * Validate product data
     */
    validate() {
        const errors = [];
        
        if (!this.name || this.name.trim() === '') {
            errors.push('Product name is required');
        }
        
        if (this.price < 0) {
            errors.push('Price cannot be negative');
        }
        
        if (this.stock < 0) {
            errors.push('Stock cannot be negative');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if product can be purchased
     */
    canPurchase(quantity = 1) {
        return this.isAvailable && this.stock >= quantity && quantity > 0;
    }

    /**
     * Reduce stock
     */
    reduceStock(quantity) {
        if (this.stock >= quantity) {
            this.stock -= quantity;
            this.updatedAt = new Date().toISOString();
            return true;
        }
        return false;
    }
}

module.exports = Product;
