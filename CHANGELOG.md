# Changelog

All notable changes to WhatsApp Bot Nanda Motor will be documented in this file.

## [2.0.0] - 2025-12-15

### 🎉 Major Release - Complete Rewrite

#### Added
- ✅ **Web Live Chat** - Customer website → WhatsApp admin
  - WebChatService untuk handle live chat
  - Real-time forwarding ke admin WhatsApp
  - Session management & statistics
  - Admin panel integration

- ✅ **MySQL Integration** - Database shared dengan website
  - DatabaseFactory untuk dual mode (JSON/MySQL)
  - ProductServiceV2 dengan MySQL support
  - 6 database tables (whatsapp_chats, orders, customers, carts, checkouts, web_chats)
  - Auto-create tables on startup

- ✅ **Auto-Recovery System**
  - Auto-delete session saat auth failure
  - Auto-restart saat logout/disconnect
  - QR code auto-generate ulang
  - No manual intervention needed

- ✅ **REST API Endpoints** (16+ routes)
  - Products API
  - WhatsApp Chat API
  - Orders API
  - Web Live Chat API
  - Health check endpoint

- ✅ **Development Tools**
  - Nodemon untuk auto-restart
  - PM2 configuration untuk production
  - Environment variables dengan dotenv
  - Comprehensive error handling

#### Changed
- 🔄 QR code hanya muncul di browser (tidak di terminal)
- 🔄 Session management lebih robust
- 🔄 Dokumentasi digabung menjadi satu README.md
- 🔄 Project structure lebih clean

#### Removed
- ❌ 8 file dokumentasi duplikat (merged ke README.md)
- ❌ QR code ASCII art di terminal
- ❌ Unused dependencies

### Technical Details

**New Dependencies:**
- `dotenv` - Environment variables
- `axios` - HTTP client
- `mysql2` - MySQL driver
- `nodemon` - Auto-restart (dev)

**Database Tables:**
1. `whatsapp_chats` - WhatsApp e-commerce chat history
2. `orders` - Customer orders
3. `whatsapp_customers` - Customer data
4. `shopping_carts` - Temporary shopping carts
5. `checkout_sessions` - Multi-step checkout sessions
6. `web_chats` - Website live chat history

**API Endpoints:**
- GET `/api/products`
- GET `/api/chats`
- POST `/webhook/send-message`
- GET `/api/orders`
- POST `/webhook/update-order`
- POST `/webhook/web-chat`
- GET `/api/web-chats`
- GET `/api/health`

---

## [1.0.0] - 2024-xx-xx

### Initial Release

#### Features
- ✅ WhatsApp bot dengan whatsapp-web.js
- ✅ E-commerce commands (KATALOG, BELI, KERANJANG, CHECKOUT)
- ✅ JSON-based storage
- ✅ QR code di terminal
- ✅ Basic product management

---

## Future Plans

### [2.1.0] - Planned
- [ ] Multi-admin support
- [ ] Chat analytics & reporting
- [ ] Broadcast message feature
- [ ] Product image support
- [ ] Payment gateway integration

### [3.0.0] - Vision
- [ ] AI chatbot integration
- [ ] Voice message support
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] CRM integration

---

**Note:** Version follows [Semantic Versioning](https://semver.org/)
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes
