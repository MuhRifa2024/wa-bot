const fs = require('fs').promises;
const path = require('path');
const Order = require('../models/Order');

/**
 * Order Service
 * Handles order management and persistence
 */
class OrderService {
    constructor() {
        this.dataPath = path.join(__dirname, '../../data/orders.json');
        this.orders = new Map();
    }

    /**
     * Initialize service and load orders
     */
    async initialize() {
        try {
            await this.loadOrders();
            console.log(`✅ Order service initialized with ${this.orders.size} orders`);
        } catch (error) {
            console.error('❌ Failed to initialize order service:', error.message);
            this.orders = new Map();
        }
    }

    /**
     * Load orders from JSON file
     */
    async loadOrders() {
        try {
            const data = await fs.readFile(this.dataPath, 'utf8');
            const ordersData = JSON.parse(data);
            
            this.orders.clear();
            
            ordersData.forEach(orderData => {
                const order = new Order(orderData);
                this.orders.set(order.id, order);
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.saveOrders();
            } else {
                throw error;
            }
        }
    }

    /**
     * Save orders to JSON file
     */
    async saveOrders() {
        try {
            const ordersArray = Array.from(this.orders.values());
            await fs.writeFile(this.dataPath, JSON.stringify(ordersArray, null, 2));
        } catch (error) {
            console.error('Failed to save orders:', error);
            throw error;
        }
    }

    /**
     * Create new order
     */
    async createOrder(orderData) {
        const order = new Order(orderData);
        const validation = order.validate();
        
        if (!validation.valid) {
            throw new Error(`Invalid order: ${validation.errors.join(', ')}`);
        }
        
        order.calculateTotals();
        this.orders.set(order.id, order);
        
        await this.saveOrders();
        return order;
    }

    /**
     * Get order by ID
     */
    getOrderById(id) {
        return this.orders.get(id);
    }

    /**
     * Get orders by customer
     */
    getOrdersByCustomer(customerId) {
        return Array.from(this.orders.values()).filter(o => 
            o.customerId === customerId
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Get orders by status
     */
    getOrdersByStatus(status) {
        return Array.from(this.orders.values()).filter(o => 
            o.status === status
        );
    }

    /**
     * Get pending orders
     */
    getPendingOrders() {
        return this.getOrdersByStatus('pending');
    }

    /**
     * Update order status
     */
    async updateOrderStatus(orderId, newStatus) {
        const order = this.orders.get(orderId);
        if (!order) {
            throw new Error('Order not found');
        }
        
        if (!order.updateStatus(newStatus)) {
            throw new Error('Invalid status');
        }
        
        await this.saveOrders();
        return order;
    }

    /**
     * Update payment status
     */
    async updatePaymentStatus(orderId, newStatus) {
        const order = this.orders.get(orderId);
        if (!order) {
            throw new Error('Order not found');
        }
        
        if (!order.updatePaymentStatus(newStatus)) {
            throw new Error('Invalid payment status');
        }
        
        await this.saveOrders();
        return order;
    }

    /**
     * Update tracking number
     */
    async updateTracking(orderId, trackingNumber) {
        const order = this.orders.get(orderId);
        if (!order) {
            throw new Error('Order not found');
        }
        
        order.trackingNumber = trackingNumber;
        order.updatedAt = new Date().toISOString();
        
        await this.saveOrders();
        return order;
    }

    /**
     * Cancel order
     */
    async cancelOrder(orderId) {
        return await this.updateOrderStatus(orderId, 'cancelled');
    }

    /**
     * Get all orders
     */
    getAllOrders() {
        return Array.from(this.orders.values()).sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    /**
     * Get recent orders
     */
    getRecentOrders(limit = 10) {
        return this.getAllOrders().slice(0, limit);
    }

    /**
     * Get order statistics
     */
    getStatistics() {
        const allOrders = Array.from(this.orders.values());
        
        return {
            total: allOrders.length,
            pending: allOrders.filter(o => o.status === 'pending').length,
            confirmed: allOrders.filter(o => o.status === 'confirmed').length,
            processing: allOrders.filter(o => o.status === 'processing').length,
            shipped: allOrders.filter(o => o.status === 'shipped').length,
            delivered: allOrders.filter(o => o.status === 'delivered').length,
            cancelled: allOrders.filter(o => o.status === 'cancelled').length,
            totalRevenue: allOrders
                .filter(o => o.paymentStatus === 'paid')
                .reduce((sum, o) => sum + o.total, 0)
        };
    }

    /**
     * Sync order from website
     */
    async syncOrderFromWebsite(orderData) {
        try {
            const order = new Order(orderData);
            this.orders.set(order.id, order);
            await this.saveOrders();
            console.log(`✅ Synced order ${order.id} from website`);
            return order;
        } catch (error) {
            console.error('❌ Failed to sync order:', error);
            throw error;
        }
    }
}

module.exports = OrderService;
