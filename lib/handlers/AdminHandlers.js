const AdminAuth = require('../utils/AdminAuth');

class AdminHandlers {
    constructor(productService, orderService, customerService) {
        this.productService = productService;
        this.orderService = orderService;
        this.customerService = customerService;
        
        // Session management for admin flow
        this.adminSessions = new Map();
    }

    /**
     * Get or create admin session
     */
    getAdminSession(adminId) {
        if (!this.adminSessions.has(adminId)) {
            this.adminSessions.set(adminId, {
                state: 'idle',
                data: {}
            });
        }
        return this.adminSessions.get(adminId);
    }

    /**
     * Clear admin session
     */
    clearAdminSession(adminId) {
        this.adminSessions.delete(adminId);
    }

    /**
     * Handle admin panel trigger (e.g., sending "9090" or "PANEL")
     */
    async handleAdminPanel(msg) {
        const sender = msg.from;
        const adminInfo = AdminAuth.getAdminInfo(sender);

        if (adminInfo.level === 'user') {
            await msg.reply('❌ Akses ditolak. Anda bukan admin.');
            return;
        }

        const session = this.getAdminSession(sender);
        session.state = 'admin_menu';

        let menuText = '🔐 *ADMIN PANEL*\n\n';
        menuText += `👤 Admin: ${adminInfo.level === 'super_admin' ? 'Super Admin' : 'Admin'}\n`;
        menuText += `🎯 Akses: ${adminInfo.permissions.join(', ')}\n\n`;
        menuText += '━━━━━━━━━━━━━━━━━━━━\n\n';
        menuText += '*Pilih Menu:*\n\n';

        if (AdminAuth.canManageProducts(sender)) {
            menuText += '1️⃣ Manajemen Produk\n';
        }
        if (AdminAuth.canManageOrders(sender)) {
            menuText += '2️⃣ Manajemen Pesanan\n';
        }

        menuText += '0️⃣ Keluar\n\n';
        menuText += '💬 *Balas dengan angka pilihan*';

        await msg.reply(menuText);
    }

    /**
     * Handle admin menu flow
     */
    async handleAdminFlow(msg, messageText) {
        const sender = msg.from;
        const session = this.getAdminSession(sender);

        if (session.state === 'idle') return false;

        const text = messageText.trim();

        // ADMIN MENU
        if (session.state === 'admin_menu') {
            if (text === '1') {
                await this.showProductMenu(msg);
                return true;
            } else if (text === '2') {
                await msg.reply('📋 Manajemen Pesanan (Coming Soon)');
                this.clearAdminSession(sender);
                return true;
            } else if (text === '0') {
                await msg.reply('👋 Keluar dari Admin Panel');
                this.clearAdminSession(sender);
                return true;
            }
        }

        // PRODUCT MENU
        else if (session.state === 'product_menu') {
            if (text === '1') {
                await this.startAddProduct(msg);
                return true;
            } else if (text === '2') {
                await this.startEditProduct(msg);
                return true;
            } else if (text === '3') {
                await this.startDeleteProduct(msg);
                return true;
            } else if (text === '0') {
                await this.handleAdminPanel(msg);
                return true;
            }
        }

        // ADD PRODUCT FLOW
        else if (session.state === 'add_product_name') {
            session.data.name = text;
            session.state = 'add_product_description';
            await msg.reply('📝 *Deskripsi Produk:*\n(Jelaskan detail produk)');
            return true;
        }
        else if (session.state === 'add_product_description') {
            session.data.description = text;
            session.state = 'add_product_price';
            await msg.reply('💰 *Harga Produk:*\n(Masukkan angka saja, contoh: 50000)');
            return true;
        }
        else if (session.state === 'add_product_price') {
            const price = parseInt(text);
            if (isNaN(price) || price <= 0) {
                await msg.reply('❌ Harga harus berupa angka positif!\n\nSilakan masukkan harga lagi:');
                return true;
            }
            session.data.price = price;
            session.state = 'add_product_stock';
            await msg.reply('📊 *Stok Produk:*\n(Masukkan jumlah stok)');
            return true;
        }
        else if (session.state === 'add_product_stock') {
            const stock = parseInt(text);
            if (isNaN(stock) || stock < 0) {
                await msg.reply('❌ Stok harus berupa angka!\n\nSilakan masukkan stok lagi:');
                return true;
            }
            session.data.stock = stock;
            session.state = 'add_product_category';
            await msg.reply('📂 *Kategori Produk:*\n(Contoh: oli, ban, sparepart, aksesori)');
            return true;
        }
        else if (session.state === 'add_product_category') {
            session.data.category = text.toLowerCase();
            session.state = 'add_product_image';
            await msg.reply('📷 *Gambar Produk:*\n\n✅ Kirim gambar produk sekarang\n❌ Atau ketik *SKIP* untuk lewati');
            return true;
        }
        else if (session.state === 'add_product_image') {
            if (text.toUpperCase() === 'SKIP') {
                await this.saveNewProduct(msg, session);
                return true;
            }
            // Wait for image (handled in separate image handler)
            await msg.reply('⏳ Menunggu gambar...\n\nSilakan kirim gambar atau ketik *SKIP*');
            return true;
        }

        // EDIT PRODUCT FLOW
        else if (session.state === 'edit_product_select') {
            const products = this.productService.getAllProducts();
            const index = parseInt(text) - 1;
            
            if (isNaN(index) || index < 0 || index >= products.length) {
                await msg.reply('❌ Nomor tidak valid!\n\nSilakan pilih nomor produk yang benar:');
                return true;
            }

            session.data.product = products[index];
            await this.showEditProductForm(msg, session);
            return true;
        }
        else if (session.state === 'edit_product_name') {
            session.data.updates.name = text;
            session.state = 'edit_product_description';
            await msg.reply(`📝 *Deskripsi Produk:*\n\nLama: ${session.data.product.description || '-'}\n\nMasukkan deskripsi baru atau ketik *SKIP*:`);
            return true;
        }
        else if (session.state === 'edit_product_description') {
            if (text.toUpperCase() !== 'SKIP') {
                session.data.updates.description = text;
            }
            session.state = 'edit_product_price';
            await msg.reply(`💰 *Harga Produk:*\n\nLama: Rp ${session.data.product.price.toLocaleString('id-ID')}\n\nMasukkan harga baru atau ketik *SKIP*:`);
            return true;
        }
        else if (session.state === 'edit_product_price') {
            if (text.toUpperCase() !== 'SKIP') {
                const price = parseInt(text);
                if (isNaN(price) || price <= 0) {
                    await msg.reply('❌ Harga harus berupa angka positif!\n\nSilakan masukkan harga lagi:');
                    return true;
                }
                session.data.updates.price = price;
            }
            session.state = 'edit_product_stock';
            await msg.reply(`📊 *Stok Produk:*\n\nLama: ${session.data.product.stock}\n\nMasukkan stok baru atau ketik *SKIP*:`);
            return true;
        }
        else if (session.state === 'edit_product_stock') {
            if (text.toUpperCase() !== 'SKIP') {
                const stock = parseInt(text);
                if (isNaN(stock) || stock < 0) {
                    await msg.reply('❌ Stok harus berupa angka!\n\nSilakan masukkan stok lagi:');
                    return true;
                }
                session.data.updates.stock = stock;
            }
            session.state = 'edit_product_category';
            await msg.reply(`📂 *Kategori Produk:*\n\nLama: ${session.data.product.category}\n\nMasukkan kategori baru atau ketik *SKIP*:`);
            return true;
        }
        else if (session.state === 'edit_product_category') {
            if (text.toUpperCase() !== 'SKIP') {
                session.data.updates.category = text.toLowerCase();
            }
            session.state = 'edit_product_image';
            await msg.reply('📷 *Gambar Produk:*\n\n✅ Kirim gambar baru\n❌ Atau ketik *SKIP* untuk lewati');
            return true;
        }
        else if (session.state === 'edit_product_image') {
            if (text.toUpperCase() === 'SKIP') {
                await this.saveProductUpdate(msg, session);
                return true;
            }
            await msg.reply('⏳ Menunggu gambar...\n\nSilakan kirim gambar atau ketik *SKIP*');
            return true;
        }

        // DELETE PRODUCT FLOW
        else if (session.state === 'delete_product_select') {
            const products = this.productService.getAllProducts();
            const index = parseInt(text) - 1;
            
            if (isNaN(index) || index < 0 || index >= products.length) {
                await msg.reply('❌ Nomor tidak valid!\n\nSilakan pilih nomor produk yang benar:');
                return true;
            }

            const product = products[index];
            session.state = 'delete_product_confirm';
            session.data.product = product;

            await msg.reply(
                `⚠️ *KONFIRMASI HAPUS PRODUK*\n\n` +
                `📦 ID: ${product.id}\n` +
                `🏷️ Nama: ${product.name}\n` +
                `💰 Harga: Rp ${product.price.toLocaleString('id-ID')}\n\n` +
                `Yakin ingin menghapus produk ini?\n\n` +
                `1️⃣ Ya, Hapus\n` +
                `0️⃣ Batal`
            );
            return true;
        }
        else if (session.state === 'delete_product_confirm') {
            if (text === '1') {
                await this.deleteProduct(msg, session);
                return true;
            } else if (text === '0') {
                await msg.reply('❌ Penghapusan dibatalkan');
                await this.showProductMenu(msg);
                return true;
            }
        }

        return false;
    }

    /**
     * Show product menu
     */
    async showProductMenu(msg) {
        const sender = msg.from;
        const session = this.getAdminSession(sender);
        session.state = 'product_menu';

        const products = this.productService.getAllProducts();

        let menuText = '📦 *MANAJEMEN PRODUK*\n\n';
        menuText += `Total Produk: ${products.length}\n\n`;
        menuText += '━━━━━━━━━━━━━━━━━━━━\n\n';
        
        // Show product list
        menuText += '*Daftar Produk:*\n\n';
        products.forEach((p, i) => {
            menuText += `${i + 1}. ${p.name} (ID: ${p.id})\n`;
            menuText += `   Rp ${p.price.toLocaleString('id-ID')} | Stok: ${p.stock}\n\n`;
        });

        menuText += '━━━━━━━━━━━━━━━━━━━━\n\n';
        menuText += '*Menu:*\n\n';
        menuText += '1️⃣ Tambah Produk\n';
        menuText += '2️⃣ Ubah Produk\n';
        menuText += '3️⃣ Hapus Produk\n';
        menuText += '0️⃣ Kembali\n\n';
        menuText += '💬 *Balas dengan angka pilihan*';

        await msg.reply(menuText);
    }

    /**
     * Start add product flow
     */
    async startAddProduct(msg) {
        const sender = msg.from;
        const session = this.getAdminSession(sender);
        session.state = 'add_product_name';
        session.data = {};

        await msg.reply(
            '➕ *TAMBAH PRODUK BARU*\n\n' +
            'Silakan isi data produk:\n\n' +
            '🏷️ *Nama Produk:*\n' +
            '(Contoh: Yamalube Racing 1L)'
        );
    }

    /**
     * Start edit product flow
     */
    async startEditProduct(msg) {
        const sender = msg.from;
        const session = this.getAdminSession(sender);
        const products = this.productService.getAllProducts();

        if (products.length === 0) {
            await msg.reply('❌ Tidak ada produk untuk diubah');
            await this.showProductMenu(msg);
            return;
        }

        session.state = 'edit_product_select';
        session.data = {};

        let selectText = '✏️ *UBAH PRODUK*\n\n';
        selectText += 'Pilih nomor produk yang ingin diubah:\n\n';
        
        products.forEach((p, i) => {
            selectText += `${i + 1}. ${p.name} (ID: ${p.id})\n`;
            selectText += `   Rp ${p.price.toLocaleString('id-ID')} | Stok: ${p.stock}\n\n`;
        });

        selectText += '💬 *Balas dengan nomor produk*';

        await msg.reply(selectText);
    }

    /**
     * Show edit product form
     */
    async showEditProductForm(msg, session) {
        const product = session.data.product;
        session.state = 'edit_product_name';
        session.data.updates = {};

        await msg.reply(
            `✏️ *EDIT PRODUK: ${product.name}*\n\n` +
            `Isi data yang ingin diubah (ketik *SKIP* untuk lewati):\n\n` +
            `🏷️ *Nama Produk:*\n\n` +
            `Lama: ${product.name}\n\n` +
            `Masukkan nama baru atau ketik *SKIP*:`
        );
    }

    /**
     * Start delete product flow
     */
    async startDeleteProduct(msg) {
        const sender = msg.from;
        const session = this.getAdminSession(sender);
        const products = this.productService.getAllProducts();

        if (products.length === 0) {
            await msg.reply('❌ Tidak ada produk untuk dihapus');
            await this.showProductMenu(msg);
            return;
        }

        session.state = 'delete_product_select';
        session.data = {};

        let selectText = '🗑️ *HAPUS PRODUK*\n\n';
        selectText += 'Pilih nomor produk yang ingin dihapus:\n\n';
        
        products.forEach((p, i) => {
            selectText += `${i + 1}. ${p.name} (ID: ${p.id})\n`;
            selectText += `   Rp ${p.price.toLocaleString('id-ID')} | Stok: ${p.stock}\n\n`;
        });

        selectText += '💬 *Balas dengan nomor produk*';

        await msg.reply(selectText);
    }

    /**
     * Save new product
     */
    async saveNewProduct(msg, session) {
        try {
            const sender = msg.from;
            const data = session.data;

            const newProduct = {
                name: data.name,
                description: data.description || '',
                price: data.price,
                stock: data.stock,
                category: data.category,
                image: data.image || '',
                addedBy: sender,
                addedAt: new Date().toISOString()
            };

            const result = await this.productService.addProduct(newProduct);

            await msg.reply(
                '✅ *PRODUK BERHASIL DITAMBAHKAN*\n\n' +
                `📦 ID: ${result.id}\n` +
                `🏷️ Nama: ${data.name}\n` +
                `💰 Harga: Rp ${data.price.toLocaleString('id-ID')}\n` +
                `📊 Stok: ${data.stock}\n` +
                `📂 Kategori: ${data.category}\n\n` +
                'Produk sudah tersedia di katalog!'
            );

            this.clearAdminSession(sender);
            await this.showProductMenu(msg);

        } catch (error) {
            console.error('Error saving product:', error);
            await msg.reply('❌ Gagal menyimpan produk: ' + error.message);
            this.clearAdminSession(msg.from);
        }
    }

    /**
     * Save product update
     */
    async saveProductUpdate(msg, session) {
        try {
            const sender = msg.from;
            const product = session.data.product;
            const updates = session.data.updates;

            if (Object.keys(updates).length === 0) {
                await msg.reply('ℹ️ Tidak ada perubahan pada produk');
                this.clearAdminSession(sender);
                await this.showProductMenu(msg);
                return;
            }

            // Use product.id or product.sku (whichever exists)
            const productKey = product.sku || product.id;
            await this.productService.updateProduct(productKey, updates);

            let changesText = '';
            for (const [key, value] of Object.entries(updates)) {
                changesText += `• ${key}: ${value}\n`;
            }

            await msg.reply(
                '✅ *PRODUK BERHASIL DIUPDATE*\n\n' +
                `📦 ID: ${product.id}\n` +
                `🏷️ Nama: ${updates.name || product.name}\n\n` +
                `*Perubahan:*\n${changesText}\n` +
                'Produk sudah diupdate!'
            );

            this.clearAdminSession(sender);
            await this.showProductMenu(msg);

        } catch (error) {
            console.error('Error updating product:', error);
            await msg.reply('❌ Gagal mengupdate produk: ' + error.message);
            this.clearAdminSession(msg.from);
        }
    }

    /**
     * Delete product
     */
    async deleteProduct(msg, session) {
        try {
            const sender = msg.from;
            const product = session.data.product;

            // Use product.id or product.sku (whichever exists)
            const productKey = product.sku || product.id;
            await this.productService.deleteProduct(productKey);

            await msg.reply(
                '✅ *PRODUK BERHASIL DIHAPUS*\n\n' +
                `📦 ID: ${product.id}\n` +
                `🏷️ Nama: ${product.name}\n\n` +
                'Produk telah dihapus dari katalog!'
            );

            this.clearAdminSession(sender);
            await this.showProductMenu(msg);

        } catch (error) {
            console.error('Error deleting product:', error);
            await msg.reply('❌ Gagal menghapus produk: ' + error.message);
            this.clearAdminSession(msg.from);
        }
    }

    /**
     * Handle image upload
     */
    async handleImageUpload(msg, session) {
        try {
            if (!msg.hasMedia) return false;

            const media = await msg.downloadMedia();
            
            if (!media.mimetype.startsWith('image/')) {
                await msg.reply('❌ File harus berupa gambar!');
                return true;
            }

            // Save image (you can implement storage logic here)
            const imageUrl = `data:${media.mimetype};base64,${media.data}`;
            
            if (session.state === 'add_product_image') {
                session.data.image = imageUrl;
                await this.saveNewProduct(msg, session);
                return true;
            } else if (session.state === 'edit_product_image') {
                session.data.updates.image = imageUrl;
                await this.saveProductUpdate(msg, session);
                return true;
            }

        } catch (error) {
            console.error('Error handling image:', error);
            await msg.reply('❌ Gagal mengupload gambar: ' + error.message);
        }
        return false;
    }

    /**
     * Generate SKU
     */
    generateSKU(category) {
        const prefix = category.substring(0, 3).toUpperCase();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}${random}`;
    }
}

module.exports = AdminHandlers;
