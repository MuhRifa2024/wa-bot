/**
 * WebChatService
 * Manages live chat dari customer website → WhatsApp admin
 * Dan reply dari WhatsApp admin → website customer
 */

class WebChatService {
    constructor(dbAdapter = null, whatsappClient = null) {
        this.dbAdapter = dbAdapter;
        this.whatsappClient = whatsappClient;
        this.adminPhoneNumber = process.env.ADMIN_WHATSAPP || null;
        this.isMySQL = dbAdapter !== null;
        
        // In-memory storage untuk mode standalone
        this.webChats = new Map(); // sessionId -> messages[]
        this.sessionData = new Map(); // sessionId -> { name, email, phone, createdAt }
    }

    /**
     * Initialize service
     */
    async initialize() {
        if (!this.adminPhoneNumber) {
            console.warn('⚠️  ADMIN_WHATSAPP tidak di-set. Web chat akan tersimpan tapi tidak dikirim ke WhatsApp.');
        }
        
        if (this.isMySQL) {
            console.log('✅ WebChatService initialized (MySQL mode)');
        } else {
            console.log('✅ WebChatService initialized (Standalone mode)');
        }
    }

    /**
     * Receive message from website customer
     * Store in database dan forward ke WhatsApp admin
     */
    async receiveWebChatMessage(data) {
        const { sessionId, message, customerName, customerEmail, customerPhone, metadata = {} } = data;

        if (!sessionId || !message) {
            throw new Error('sessionId dan message required');
        }

        const timestamp = new Date();
        const messageId = this.generateMessageId();

        // Save message to database or memory
        if (this.isMySQL) {
            await this.saveToDatabase({
                messageId,
                sessionId,
                message,
                customerName,
                customerEmail,
                customerPhone,
                direction: 'incoming', // from customer
                timestamp,
                metadata
            });
        } else {
            this.saveToMemory({
                messageId,
                sessionId,
                message,
                customerName,
                customerEmail,
                customerPhone,
                direction: 'incoming',
                timestamp,
                metadata
            });
        }

        // Forward to WhatsApp admin
        if (this.whatsappClient && this.adminPhoneNumber) {
            await this.forwardToWhatsAppAdmin({
                sessionId,
                message,
                customerName,
                customerEmail,
                customerPhone,
                timestamp
            });
        }

        return {
            success: true,
            messageId,
            timestamp,
            forwardedToAdmin: !!(this.whatsappClient && this.adminPhoneNumber)
        };
    }

    /**
     * Send reply from admin to website customer
     */
    async sendReplyToWebCustomer(sessionId, replyMessage, adminName = 'Admin') {
        if (!sessionId || !replyMessage) {
            throw new Error('sessionId dan replyMessage required');
        }

        const timestamp = new Date();
        const messageId = this.generateMessageId();

        // Save reply to database or memory
        if (this.isMySQL) {
            await this.saveToDatabase({
                messageId,
                sessionId,
                message: replyMessage,
                direction: 'outgoing', // to customer
                timestamp,
                adminName
            });
        } else {
            this.saveToMemory({
                messageId,
                sessionId,
                message: replyMessage,
                direction: 'outgoing',
                timestamp,
                adminName
            });
        }

        return {
            success: true,
            messageId,
            timestamp,
            message: replyMessage
        };
    }

    /**
     * Get all web chat sessions
     */
    async getAllSessions() {
        if (this.isMySQL) {
            const query = `
                SELECT 
                    session_id,
                    customer_name,
                    customer_email,
                    customer_phone,
                    MAX(created_at) as last_message_at,
                    COUNT(*) as message_count,
                    SUM(CASE WHEN is_read = 0 AND direction = 'incoming' THEN 1 ELSE 0 END) as unread_count
                FROM web_chats
                GROUP BY session_id, customer_name, customer_email, customer_phone
                ORDER BY last_message_at DESC
            `;
            
            const sessions = await this.dbAdapter.query(query);
            return sessions;
        } else {
            // From memory
            const sessions = [];
            for (const [sessionId, data] of this.sessionData.entries()) {
                const messages = this.webChats.get(sessionId) || [];
                const unread = messages.filter(m => m.direction === 'incoming' && !m.isRead).length;
                
                sessions.push({
                    session_id: sessionId,
                    customer_name: data.name,
                    customer_email: data.email,
                    customer_phone: data.phone,
                    last_message_at: messages.length > 0 ? messages[messages.length - 1].timestamp : data.createdAt,
                    message_count: messages.length,
                    unread_count: unread
                });
            }
            
            return sessions.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
        }
    }

    /**
     * Get messages for specific session
     */
    async getSessionMessages(sessionId) {
        if (this.isMySQL) {
            const query = `
                SELECT 
                    message_id,
                    session_id,
                    message,
                    customer_name,
                    customer_email,
                    customer_phone,
                    direction,
                    admin_name,
                    is_read,
                    created_at,
                    metadata
                FROM web_chats
                WHERE session_id = ?
                ORDER BY created_at ASC
            `;
            
            const messages = await this.dbAdapter.query(query, [sessionId]);
            return messages;
        } else {
            // From memory
            return this.webChats.get(sessionId) || [];
        }
    }

    /**
     * Mark session as read
     */
    async markSessionAsRead(sessionId) {
        if (this.isMySQL) {
            const query = `
                UPDATE web_chats 
                SET is_read = 1 
                WHERE session_id = ? AND direction = 'incoming'
            `;
            
            await this.dbAdapter.query(query, [sessionId]);
        } else {
            // Update memory
            const messages = this.webChats.get(sessionId) || [];
            messages.forEach(msg => {
                if (msg.direction === 'incoming') {
                    msg.isRead = true;
                }
            });
        }

        return { success: true };
    }

    /**
     * Forward message ke WhatsApp admin
     */
    async forwardToWhatsAppAdmin(data) {
        const { sessionId, message, customerName, customerEmail, customerPhone, timestamp } = data;

        try {
            const formattedMessage = this.formatMessageForAdmin({
                sessionId,
                message,
                customerName,
                customerEmail,
                customerPhone,
                timestamp
            });

            const adminNumber = this.adminPhoneNumber.replace(/[^0-9]/g, '') + '@c.us';
            
            await this.whatsappClient.sendMessage(adminNumber, formattedMessage);
            
            console.log(`✅ Web chat forwarded to admin: ${sessionId}`);
            return true;
        } catch (error) {
            console.error('❌ Error forwarding to WhatsApp admin:', error);
            return false;
        }
    }

    /**
     * Format message untuk admin WhatsApp
     */
    formatMessageForAdmin(data) {
        const { sessionId, message, customerName, customerEmail, customerPhone, timestamp } = data;
        
        let formatted = '🌐 *LIVE CHAT WEBSITE*\n';
        formatted += '━━━━━━━━━━━━━━━━━━━━\n\n';
        
        if (customerName) formatted += `👤 *Nama:* ${customerName}\n`;
        if (customerEmail) formatted += `📧 *Email:* ${customerEmail}\n`;
        if (customerPhone) formatted += `📱 *Phone:* ${customerPhone}\n`;
        
        formatted += `🆔 *Session:* ${sessionId}\n`;
        formatted += `🕒 *Waktu:* ${this.formatTimestamp(timestamp)}\n\n`;
        formatted += `💬 *Pesan:*\n${message}\n\n`;
        formatted += '━━━━━━━━━━━━━━━━━━━━\n';
        formatted += '_Reply via admin panel website untuk membalas customer_';
        
        return formatted;
    }

    /**
     * Save to MySQL database
     */
    async saveToDatabase(data) {
        const query = `
            INSERT INTO web_chats 
            (message_id, session_id, message, customer_name, customer_email, customer_phone, 
             direction, admin_name, is_read, created_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            data.messageId,
            data.sessionId,
            data.message,
            data.customerName || null,
            data.customerEmail || null,
            data.customerPhone || null,
            data.direction,
            data.adminName || null,
            data.direction === 'outgoing' ? 1 : 0, // outgoing auto-read
            data.timestamp,
            JSON.stringify(data.metadata || {})
        ];
        
        await this.dbAdapter.query(query, params);
    }

    /**
     * Save to memory (standalone mode)
     */
    saveToMemory(data) {
        const { sessionId, customerName, customerEmail, customerPhone } = data;

        // Save session data if new
        if (!this.sessionData.has(sessionId)) {
            this.sessionData.set(sessionId, {
                name: customerName,
                email: customerEmail,
                phone: customerPhone,
                createdAt: data.timestamp
            });
        }

        // Save message
        if (!this.webChats.has(sessionId)) {
            this.webChats.set(sessionId, []);
        }
        
        this.webChats.get(sessionId).push({
            messageId: data.messageId,
            sessionId: data.sessionId,
            message: data.message,
            direction: data.direction,
            adminName: data.adminName,
            isRead: data.direction === 'outgoing',
            timestamp: data.timestamp,
            metadata: data.metadata || {}
        });
    }

    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return `WEB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Format timestamp
     */
    formatTimestamp(date) {
        return new Date(date).toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Get statistics
     */
    async getStatistics() {
        if (this.isMySQL) {
            const query = `
                SELECT 
                    COUNT(DISTINCT session_id) as total_sessions,
                    COUNT(*) as total_messages,
                    SUM(CASE WHEN is_read = 0 AND direction = 'incoming' THEN 1 ELSE 0 END) as total_unread,
                    SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as messages_today
                FROM web_chats
            `;
            
            const [stats] = await this.dbAdapter.query(query);
            return stats;
        } else {
            let totalUnread = 0;
            let totalMessages = 0;
            const now = new Date();
            const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
            let messagesToday = 0;

            for (const messages of this.webChats.values()) {
                totalMessages += messages.length;
                totalUnread += messages.filter(m => m.direction === 'incoming' && !m.isRead).length;
                messagesToday += messages.filter(m => new Date(m.timestamp) >= oneDayAgo).length;
            }

            return {
                total_sessions: this.sessionData.size,
                total_messages: totalMessages,
                total_unread: totalUnread,
                messages_today: messagesToday
            };
        }
    }
}

module.exports = WebChatService;
