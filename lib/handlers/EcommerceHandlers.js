/**
 * E-commerce Message Handlers
 * Routes and handles different types of customer messages
 */

class EcommerceHandlers {
    constructor(productService, orderService, customerService) {
        this.productService = productService;
        this.orderService = orderService;
        this.customerService = customerService;
        
        // Session state for multi-step conversations
        this.sessions = new Map(); // { customerId: { state, data } }
    }

    /**
     * Get or create session for customer
     */
    getSession(customerId) {
        if (!this.sessions.has(customerId)) {
            this.sessions.set(customerId, {
                state: 'idle',
                data: {}
            });
        }
        return this.sessions.get(customerId);
    }

    /**
     * Clear session
     */
    clearSession(customerId) {
        this.sessions.delete(customerId);
    }

    /**
     * Handle catalog request
     */
    async handleCatalog(msg, args) {
        try {
            const category = args.join(' ').trim();
            const message = category 
                ? this.productService.formatCatalog(category)
                : this.productService.formatCatalog();
            
            await msg.reply(message);
        } catch (error) {
            console.error('Error in handleCatalog:', error);
            await msg.reply('❌ Maaf, terjadi kesalahan saat menampilkan katalog.');
        }
    }

    /**
     * Handle categories list
     */
    async handleCategories(msg) {
        try {
            const message = this.productService.formatCategories();
            await msg.reply(message);
        } catch (error) {
            console.error('Error in handleCategories:', error);
            await msg.reply('❌ Maaf, terjadi kesalahan saat menampilkan kategori.');
        }
    }

    /**
     * Handle product detail
     */
    async handleProductDetail(msg, sku) {
        try {
            const product = this.productService.getProductBySku(sku);
            
            if (!product) {
                await msg.reply(`❌ Produk dengan kode *${sku}* tidak ditemukan.\n\nKetik *KATALOG* untuk melihat semua produk.`);
                return;
            }
            
            const message = product.toWhatsAppFormat();
            await msg.reply(message + '\n\n💬 Ketik *BELI ' + sku + ' <jumlah>* untuk menambah ke keranjang\nContoh: BELI ' + sku + ' 2');
        } catch (error) {
            console.error('Error in handleProductDetail:', error);
            await msg.reply('❌ Maaf, terjadi kesalahan saat menampilkan detail produk.');
        }
    }

    /**
     * Handle product search
     */
    async handleSearch(msg, query) {
        try {
            const products = this.productService.searchProducts(query);
            
            if (products.length === 0) {
                await msg.reply(`🔍 Tidak ada produk yang cocok dengan "*${query}*"`);
                return;
            }
            
            let message = `🔍 *Hasil Pencarian: ${query}*\n\n`;
            products.slice(0, 10).forEach((product, index) => {
                message += `${index + 1}. *${product.name}*\n`;
                message += `   💰 Rp ${product.price.toLocaleString('id-ID')}\n`;
                message += `   📦 Stok: ${product.stock}\n`;
                message += `   📝 Kode: ${product.sku}\n\n`;
            });
            
            if (products.length > 10) {
                message += `\n... dan ${products.length - 10} produk lainnya\n`;
            }
            
            message += `\n💬 Ketik *PRODUK <kode>* untuk detail`;
            await msg.reply(message);
        } catch (error) {
            console.error('Error in handleSearch:', error);
            await msg.reply('❌ Maaf, terjadi kesalahan saat mencari produk.');
        }
    }

    /**
     * Handle add to cart
     */
    async handleAddToCart(msg, sku, quantity = 1) {
        try {
            const customerId = msg.from;
            const product = this.productService.getProductBySku(sku);
            
            if (!product) {
                await msg.reply(`❌ Produk dengan kode *${sku}* tidak ditemukan.`);
                return;
            }
            
            if (!product.canPurchase(quantity)) {
                await msg.reply(`❌ Maaf, produk *${product.name}* tidak dapat dibeli.\n\nStok tersedia: ${product.stock}`);
                return;
            }
            
            const cart = this.customerService.getCart(customerId);
            cart.addItem(product, quantity);
            await this.customerService.saveCart(customerId);
            
            await msg.reply(`✅ *${product.name}* (${quantity}x) berhasil ditambahkan ke keranjang!\n\n💬 Ketik *KERANJANG* untuk melihat keranjang\n💬 Ketik *CHECKOUT* untuk melanjutkan pemesanan`);
        } catch (error) {
            console.error('Error in handleAddToCart:', error);
            await msg.reply('❌ Maaf, terjadi kesalahan saat menambahkan produk ke keranjang.');
        }
    }

    /**
     * Handle view cart
     */
    async handleViewCart(msg) {
        try {
            const customerId = msg.from;
            const cart = this.customerService.getCart(customerId);
            
            const message = cart.getSummary();
            await msg.reply(message + (cart.isEmpty() ? '' : '\n\n💬 Ketik *CHECKOUT* untuk melanjutkan\n💬 Ketik *HAPUS <no>* untuk hapus item'));
        } catch (error) {
            console.error('Error in handleViewCart:', error);
            await msg.reply('❌ Maaf, terjadi kesalahan saat menampilkan keranjang.');
        }
    }

    /**
     * Handle remove from cart
     */
    async handleRemoveFromCart(msg, itemIndex) {
        try {
            const customerId = msg.from;
            const cart = this.customerService.getCart(customerId);
            
            const index = parseInt(itemIndex) - 1;
            if (index < 0 || index >= cart.items.length) {
                await msg.reply('❌ Nomor item tidak valid.');
                return;
            }
            
            const item = cart.items[index];
            cart.items.splice(index, 1);
            await this.customerService.saveCart(customerId);
            
            await msg.reply(`✅ *${item.name}* dihapus dari keranjang.\n\n💬 Ketik *KERANJANG* untuk melihat keranjang`);
        } catch (error) {
            console.error('Error in handleRemoveFromCart:', error);
            await msg.reply('❌ Maaf, terjadi kesalahan saat menghapus item.');
        }
    }

    /**
     * Handle clear cart
     */
    async handleClearCart(msg) {
        try {
            const customerId = msg.from;
            await this.customerService.clearCart(customerId);
            await msg.reply('✅ Keranjang berhasil dikosongkan.');
        } catch (error) {
            console.error('Error in handleClearCart:', error);
            await msg.reply('❌ Maaf, terjadi kesalahan saat mengosongkan keranjang.');
        }
    }

    /**
     * Handle checkout - start checkout process
     */
    async handleCheckout(msg) {
        try {
            const customerId = msg.from;
            const cart = this.customerService.getCart(customerId);
            
            if (cart.isEmpty()) {
                await msg.reply('❌ Keranjang Anda kosong.\n\n💬 Ketik *KATALOG* untuk mulai belanja.');
                return;
            }
            
            const customer = await this.customerService.getOrCreateCustomer(customerId);
            const session = this.getSession(customerId);
            
            // Show cart summary
            let message = cart.getSummary();
            message += '\n\n━━━━━━━━━━━━━━━━\n';
            message += '📝 *Proses Checkout*\n\n';
            
            // Ask for name if not set
            if (!customer.name) {
                session.state = 'checkout_name';
                session.data = { cart };
                message += '👤 Silakan masukkan nama Anda:';
            } else {
                session.state = 'checkout_address';
                session.data = { cart, name: customer.name };
                message += '📍 Silakan masukkan alamat pengiriman lengkap:';
            }
            
            await msg.reply(message);
        } catch (error) {
            console.error('Error in handleCheckout:', error);
            await msg.reply('❌ Maaf, terjadi kesalahan saat memproses checkout.');
        }
    }

    /**
     * Handle checkout flow (multi-step)
     */
    async handleCheckoutFlow(msg, text) {
        try {
            const customerId = msg.from;
            const session = this.getSession(customerId);
            
            if (session.state === 'checkout_name') {
                // Save name
                session.data.name = text.trim();
                const customer = await this.customerService.getOrCreateCustomer(customerId);
                await this.customerService.updateCustomer(customerId, { name: session.data.name });
                
                // Move to address
                session.state = 'checkout_address';
                await msg.reply('✅ Terima kasih!\n\n📍 Silakan masukkan alamat pengiriman lengkap:');
                return true;
            }
            
            if (session.state === 'checkout_address') {
                // Save address
                session.data.address = text.trim();
                
                // Move to confirmation
                session.state = 'checkout_confirm';
                
                const cart = session.data.cart;
                let message = '📋 *Konfirmasi Pesanan*\n\n';
                message += `👤 Nama: ${session.data.name}\n`;
                message += `📍 Alamat: ${session.data.address}\n\n`;
                message += cart.getSummary();
                message += '\n\n━━━━━━━━━━━━━━━━\n';
                message += '✅ Ketik *YA* untuk konfirmasi\n';
                message += '❌ Ketik *BATAL* untuk membatalkan';
                
                await msg.reply(message);
                return true;
            }
            
            if (session.state === 'checkout_confirm') {
                const textLower = text.toLowerCase().trim();
                
                if (textLower === 'ya' || textLower === 'yes' || textLower === 'ok') {
                    // Create order
                    const cart = session.data.cart;
                    const customer = await this.customerService.getOrCreateCustomer(customerId);
                    
                    const orderData = {
                        customerId: customer.id,
                        customerName: session.data.name,
                        customerPhone: customer.phone,
                        items: cart.items,
                        subtotal: cart.getTotal(),
                        shippingCost: 0, // Will be calculated by website
                        total: cart.getTotal(),
                        shippingAddress: {
                            street: session.data.address
                        },
                        status: 'pending',
                        paymentStatus: 'unpaid'
                    };
                    
                    const order = await this.orderService.createOrder(orderData);
                    await this.customerService.addOrderToCustomer(customerId, order.id);
                    await this.customerService.clearCart(customerId);
                    
                    this.clearSession(customerId);
                    
                    let message = '✅ *Pesanan Berhasil Dibuat!*\n\n';
                    message += order.toWhatsAppFormat();
                    message += '\n\n━━━━━━━━━━━━━━━━\n';
                    message += 'Tim kami akan segera menghubungi Anda untuk konfirmasi pembayaran dan pengiriman.\n\n';
                    message += '💬 Ketik *CEK <order-id>* untuk melihat status pesanan';
                    
                    await msg.reply(message);
                    return true;
                } else if (textLower === 'batal' || textLower === 'cancel') {
                    this.clearSession(customerId);
                    await msg.reply('❌ Pesanan dibatalkan. Keranjang Anda masih tersimpan.\n\n💬 Ketik *KERANJANG* untuk melihat keranjang');
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error in handleCheckoutFlow:', error);
            this.clearSession(msg.from);
            await msg.reply('❌ Maaf, terjadi kesalahan saat memproses checkout. Silakan coba lagi.');
            return true;
        }
    }

    /**
     * Handle order tracking
     */
    async handleOrderTracking(msg, orderId) {
        try {
            const order = this.orderService.getOrderById(orderId);
            
            if (!order) {
                await msg.reply(`❌ Pesanan dengan ID *${orderId}* tidak ditemukan.`);
                return;
            }
            
            const customerId = msg.from;
            if (order.customerId !== customerId) {
                await msg.reply('❌ Anda tidak memiliki akses ke pesanan ini.');
                return;
            }
            
            await msg.reply(order.toWhatsAppFormat());
        } catch (error) {
            console.error('Error in handleOrderTracking:', error);
            await msg.reply('❌ Maaf, terjadi kesalahan saat memeriksa pesanan.');
        }
    }

    /**
     * Handle order history
     */
    async handleOrderHistory(msg) {
        try {
            const customerId = msg.from;
            const orders = this.orderService.getOrdersByCustomer(customerId);
            
            if (orders.length === 0) {
                await msg.reply('📋 Anda belum memiliki riwayat pesanan.\n\n💬 Ketik *KATALOG* untuk mulai belanja.');
                return;
            }
            
            let message = '📋 *Riwayat Pesanan Anda*\n\n';
            orders.slice(0, 10).forEach((order, index) => {
                message += `${index + 1}. *${order.id}*\n`;
                message += `   ${order.getStatusEmoji()} ${order.getStatusText()}\n`;
                message += `   💰 Rp ${order.total.toLocaleString('id-ID')}\n`;
                message += `   📅 ${new Date(order.createdAt).toLocaleDateString('id-ID')}\n\n`;
            });
            
            if (orders.length > 10) {
                message += `... dan ${orders.length - 10} pesanan lainnya\n\n`;
            }
            
            message += '💬 Ketik *CEK <order-id>* untuk detail pesanan';
            await msg.reply(message);
        } catch (error) {
            console.error('Error in handleOrderHistory:', error);
            await msg.reply('❌ Maaf, terjadi kesalahan saat menampilkan riwayat pesanan.');
        }
    }

    /**
     * Handle help/menu
     */
    async handleHelp(msg, adminInfo = null) {
        const message = `🤖 *Menu Bot E-Commerce*\n\n` +
            `📦 *Katalog & Produk*\n` +
            `• KATALOG - Lihat semua produk\n` +
            `• KATEGORI - Lihat kategori produk\n` +
            `• PRODUK <kode> - Detail produk\n` +
            `• CARI <kata kunci> - Cari produk\n\n` +
            
            `🛒 *Keranjang & Pemesanan*\n` +
            `• BELI <kode> <jumlah> - Tambah ke keranjang\n` +
            `• KERANJANG - Lihat keranjang\n` +
            `• HAPUS <no> - Hapus item dari keranjang\n` +
            `• KOSONGKAN - Kosongkan keranjang\n` +
            `• CHECKOUT - Proses pemesanan\n\n` +
            
            `📋 *Pesanan*\n` +
            `• CEK <order-id> - Cek status pesanan\n` +
            `• PESANAN - Riwayat pesanan\n\n` +
            
            `ℹ️ *Lainnya*\n` +
            `• HELP - Tampilkan menu ini\n` +
            `• INFO - Informasi toko\n\n` +
            
            `💬 Contoh penggunaan:\n` +
            `• BELI ABC123 2\n` +
            `• PRODUK ABC123\n` +
            `• CEK ORD-123ABC`;
        
        await msg.reply(message);
    }

    /**
     * Handle store info
     */
    async handleStoreInfo(msg) {
        const stats = this.productService.getAllProducts().length;
        const categories = this.productService.getCategories().length;
        
        const message = `ℹ️ *Informasi Toko*\n\n` +
            `Selamat datang di toko kami!\n\n` +
            `📦 Total Produk: ${stats}\n` +
            `📂 Kategori: ${categories}\n\n` +
            `💬 Ketik *HELP* untuk melihat menu\n` +
            `💬 Ketik *KATALOG* untuk mulai belanja`;
        
        await msg.reply(message);
    }
}

module.exports = EcommerceHandlers;
