/**
 * Order Model
 * Represents a customer order
 */
class Order {
    constructor(data) {
        this.id = data.id || this.generateOrderId();
        this.customerId = data.customerId || null;
        this.customerName = data.customerName || '';
        this.customerPhone = data.customerPhone || '';
        this.items = data.items || [];
        this.subtotal = data.subtotal || 0;
        this.shippingCost = data.shippingCost || 0;
        this.total = data.total || 0;
        this.status = data.status || 'pending'; // pending, confirmed, processing, shipped, delivered, cancelled
        this.paymentStatus = data.paymentStatus || 'unpaid'; // unpaid, paid, refunded
        this.paymentMethod = data.paymentMethod || null;
        this.shippingAddress = data.shippingAddress || {};
        this.notes = data.notes || '';
        this.trackingNumber = data.trackingNumber || null;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.paidAt = data.paidAt || null;
        this.shippedAt = data.shippedAt || null;
        this.deliveredAt = data.deliveredAt || null;
    }

    /**
     * Generate unique order ID
     */
    generateOrderId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `ORD-${timestamp}-${random}`.toUpperCase();
    }

    /**
     * Format order for WhatsApp display
     */
    toWhatsAppFormat() {
        let message = `📋 *Detail Pesanan*\n\n`;
        message += `🆔 Order ID: ${this.id}\n`;
        message += `👤 Nama: ${this.customerName}\n`;
        message += `📞 No. HP: ${this.customerPhone}\n`;
        message += `📅 Tanggal: ${new Date(this.createdAt).toLocaleString('id-ID')}\n`;
        message += `\n━━━━━━━━━━━━━━━━\n\n`;

        // Items
        message += `🛍️ *Produk:*\n`;
        this.items.forEach((item, index) => {
            message += `${index + 1}. ${item.name}\n`;
            if (item.variant) {
                message += `   Variasi: ${JSON.stringify(item.variant)}\n`;
            }
            message += `   ${item.quantity} x Rp ${item.price.toLocaleString('id-ID')} = Rp ${item.subtotal.toLocaleString('id-ID')}\n`;
        });

        // Totals
        message += `\n━━━━━━━━━━━━━━━━\n`;
        message += `Subtotal: Rp ${this.subtotal.toLocaleString('id-ID')}\n`;
        message += `Ongkir: Rp ${this.shippingCost.toLocaleString('id-ID')}\n`;
        message += `*Total: Rp ${this.total.toLocaleString('id-ID')}*\n`;

        // Status
        message += `\n━━━━━━━━━━━━━━━━\n`;
        message += `📦 Status: ${this.getStatusEmoji()} ${this.getStatusText()}\n`;
        message += `💳 Pembayaran: ${this.getPaymentStatusEmoji()} ${this.getPaymentStatusText()}\n`;

        if (this.trackingNumber) {
            message += `🚚 Resi: ${this.trackingNumber}\n`;
        }

        // Shipping address
        if (this.shippingAddress && Object.keys(this.shippingAddress).length > 0) {
            message += `\n📍 *Alamat Pengiriman:*\n`;
            message += this.formatAddress();
        }

        // Notes
        if (this.notes) {
            message += `\n📝 Catatan: ${this.notes}\n`;
        }

        return message;
    }

    /**
     * Format address
     */
    formatAddress() {
        const addr = this.shippingAddress;
        let formatted = '';
        
        if (addr.street) formatted += `${addr.street}\n`;
        if (addr.city) formatted += `${addr.city}`;
        if (addr.province) formatted += `, ${addr.province}`;
        if (addr.postalCode) formatted += ` ${addr.postalCode}`;
        formatted += '\n';
        
        return formatted;
    }

    /**
     * Get status emoji
     */
    getStatusEmoji() {
        const emojiMap = {
            'pending': '⏳',
            'confirmed': '✅',
            'processing': '⚙️',
            'shipped': '🚚',
            'delivered': '📦',
            'cancelled': '❌'
        };
        return emojiMap[this.status] || '❓';
    }

    /**
     * Get status text
     */
    getStatusText() {
        const textMap = {
            'pending': 'Menunggu Konfirmasi',
            'confirmed': 'Dikonfirmasi',
            'processing': 'Diproses',
            'shipped': 'Dikirim',
            'delivered': 'Diterima',
            'cancelled': 'Dibatalkan'
        };
        return textMap[this.status] || 'Unknown';
    }

    /**
     * Get payment status emoji
     */
    getPaymentStatusEmoji() {
        const emojiMap = {
            'unpaid': '⏳',
            'paid': '✅',
            'refunded': '↩️'
        };
        return emojiMap[this.paymentStatus] || '❓';
    }

    /**
     * Get payment status text
     */
    getPaymentStatusText() {
        const textMap = {
            'unpaid': 'Belum Dibayar',
            'paid': 'Lunas',
            'refunded': 'Dikembalikan'
        };
        return textMap[this.paymentStatus] || 'Unknown';
    }

    /**
     * Update order status
     */
    updateStatus(newStatus) {
        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
        
        if (!validStatuses.includes(newStatus)) {
            return false;
        }

        this.status = newStatus;
        this.updatedAt = new Date().toISOString();

        // Auto-update timestamps
        if (newStatus === 'shipped' && !this.shippedAt) {
            this.shippedAt = new Date().toISOString();
        }
        if (newStatus === 'delivered' && !this.deliveredAt) {
            this.deliveredAt = new Date().toISOString();
        }

        return true;
    }

    /**
     * Update payment status
     */
    updatePaymentStatus(newStatus) {
        const validStatuses = ['unpaid', 'paid', 'refunded'];
        
        if (!validStatuses.includes(newStatus)) {
            return false;
        }

        this.paymentStatus = newStatus;
        this.updatedAt = new Date().toISOString();

        if (newStatus === 'paid' && !this.paidAt) {
            this.paidAt = new Date().toISOString();
        }

        return true;
    }

    /**
     * Validate order
     */
    validate() {
        const errors = [];

        if (!this.customerId) {
            errors.push('Customer ID is required');
        }

        if (!this.customerName || this.customerName.trim() === '') {
            errors.push('Customer name is required');
        }

        if (!this.customerPhone || this.customerPhone.trim() === '') {
            errors.push('Customer phone is required');
        }

        if (!this.items || this.items.length === 0) {
            errors.push('Order must have at least one item');
        }

        if (this.total <= 0) {
            errors.push('Order total must be greater than zero');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Calculate totals
     */
    calculateTotals() {
        this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
        this.total = this.subtotal + this.shippingCost;
        this.updatedAt = new Date().toISOString();
    }
}

module.exports = Order;
