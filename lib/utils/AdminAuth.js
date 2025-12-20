const fs = require('fs');
const path = require('path');

class AdminAuth {
    constructor() {
        this.configPath = path.join(__dirname, '../../admin-config.json');
        this.loadConfig();
    }

    loadConfig() {
        try {
            const data = fs.readFileSync(this.configPath, 'utf8');
            this.config = JSON.parse(data);
            console.log('✅ Admin config loaded:', {
                superAdmins: this.config.superAdmins?.length || 0,
                productAdmins: this.config.productAdmins?.length || 0
            });
        } catch (error) {
            console.error('❌ Failed to load admin config:', error.message);
            this.config = { superAdmins: [], productAdmins: [], orderAdmins: [], permissions: {} };
        }
    }

    /**
     * Check if user is super admin (full access)
     */
    isSuperAdmin(phoneNumber) {
        return this.config.superAdmins?.includes(phoneNumber) || false;
    }

    /**
     * Check if user has product management permission
     */
    canManageProducts(phoneNumber) {
        return this.isSuperAdmin(phoneNumber) || 
               this.config.productAdmins?.includes(phoneNumber) ||
               this.hasPermission(phoneNumber, 'products');
    }

    /**
     * Check if user has order management permission
     */
    canManageOrders(phoneNumber) {
        return this.isSuperAdmin(phoneNumber) || 
               this.config.orderAdmins?.includes(phoneNumber) ||
               this.hasPermission(phoneNumber, 'orders');
    }

    /**
     * Check specific permission
     */
    hasPermission(phoneNumber, permission) {
        const userPermissions = this.config.permissions?.[phoneNumber] || [];
        return userPermissions.includes(permission);
    }

    /**
     * Get admin info
     */
    getAdminInfo(phoneNumber) {
        if (this.isSuperAdmin(phoneNumber)) {
            return {
                level: 'super_admin',
                permissions: ['all']
            };
        }

        const permissions = this.config.permissions?.[phoneNumber] || [];
        return {
            level: permissions.length > 0 ? 'admin' : 'user',
            permissions
        };
    }

    /**
     * Reload config (hot reload)
     */
    reload() {
        this.loadConfig();
    }
}

module.exports = new AdminAuth();
