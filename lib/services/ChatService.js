/**
 * Chat Service
 * Handles chat history and two-way communication between WhatsApp and Website
 */

const fs = require('fs').promises;
const path = require('path');

class ChatService {
    constructor() {
        this.dataPath = path.join(__dirname, '../../data/chats.json');
        this.chats = new Map(); // customerId -> [{id, from, message, timestamp, direction}]
        this.unreadCounts = new Map(); // customerId -> count
    }

    /**
     * Initialize service and load chats
     */
    async initialize() {
        try {
            await this.loadChats();
            console.log(`✅ Chat service initialized with ${this.chats.size} conversations`);
        } catch (error) {
            console.error('❌ Failed to initialize chat service:', error.message);
            this.chats = new Map();
        }
    }

    /**
     * Load chats from JSON file
     */
    async loadChats() {
        try {
            const data = await fs.readFile(this.dataPath, 'utf8');
            const chatsData = JSON.parse(data);
            
            this.chats.clear();
            
            Object.keys(chatsData).forEach(customerId => {
                this.chats.set(customerId, chatsData[customerId]);
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.saveChats();
            } else {
                throw error;
            }
        }
    }

    /**
     * Save chats to JSON file
     */
    async saveChats() {
        try {
            const chatsObj = {};
            this.chats.forEach((messages, customerId) => {
                chatsObj[customerId] = messages;
            });
            await fs.writeFile(this.dataPath, JSON.stringify(chatsObj, null, 2));
        } catch (error) {
            console.error('Failed to save chats:', error);
            throw error;
        }
    }

    /**
     * Add message to chat history
     */
    async addMessage(customerId, message, direction = 'incoming', metadata = {}) {
        if (!this.chats.has(customerId)) {
            this.chats.set(customerId, []);
        }

        const chatMessage = {
            id: this.generateMessageId(),
            customerId,
            message,
            direction, // 'incoming' (from customer) or 'outgoing' (from bot/admin)
            timestamp: new Date().toISOString(),
            read: false,
            metadata: {
                ...metadata,
                source: metadata.source || (direction === 'incoming' ? 'whatsapp' : 'bot')
            }
        };

        this.chats.get(customerId).push(chatMessage);
        
        // Update unread count for incoming messages
        if (direction === 'incoming') {
            const currentCount = this.unreadCounts.get(customerId) || 0;
            this.unreadCounts.set(customerId, currentCount + 1);
        }

        await this.saveChats();

        // Notify website about new message
        if (global.pendingWebhookNotifications) {
            global.pendingWebhookNotifications.push({
                type: 'new_message',
                data: chatMessage
            });
        }

        return chatMessage;
    }

    /**
     * Get chat history for customer
     */
    getChatHistory(customerId, limit = 100) {
        const messages = this.chats.get(customerId) || [];
        return messages.slice(-limit);
    }

    /**
     * Get all conversations (for admin panel)
     */
    getAllConversations() {
        const conversations = [];
        
        this.chats.forEach((messages, customerId) => {
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                const unreadCount = this.unreadCounts.get(customerId) || 0;
                
                conversations.push({
                    customerId,
                    lastMessage: lastMessage.message,
                    lastMessageTime: lastMessage.timestamp,
                    lastMessageDirection: lastMessage.direction,
                    unreadCount,
                    totalMessages: messages.length
                });
            }
        });

        // Sort by last message time (newest first)
        conversations.sort((a, b) => 
            new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
        );

        return conversations;
    }

    /**
     * Mark messages as read
     */
    async markAsRead(customerId) {
        const messages = this.chats.get(customerId);
        if (messages) {
            messages.forEach(msg => {
                if (!msg.read && msg.direction === 'incoming') {
                    msg.read = true;
                }
            });
            this.unreadCounts.set(customerId, 0);
            await this.saveChats();
        }
    }

    /**
     * Get unread count for customer
     */
    getUnreadCount(customerId) {
        return this.unreadCounts.get(customerId) || 0;
    }

    /**
     * Get total unread across all conversations
     */
    getTotalUnread() {
        let total = 0;
        this.unreadCounts.forEach(count => {
            total += count;
        });
        return total;
    }

    /**
     * Search messages
     */
    searchMessages(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        this.chats.forEach((messages, customerId) => {
            messages.forEach(msg => {
                if (msg.message.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        ...msg,
                        customerId
                    });
                }
            });
        });

        return results.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
    }

    /**
     * Delete conversation
     */
    async deleteConversation(customerId) {
        this.chats.delete(customerId);
        this.unreadCounts.delete(customerId);
        await this.saveChats();
    }

    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
    }

    /**
     * Get statistics
     */
    getStatistics() {
        let totalMessages = 0;
        let incomingMessages = 0;
        let outgoingMessages = 0;

        this.chats.forEach(messages => {
            totalMessages += messages.length;
            messages.forEach(msg => {
                if (msg.direction === 'incoming') incomingMessages++;
                else outgoingMessages++;
            });
        });

        return {
            totalConversations: this.chats.size,
            totalMessages,
            incomingMessages,
            outgoingMessages,
            totalUnread: this.getTotalUnread()
        };
    }
}

module.exports = ChatService;
