/**
 * Message Parser
 * Parses and extracts information from customer messages
 */

class MessageParser {
    /**
     * Parse command from message
     * Returns { command, args } or null
     */
    static parseCommand(text) {
        const trimmed = text.trim();
        const upperText = trimmed.toUpperCase();
        
        // E-commerce commands
        const commands = [
            'KATALOG', 'CATALOG',
            'KATEGORI', 'CATEGORY',
            'PRODUK', 'PRODUCT',
            'CARI', 'SEARCH',
            'BELI', 'BUY',
            'KERANJANG', 'CART',
            'HAPUS', 'REMOVE', 'DELETE',
            'KOSONGKAN', 'CLEAR',
            'CHECKOUT', 'PESAN', 'ORDER',
            'CEK', 'CHECK', 'TRACK',
            'PESANAN', 'ORDERS', 'RIWAYAT', 'HISTORY',
            'HELP', 'MENU',
            'INFO'
        ];
        
        for (const cmd of commands) {
            if (upperText.startsWith(cmd)) {
                const rest = trimmed.substring(cmd.length).trim();
                const args = rest ? rest.split(/\s+/) : [];
                return { command: cmd, args };
            }
        }
        
        return null;
    }

    /**
     * Extract SKU and quantity from message like "BELI ABC123 2"
     */
    static parseBuyCommand(args) {
        if (args.length === 0) return null;
        
        const sku = args[0];
        const quantity = args.length > 1 ? parseInt(args[1]) : 1;
        
        if (isNaN(quantity) || quantity <= 0) {
            return { sku, quantity: 1 };
        }
        
        return { sku, quantity };
    }

    /**
     * Extract order ID from message
     */
    static parseOrderId(text) {
        const match = text.match(/ORD-[A-Z0-9-]+/i);
        return match ? match[0].toUpperCase() : null;
    }

    /**
     * Check if message is a greeting
     */
    static isGreeting(text) {
        const lowerText = text.toLowerCase();
        const greetings = [
            'halo', 'hai', 'hi', 'hello', 'hey',
            'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam',
            'assalamualaikum'
        ];
        return greetings.some(g => lowerText.includes(g));
    }

    /**
     * Check if message is a thank you
     */
    static isThankYou(text) {
        const lowerText = text.toLowerCase();
        const thanks = ['terima kasih', 'thank you', 'thanks', 'makasih', 'thx'];
        return thanks.some(t => lowerText.includes(t));
    }

    /**
     * Check if message is asking about product/price
     */
    static isProductQuery(text) {
        const lowerText = text.toLowerCase();
        const keywords = ['harga', 'price', 'berapa', 'how much', 'ada', 'available', 'stok', 'stock'];
        return keywords.some(k => lowerText.includes(k));
    }

    /**
     * Normalize phone number
     */
    static normalizePhone(phone) {
        // Remove non-digits
        let cleaned = phone.replace(/\D/g, '');
        
        // Add country code if missing
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.substring(1);
        } else if (!cleaned.startsWith('62')) {
            cleaned = '62' + cleaned;
        }
        
        return cleaned;
    }

    /**
     * Format currency (IDR)
     */
    static formatCurrency(amount) {
        return `Rp ${amount.toLocaleString('id-ID')}`;
    }

    /**
     * Format date for display
     */
    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

module.exports = MessageParser;
