# ReplyFlow Frontend Testing Guide

Complete guide to test the ReplyFlow dashboard with YouCan integration.

## Prerequisites

✅ Backend running on `http://localhost:3000`  
✅ Frontend running on `http://localhost:3001`  
✅ PostgreSQL database configured  
✅ Redis running  
✅ YouCan store connected (from previous OAuth flow)

## Testing Workflow

### 1. Start Both Servers

```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 2. Register/Login

1. Open http://localhost:3001
2. Click **Sign up** or go to http://localhost:3001/register
3. Fill in:
   - Name: `Younes`
   - Email: `younes@replyflow.dev`
   - Password: `password123`
4. Click **Create Account**
5. You'll be redirected to the Dashboard

### 3. Connect YouCan Store

1. Navigate to **Stores** (sidebar)
2. Click **Connect Store**
3. Click **YouCan**
4. Complete OAuth flow in YouCan seller area
5. After authorization, you'll be redirected back
6. Verify store appears in the list

### 4. Configure WhatsApp

1. Navigate to **Settings** (sidebar)
2. Select your store from dropdown
3. Fill in WhatsApp configuration:
   - **Business Account ID**: Get from Meta Business Manager
   - **Phone Number ID**: Get from Meta Business Manager
   - **Template Name**: `jaspers_market_plain_text_v1` (or your template)
   - **Template Language**: `en_US`
4. Click **Save WhatsApp Settings**
5. Verify success toast appears

### 5. Test Order Flow

#### Option A: Create Test Order in YouCan

1. Go to your YouCan store
2. Place a COD order
3. Watch the Dashboard for real-time updates
4. Check **Orders** page to see the new order
5. Check **Messages** page to see WhatsApp message sent

#### Option B: Simulate Order via API

```bash
# Get your store ID from the frontend
STORE_ID="<your-store-id>"

# Simulate YouCan webhook
curl -X POST http://localhost:3000/api/youcan/webhook \
  -H "Content-Type: application/json" \
  -H "x-youcan-signature: test" \
  -d '{
    "id": "test-order-123",
    "ref": "001",
    "total": 5000,
    "currency": "DZD",
    "status": 1,
    "payment": {
      "status": -1,
      "status_text": "unpaid",
      "payload": {
        "gateway": "cod"
      }
    },
    "shipping": {
      "status": 2,
      "status_text": "unfulfilled",
      "price": 500,
      "is_free": false
    },
    "customer": {
      "first_name": "Ahmed",
      "last_name": "Benali",
      "phone": "+213550335911",
      "city": "Algiers"
    },
    "variants": [
      {
        "id": "var-1",
        "price": 4500,
        "quantity": 1,
        "variant": {
          "sku": "PROD-001",
          "product": {
            "name": "Test Product",
            "slug": "test-product"
          }
        }
      }
    ],
    "created_at": "2025-11-21T14:00:00Z"
  }'
```

### 6. Monitor Real-time Updates

1. Keep **Orders** page open
2. Watch for the "Live" badge (green with Wifi icon)
3. When a new order comes in:
   - Toast notification appears
   - Order automatically appears in the table
   - No page refresh needed

### 7. Test Dashboard Analytics

1. Navigate to **Dashboard**
2. Verify stats are displayed:
   - Total Stores
   - Total Orders
   - Messages Sent
   - Pending Orders
3. Check **Message Statistics** card
4. Scroll to **Recent Orders** section

### 8. Test Filters and Search

#### Orders Page

1. Use search bar to find orders by:
   - Order ID
   - Customer name
   - Phone number
2. Use status filter dropdown:
   - All Statuses
   - Pending
   - Confirmed
   - Delivered
   - Cancelled

#### Messages Page

1. Use search bar to find messages
2. Filter by direction:
   - All Messages
   - Outbound
   - Inbound

## Expected Results

### ✅ Successful Flow

1. **Registration**: User created, redirected to dashboard
2. **Store Connection**: YouCan store appears in Stores page
3. **WhatsApp Config**: Settings saved successfully
4. **Order Creation**:
   - Order appears in Orders table
   - WhatsApp message sent (check Messages page)
   - Toast notification shown
   - Dashboard stats updated
5. **Real-time Updates**: Live badge shows "Live" with green Wifi icon

### ❌ Common Issues

#### "Failed to load stores"

- **Cause**: Backend not running or wrong API URL
- **Fix**: Check backend is running on port 3000, verify `.env.local`

#### "OAuth failed"

- **Cause**: Invalid YouCan credentials or redirect URI mismatch
- **Fix**: Verify `YOUCAN_CLIENT_ID` and `YOUCAN_CLIENT_SECRET` in backend `.env`

#### "Failed to save settings"

- **Cause**: Invalid WhatsApp configuration
- **Fix**: Double-check Business ID and Phone Number ID from Meta

#### "No real-time updates"

- **Cause**: SSE connection failed
- **Fix**: Check backend SSE endpoint is accessible, verify JWT token

## Testing Checklist

- [ ] User registration works
- [ ] User login works
- [ ] Dashboard loads with stats
- [ ] YouCan OAuth flow completes
- [ ] Store appears in Stores page
- [ ] WhatsApp settings can be saved
- [ ] Orders page displays orders
- [ ] Messages page displays messages
- [ ] Search and filters work
- [ ] Real-time updates work (Live badge)
- [ ] Toast notifications appear
- [ ] Logout works

## Screenshots

### Dashboard

![Dashboard](docs/screenshots/dashboard.png)

### Stores

![Stores](docs/screenshots/stores.png)

### Orders

![Orders](docs/screenshots/orders.png)

### Messages

![Messages](docs/screenshots/messages.png)

### Settings

![Settings](docs/screenshots/settings.png)

## Next Steps

1. **Deploy Backend**: Heroku, Railway, or DigitalOcean
2. **Deploy Frontend**: Vercel (recommended)
3. **Configure Production URLs**: Update `.env` files
4. **Set up Meta Webhooks**: Point to production backend URL
5. **Test with Real YouCan Orders**: Place actual COD orders

## Support

For issues or questions:

- Check backend logs: `npm run start:dev` output
- Check browser console: F12 → Console tab
- Review network requests: F12 → Network tab
- Check database: `npx prisma studio`

## API Endpoints Reference

| Endpoint                           | Method | Description                 |
| ---------------------------------- | ------ | --------------------------- |
| `/api/auth/register`               | POST   | Register new user           |
| `/api/auth/login`                  | POST   | Login user                  |
| `/api/users/me`                    | GET    | Get current user            |
| `/api/stores`                      | GET    | List user's stores          |
| `/api/stores/:id`                  | DELETE | Delete store                |
| `/api/orders`                      | GET    | List orders                 |
| `/api/messages`                    | GET    | List messages               |
| `/api/dashboard/stats`             | GET    | Get dashboard stats         |
| `/api/youcan/oauth/start`          | GET    | Start YouCan OAuth          |
| `/api/youcan/oauth/callback`       | GET    | YouCan OAuth callback       |
| `/api/integrations/:storeId`       | GET    | Get store integration       |
| `/api/stores/:storeId/integration` | PATCH  | Update integration          |
| `/api/sse/stream`                  | GET    | SSE stream (all stores)     |
| `/api/sse/stream/:storeId`         | GET    | SSE stream (specific store) |

---

**Happy Testing! 🚀**
