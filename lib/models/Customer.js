/**
 * Customer Model
 * Represents a customer/user in the system
 */
class Customer {
    constructor(data) {
        this.id = data.id || data.phone; // Use phone as ID
        this.phone = data.phone || '';
        this.name = data.name || '';
        this.email = data.email || '';
        this.addresses = data.addresses || [];
        this.orders = data.orders || [];
        this.cart = data.cart || null;
        this.lastInteraction = data.lastInteraction || new Date().toISOString();
        this.createdAt = data.createdAt || new Date().toISOString();
        this.metadata = data.metadata || {}; // Extra fields for website sync
    }

    /**
     * Add address
     */
    addAddress(address) {
        this.addresses.push({
            id: this.addresses.length + 1,
            ...address,
            createdAt: new Date().toISOString()
        });
    }

    /**
     * Get default address
     */
    getDefaultAddress() {
        const defaultAddr = this.addresses.find(addr => addr.isDefault);
        return defaultAddr || this.addresses[0] || null;
    }

    /**
     * Add order
     */
    addOrder(orderId) {
        if (!this.orders.includes(orderId)) {
            this.orders.push(orderId);
        }
    }

    /**
     * Update last interaction
     */
    updateInteraction() {
        this.lastInteraction = new Date().toISOString();
    }

    /**
     * Get customer summary
     */
    getSummary() {
        let summary = `👤 *Profil Pelanggan*\n\n`;
        summary += `Nama: ${this.name || 'Belum diset'}\n`;
        summary += `No. HP: ${this.phone}\n`;
        
        if (this.email) {
            summary += `Email: ${this.email}\n`;
        }
        
        summary += `Total Pesanan: ${this.orders.length}\n`;
        
        if (this.addresses.length > 0) {
            summary += `\n📍 *Alamat Tersimpan:* ${this.addresses.length}\n`;
        }
        
        return summary;
    }

    /**
     * Validate customer data
     */
    validate() {
        const errors = [];

        if (!this.phone || this.phone.trim() === '') {
            errors.push('Phone number is required');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = Customer;
