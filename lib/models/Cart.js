/**
 * Cart Model
 * Represents a shopping cart for a customer
 */
class Cart {
    constructor(customerId) {
        this.customerId = customerId;
        this.items = []; // [{productId, sku, name, price, quantity, variant, subtotal}]
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Add item to cart
     */
    addItem(product, quantity = 1, variant = null) {
        // Check if item already exists
        const existingIndex = this.items.findIndex(item => 
            item.productId === product.id && 
            JSON.stringify(item.variant) === JSON.stringify(variant)
        );

        if (existingIndex !== -1) {
            // Update quantity
            this.items[existingIndex].quantity += quantity;
            this.items[existingIndex].subtotal = this.items[existingIndex].quantity * this.items[existingIndex].price;
        } else {
            // Add new item
            this.items.push({
                productId: product.id,
                sku: product.sku,
                name: product.name,
                price: product.price,
                quantity,
                variant,
                subtotal: product.price * quantity
            });
        }

        this.updatedAt = new Date().toISOString();
    }

    /**
     * Remove item from cart
     */
    removeItem(productId, variant = null) {
        const index = this.items.findIndex(item => 
            item.productId === productId && 
            JSON.stringify(item.variant) === JSON.stringify(variant)
        );

        if (index !== -1) {
            this.items.splice(index, 1);
            this.updatedAt = new Date().toISOString();
            return true;
        }
        return false;
    }

    /**
     * Update item quantity
     */
    updateQuantity(productId, quantity, variant = null) {
        const item = this.items.find(item => 
            item.productId === productId && 
            JSON.stringify(item.variant) === JSON.stringify(variant)
        );

        if (item) {
            if (quantity <= 0) {
                return this.removeItem(productId, variant);
            }
            item.quantity = quantity;
            item.subtotal = item.price * quantity;
            this.updatedAt = new Date().toISOString();
            return true;
        }
        return false;
    }

    /**
     * Clear all items
     */
    clear() {
        this.items = [];
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Get total items count
     */
    getTotalItems() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    /**
     * Calculate cart total
     */
    getTotal() {
        return this.items.reduce((sum, item) => sum + item.subtotal, 0);
    }

    /**
     * Get cart summary for display
     */
    getSummary() {
        if (this.items.length === 0) {
            return '🛒 *Keranjang Kosong*\n\nBelum ada produk di keranjang.';
        }

        let summary = '🛒 *Keranjang Belanja*\n\n';
        
        this.items.forEach((item, index) => {
            summary += `${index + 1}. *${item.name}*\n`;
            if (item.variant) {
                summary += `   Variasi: ${JSON.stringify(item.variant)}\n`;
            }
            summary += `   ${item.quantity} x Rp ${item.price.toLocaleString('id-ID')} = Rp ${item.subtotal.toLocaleString('id-ID')}\n\n`;
        });

        summary += `━━━━━━━━━━━━━━━━\n`;
        summary += `*Total: Rp ${this.getTotal().toLocaleString('id-ID')}*\n`;
        summary += `Total Item: ${this.getTotalItems()}\n`;

        return summary;
    }

    /**
     * Validate cart before checkout
     */
    validate() {
        const errors = [];

        if (this.items.length === 0) {
            errors.push('Cart is empty');
        }

        this.items.forEach((item, index) => {
            if (item.quantity <= 0) {
                errors.push(`Item ${index + 1} has invalid quantity`);
            }
            if (item.price < 0) {
                errors.push(`Item ${index + 1} has invalid price`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if cart is empty
     */
    isEmpty() {
        return this.items.length === 0;
    }
}

module.exports = Cart;
