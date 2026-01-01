/**
 * Webhook Handler
 * Receives updates from website and syncs with bot
 */

class WebhookHandler {
    constructor(productService, orderService, customerService, chatService, webChatService = null) {
        this.productService = productService;
        this.orderService = orderService;
        this.customerService = customerService;
        this.chatService = chatService;
        this.webChatService = webChatService;
    }

    /**
     * Setup webhook routes on Express app
     */
    setupRoutes(app) {
        // Webhook for product updates
        app.post('/webhook/products', async (req, res) => {
            try {
                const products = req.body.products || [];
                await this.productService.syncFromWebsite(products);
                res.json({ success: true, message: 'Products synced successfully' });
            } catch (error) {
                console.error('Webhook error (products):', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Webhook for order updates
        app.post('/webhook/orders', async (req, res) => {
            try {
                const order = req.body.order;
                if (!order) {
                    return res.status(400).json({ success: false, error: 'Order data required' });
                }
                
                await this.orderService.syncOrderFromWebsite(order);
                res.json({ success: true, message: 'Order synced successfully' });
            } catch (error) {
                console.error('Webhook error (orders):', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Webhook for customer updates
        app.post('/webhook/customers', async (req, res) => {
            try {
                const customer = req.body.customer;
                if (!customer) {
                    return res.status(400).json({ success: false, error: 'Customer data required' });
                }
                
                await this.customerService.syncCustomerFromWebsite(customer);
                res.json({ success: true, message: 'Customer synced successfully' });
            } catch (error) {
                console.error('Webhook error (customers):', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Webhook for order status updates (to notify customer)
        app.post('/webhook/order-status', async (req, res) => {
            try {
                const { orderId, status, trackingNumber, message } = req.body;
                
                if (!orderId) {
                    return res.status(400).json({ success: false, error: 'Order ID required' });
                }
                
                const order = this.orderService.getOrderById(orderId);
                if (!order) {
                    return res.status(404).json({ success: false, error: 'Order not found' });
                }
                
                // Update order
                if (status) {
                    await this.orderService.updateOrderStatus(orderId, status);
                }
                if (trackingNumber) {
                    await this.orderService.updateTracking(orderId, trackingNumber);
                }
                
                // Store notification to send to customer
                // This will be picked up by notification sender
                global.pendingNotifications = global.pendingNotifications || [];
                global.pendingNotifications.push({
                    customerId: order.customerId,
                    message: message || `📦 Update pesanan ${orderId}: ${status}`
                });
                
                res.json({ success: true, message: 'Order updated and notification queued' });
            } catch (error) {
                console.error('Webhook error (order status):', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Webhook for sending reply from website to WhatsApp
        app.post('/webhook/send-message', async (req, res) => {
            try {
                const { customerId, message, metadata } = req.body;
                
                if (!customerId || !message) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'customerId and message are required' 
                    });
                }
                
                // Queue message to be sent via WhatsApp
                global.pendingNotifications = global.pendingNotifications || [];
                global.pendingNotifications.push({
                    customerId,
                    message,
                    metadata: { ...metadata, source: 'website' }
                });
                
                // Save to chat history
                await this.chatService.addMessage(customerId, message, 'outgoing', {
                    source: 'website',
                    ...metadata
                });
                
                res.json({ 
                    success: true, 
                    message: 'Message queued and will be sent to WhatsApp' 
                });
            } catch (error) {
                console.error('Webhook error (send message):', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
    }

    /**
     * Setup REST API routes for website integration
     */
    setupAPI(app) {
        // ===== AUTH ENDPOINTS (STUB) =====
        app.post('/api/register', (req, res) => {
            // Stub: register user
            res.json({ success: true, message: 'Register endpoint (stub)' });
        });
        app.post('/api/login', (req, res) => {
            // Stub: login user
            res.json({ success: true, message: 'Login endpoint (stub)' });
        });
        app.post('/api/verify-email', (req, res) => {
            // Stub: verify email
            res.json({ success: true, message: 'Verify email endpoint (stub)' });
        });
        app.post('/api/resend-verification', (req, res) => {
            // Stub: resend verification
            res.json({ success: true, message: 'Resend verification endpoint (stub)' });
        });

        // ===== WHATSAPP ENDPOINTS (STUB) =====
        app.post('/api/whatsapp/contact-owner', (req, res) => {
            // Stub: contact owner
            res.json({ success: true, message: 'Contact owner endpoint (stub)' });
        });
        app.post('/api/whatsapp/send-reply', (req, res) => {
            // Stub: send reply
            res.json({ success: true, message: 'Send reply endpoint (stub)' });
        });

        // Get all products
        app.get('/api/products', (req, res) => {
            try {
                const products = this.productService.getAllProducts();
                res.json({ success: true, data: products });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get product by ID
        app.get('/api/products/:id', (req, res) => {
            try {
                const product = this.productService.getProductById(req.params.id);
                if (!product) {
                    return res.status(404).json({ success: false, error: 'Product not found' });
                }
                res.json({ success: true, data: product });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get all orders
        app.get('/api/orders', (req, res) => {
            try {
                const orders = this.orderService.getAllOrders();
                res.json({ success: true, data: orders });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get order by ID
        app.get('/api/orders/:id', (req, res) => {
            try {
                const order = this.orderService.getOrderById(req.params.id);
                if (!order) {
                    return res.status(404).json({ success: false, error: 'Order not found' });
                }
                res.json({ success: true, data: order });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Update order status
        app.patch('/api/orders/:id/status', async (req, res) => {
            try {
                const { status, paymentStatus, trackingNumber } = req.body;
                const order = this.orderService.getOrderById(req.params.id);
                
                if (!order) {
                    return res.status(404).json({ success: false, error: 'Order not found' });
                }
                
                if (status) {
                    await this.orderService.updateOrderStatus(req.params.id, status);
                }
                if (paymentStatus) {
                    await this.orderService.updatePaymentStatus(req.params.id, paymentStatus);
                }
                if (trackingNumber) {
                    await this.orderService.updateTracking(req.params.id, trackingNumber);
                }
                
                const updatedOrder = this.orderService.getOrderById(req.params.id);
                res.json({ success: true, data: updatedOrder });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get all customers
        app.get('/api/customers', (req, res) => {
            try {
                const customers = this.customerService.getAllCustomers();
                res.json({ success: true, data: customers });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get customer by phone
        app.get('/api/customers/:phone', (req, res) => {
            try {
                const customer = this.customerService.getCustomer(req.params.phone);
                if (!customer) {
                    return res.status(404).json({ success: false, error: 'Customer not found' });
                }
                res.json({ success: true, data: customer });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get statistics
        app.get('/api/stats', (req, res) => {
            try {
                const stats = {
                    products: {
                        total: this.productService.getAllProducts().length,
                        available: this.productService.getAvailableProducts().length,
                        categories: this.productService.getCategories().length
                    },
                    orders: this.orderService.getStatistics(),
                    customers: this.customerService.getStatistics(),
                    chats: this.chatService.getStatistics()
                };
                res.json({ success: true, data: stats });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get all conversations (for admin panel)
        app.get('/api/conversations', (req, res) => {
            try {
                const conversations = this.chatService.getAllConversations();
                res.json({ success: true, data: conversations });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get chat history for specific customer
        app.get('/api/conversations/:customerId', (req, res) => {
            try {
                const { customerId } = req.params;
                const limit = parseInt(req.query.limit) || 100;
                
                const messages = this.chatService.getChatHistory(customerId, limit);
                const customer = this.customerService.getCustomer(customerId);
                
                res.json({ 
                    success: true, 
                    data: {
                        customer,
                        messages,
                        unreadCount: this.chatService.getUnreadCount(customerId)
                    }
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Mark conversation as read
        app.post('/api/conversations/:customerId/read', async (req, res) => {
            try {
                const { customerId } = req.params;
                await this.chatService.markAsRead(customerId);
                res.json({ success: true, message: 'Marked as read' });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Search messages
        app.get('/api/conversations/search/:query', (req, res) => {
            try {
                const { query } = req.params;
                const results = this.chatService.searchMessages(query);
                res.json({ success: true, data: results });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // ============================================
        // WEB LIVE CHAT ENDPOINTS (Customer Website)
        // ============================================

        // Receive message from website live chat
        app.post('/webhook/web-chat', async (req, res) => {
            try {
                if (!this.webChatService) {
                    return res.status(503).json({ 
                        success: false, 
                        error: 'Web chat service not initialized' 
                    });
                }

                const { sessionId, message, customerName, customerEmail, customerPhone, metadata } = req.body;

                if (!sessionId || !message) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'sessionId and message are required' 
                    });
                }

                const result = await this.webChatService.receiveWebChatMessage({
                    sessionId,
                    message,
                    customerName,
                    customerEmail,
                    customerPhone,
                    metadata
                });

                res.json({ success: true, data: result });
            } catch (error) {
                console.error('Webhook error (web-chat):', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get all web chat sessions
        app.get('/api/web-chats', async (req, res) => {
            try {
                if (!this.webChatService) {
                    return res.status(503).json({ 
                        success: false, 
                        error: 'Web chat service not initialized' 
                    });
                }

                const sessions = await this.webChatService.getAllSessions();
                res.json({ success: true, data: sessions });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get messages for specific web chat session
        app.get('/api/web-chats/:sessionId', async (req, res) => {
            try {
                if (!this.webChatService) {
                    return res.status(503).json({ 
                        success: false, 
                        error: 'Web chat service not initialized' 
                    });
                }

                const { sessionId } = req.params;
                const messages = await this.webChatService.getSessionMessages(sessionId);
                
                res.json({ success: true, data: messages });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Send reply from admin to web chat customer
        app.post('/api/web-chats/:sessionId/reply', async (req, res) => {
            try {
                if (!this.webChatService) {
                    return res.status(503).json({ 
                        success: false, 
                        error: 'Web chat service not initialized' 
                    });
                }

                const { sessionId } = req.params;
                const { message, adminName } = req.body;

                if (!message) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'message is required' 
                    });
                }

                const result = await this.webChatService.sendReplyToWebCustomer(
                    sessionId, 
                    message, 
                    adminName
                );

                res.json({ success: true, data: result });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Mark web chat session as read
        app.post('/api/web-chats/:sessionId/read', async (req, res) => {
            try {
                if (!this.webChatService) {
                    return res.status(503).json({ 
                        success: false, 
                        error: 'Web chat service not initialized' 
                    });
                }

                const { sessionId } = req.params;
                await this.webChatService.markSessionAsRead(sessionId);
                
                res.json({ success: true, message: 'Marked as read' });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Get web chat statistics
        app.get('/api/web-chats/stats/summary', async (req, res) => {
            try {
                if (!this.webChatService) {
                    return res.status(503).json({ 
                        success: false, 
                        error: 'Web chat service not initialized' 
                    });
                }

                const stats = await this.webChatService.getStatistics();
                res.json({ success: true, data: stats });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Health check
        app.get('/api/health', (req, res) => {
            res.json({ 
                success: true, 
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    whatsappChat: !!this.chatService,
                    webChat: !!this.webChatService
                }
            });
        });
    }
}

module.exports = WebhookHandler;
