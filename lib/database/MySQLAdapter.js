const mysql = require('mysql2/promise');

/**
 * MySQL Database Adapter
 * Provides database connection and query methods
 */
class MySQLAdapter {
    constructor(config) {
        this.config = {
            host: config.host || 'localhost',
            port: config.port || 3306,
            user: config.user || 'root',
            password: config.password || '',
            database: config.database || 'nanda_motor',
            waitForConnections: true,
            connectionLimit: config.connectionLimit || 10,
            queueLimit: config.queueLimit || 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        };
        this.pool = null;
    }

    /**
     * Initialize database connection pool
     */
    async initialize() {
        try {
            this.pool = mysql.createPool(this.config);
            
            // Test connection
            const connection = await this.pool.getConnection();
            console.log('✅ MySQL database connected successfully');
            connection.release();
            
            // Initialize tables
            await this.initializeTables();
            
            return true;
        } catch (error) {
            console.error('❌ MySQL connection failed:', error.message);
            throw error;
        }
    }

    /**
     * Initialize required database tables
     */
    async initializeTables() {
        const tables = [
            // WhatsApp Chats table
            `CREATE TABLE IF NOT EXISTS whatsapp_chats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message_id VARCHAR(100) UNIQUE NOT NULL,
                customer_id VARCHAR(100) NOT NULL,
                customer_name VARCHAR(255),
                message TEXT NOT NULL,
                direction ENUM('incoming', 'outgoing') NOT NULL,
                timestamp DATETIME NOT NULL,
                \`read\` BOOLEAN DEFAULT FALSE,
                metadata JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_customer (customer_id),
                INDEX idx_timestamp (timestamp),
                INDEX idx_read (\`read\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Orders table
            `CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(50) UNIQUE NOT NULL,
                customer_id VARCHAR(100) NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                customer_phone VARCHAR(50) NOT NULL,
                customer_address TEXT NOT NULL,
                items JSON NOT NULL,
                total_amount DECIMAL(10, 2) NOT NULL,
                status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
                payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_customer (customer_id),
                INDEX idx_status (status),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // WhatsApp Customers table
            `CREATE TABLE IF NOT EXISTS whatsapp_customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id VARCHAR(100) UNIQUE NOT NULL,
                phone VARCHAR(50) NOT NULL,
                name VARCHAR(255),
                addresses JSON,
                order_history JSON,
                cart JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_phone (phone),
                INDEX idx_customer (customer_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Shopping Carts table (temporary carts)
            `CREATE TABLE IF NOT EXISTS shopping_carts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id VARCHAR(100) NOT NULL,
                product_id VARCHAR(50) NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                product_data JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_cart_item (customer_id, product_id),
                INDEX idx_customer (customer_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Checkout Sessions table (for multi-step checkout)
            `CREATE TABLE IF NOT EXISTS checkout_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id VARCHAR(100) UNIQUE NOT NULL,
                state VARCHAR(50) NOT NULL,
                data JSON,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_customer (customer_id),
                INDEX idx_expires (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Web Live Chat table (customer website → WhatsApp admin)
            `CREATE TABLE IF NOT EXISTS web_chats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message_id VARCHAR(100) UNIQUE NOT NULL,
                session_id VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                customer_name VARCHAR(255),
                customer_email VARCHAR(255),
                customer_phone VARCHAR(50),
                direction ENUM('incoming', 'outgoing') NOT NULL,
                admin_name VARCHAR(255),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata JSON,
                INDEX idx_session (session_id),
                INDEX idx_created (created_at),
                INDEX idx_read (is_read),
                INDEX idx_direction (direction)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        ];

        for (const sql of tables) {
            try {
                await this.query(sql);
            } catch (error) {
                console.error('Error creating table:', error.message);
            }
        }

        console.log('✅ Database tables initialized');
    }

    /**
     * Execute SQL query
     */
    async query(sql, params = []) {
        if (!this.pool) {
            throw new Error('Database not initialized');
        }

        try {
            const [rows] = await this.pool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', error.message);
            throw error;
        }
    }

    /**
     * Get a connection from pool (for transactions)
     */
    async getConnection() {
        if (!this.pool) {
            throw new Error('Database not initialized');
        }
        return await this.pool.getConnection();
    }

    /**
     * Close database connection pool
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('✅ Database connection closed');
        }
    }

    /**
     * Check if database is connected
     */
    isConnected() {
        return this.pool !== null;
    }
}

module.exports = MySQLAdapter;
