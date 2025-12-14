const MySQLAdapter = require('./MySQLAdapter');
require('dotenv').config();

/**
 * Database Factory
 * Creates appropriate database adapter based on configuration
 */
class DatabaseFactory {
    static async createAdapter() {
        const dbMode = process.env.DB_MODE || 'json';

        if (dbMode === 'mysql') {
            console.log('📊 Initializing MySQL database adapter...');
            
            const adapter = new MySQLAdapter({
                host: process.env.DB_HOST,
                port: parseInt(process.env.DB_PORT) || 3306,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
                queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0
            });

            await adapter.initialize();
            return adapter;
        } else {
            console.log('📁 Using JSON file storage (standalone mode)');
            return null; // Services will use default JSON file storage
        }
    }

    static getMode() {
        return process.env.DB_MODE || 'json';
    }

    static isMySQLMode() {
        return this.getMode() === 'mysql';
    }
}

module.exports = DatabaseFactory;
