const fs = require('fs').promises;
const path = require('path');
const Customer = require('../models/Customer');
const Cart = require('../models/Cart');

/**
 * Customer Service
 * Handles customer management and persistence
 */
class CustomerService {
    constructor() {
        this.dataPath = path.join(__dirname, '../../data/customers.json');
        this.customers = new Map();
        this.carts = new Map(); // Active carts by customer ID
    }

    /**
     * Initialize service and load customers
     */
    async initialize() {
        try {
            await this.loadCustomers();
            console.log(`✅ Customer service initialized with ${this.customers.size} customers`);
        } catch (error) {
            console.error('❌ Failed to initialize customer service:', error.message);
            this.customers = new Map();
        }
    }

    /**
     * Load customers from JSON file
     */
    async loadCustomers() {
        try {
            const data = await fs.readFile(this.dataPath, 'utf8');
            const customersData = JSON.parse(data);
            
            this.customers.clear();
            
            customersData.forEach(customerData => {
                const customer = new Customer(customerData);
                this.customers.set(customer.id, customer);
                
                // Restore cart if exists
                if (customerData.cart) {
                    const cart = new Cart(customer.id);
                    cart.items = customerData.cart.items || [];
                    this.carts.set(customer.id, cart);
                }
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.saveCustomers();
            } else {
                throw error;
            }
        }
    }

    /**
     * Save customers to JSON file
     */
    async saveCustomers() {
        try {
            const customersArray = Array.from(this.customers.values()).map(customer => {
                const cart = this.carts.get(customer.id);
                return {
                    ...customer,
                    cart: cart ? { items: cart.items } : null
                };
            });
            await fs.writeFile(this.dataPath, JSON.stringify(customersArray, null, 2));
        } catch (error) {
            console.error('Failed to save customers:', error);
            throw error;
        }
    }

    /**
     * Get or create customer
     */
    async getOrCreateCustomer(phone) {
        let customer = this.customers.get(phone);
        
        if (!customer) {
            customer = new Customer({ phone });
            this.customers.set(phone, customer);
            await this.saveCustomers();
        }
        
        customer.updateInteraction();
        await this.saveCustomers();
        
        return customer;
    }

    /**
     * Get customer by phone
     */
    getCustomer(phone) {
        return this.customers.get(phone);
    }

    /**
     * Update customer info
     */
    async updateCustomer(phone, updates) {
        const customer = await this.getOrCreateCustomer(phone);
        
        Object.keys(updates).forEach(key => {
            if (customer.hasOwnProperty(key) && key !== 'id' && key !== 'phone') {
                customer[key] = updates[key];
            }
        });
        
        await this.saveCustomers();
        return customer;
    }

    /**
     * Get or create cart for customer
     */
    getCart(customerId) {
        let cart = this.carts.get(customerId);
        
        if (!cart) {
            cart = new Cart(customerId);
            this.carts.set(customerId, cart);
        }
        
        return cart;
    }

    /**
     * Clear customer cart
     */
    async clearCart(customerId) {
        this.carts.delete(customerId);
        await this.saveCustomers();
    }

    /**
     * Save cart
     */
    async saveCart(customerId) {
        await this.saveCustomers();
    }

    /**
     * Add address to customer
     */
    async addAddress(phone, address) {
        const customer = await this.getOrCreateCustomer(phone);
        customer.addAddress(address);
        await this.saveCustomers();
        return customer;
    }

    /**
     * Add order to customer history
     */
    async addOrderToCustomer(phone, orderId) {
        const customer = await this.getOrCreateCustomer(phone);
        customer.addOrder(orderId);
        await this.saveCustomers();
        return customer;
    }

    /**
     * Get all customers
     */
    getAllCustomers() {
        return Array.from(this.customers.values());
    }

    /**
     * Get active customers (recent interaction)
     */
    getActiveCustomers(daysThreshold = 30) {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - daysThreshold);
        
        return Array.from(this.customers.values()).filter(c => 
            new Date(c.lastInteraction) >= threshold
        );
    }

    /**
     * Get customer statistics
     */
    getStatistics() {
        const allCustomers = Array.from(this.customers.values());
        
        return {
            total: allCustomers.length,
            withOrders: allCustomers.filter(c => c.orders.length > 0).length,
            activeThisMonth: this.getActiveCustomers(30).length,
            totalOrders: allCustomers.reduce((sum, c) => sum + c.orders.length, 0)
        };
    }

    /**
     * Sync customer from website
     */
    async syncCustomerFromWebsite(customerData) {
        try {
            const customer = new Customer(customerData);
            this.customers.set(customer.id, customer);
            await this.saveCustomers();
            console.log(`✅ Synced customer ${customer.phone} from website`);
            return customer;
        } catch (error) {
            console.error('❌ Failed to sync customer:', error);
            throw error;
        }
    }
}

module.exports = CustomerService;
