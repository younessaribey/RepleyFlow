# 🧪 WhatsApp Backend Testing Guide

Complete guide for testing the WhatsApp auto-reply bot backend.

---

## 🚀 Quick Start

### 1. Start All Services

```bash
# Terminal 1: Backend
cd /Users/mac/Documents/GitHub/ReplyFlow/backend
npm run start:dev

# Terminal 2: Worker (optional, for queue processing)
npm run start:worker

# Terminal 3: Ngrok
ngrok http 3000
```

### 2. Get Ngrok URL

```bash
curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url'
```

### 3. Configure Meta Webhook

1. Go to: https://developers.facebook.com/apps
2. Your App → **WhatsApp → Configuration**
3. **Callback URL**: `https://YOUR-NGROK-URL.ngrok-free.dev/api/whatsapp/webhook`
4. **Verify token**: `younessaribey`
5. Subscribe to **`messages`** field

---

## 🧪 Available Test Scripts

### 1. Complete End-to-End Flow Test

```bash
./test-whatsapp-flow.sh
```

**What it does**:

- Registers/logs in user
- Creates a store (Shopify)
- Sets up WhatsApp integration
- Simulates a COD order webhook
- Triggers WhatsApp template message
- Shows sent messages

**When to use**: First-time setup or full flow verification

---

### 2. Direct Webhook Test (Local)

```bash
./test-inbound-webhook-simple.sh
```

**What it does**:

- POSTs a simulated inbound message directly to localhost:3000
- Bypasses ngrok and Meta
- Verifies webhook handling logic

**When to use**: Debug webhook processing without external dependencies

**Expected output**:

```json
{
  "received": true
}
```

---

### 3. Ngrok Tunnel Test

```bash
./test-via-ngrok.sh
```

**What it does**:

- POSTs a simulated inbound message through your ngrok public URL
- Tests public URL routing
- Verifies ngrok → backend connection

**When to use**: Verify ngrok is routing correctly to your backend

**Expected output**:

- Success response
- Request visible in http://127.0.0.1:4040/inspect/http

---

### 4. Check Inbound Messages

```bash
./test-inbound-messages.sh
```

**What it does**:

- Logs in
- Fetches all messages for latest store
- Shows inbound vs outbound count
- Displays latest inbound message content

**When to use**: Verify messages are stored in database

**Expected output**:

```
• Outbound messages (sent): 1
• Inbound messages (received): 2
💬 Message content: "Yes I confirm! This is a test reply."
```

---

### 5. Real-Time Webhook Monitor

```bash
./monitor-webhooks.sh
```

**What it does**:

- Tails backend logs in real-time
- Filters for webhook-related events
- Shows incoming messages as they arrive

**When to use**: Watch for real WhatsApp messages from your phone

**What you'll see**:

```
🔔 WEBHOOK POST RECEIVED at 2025-11-20T15:56:04.184Z
📊 Parsed: 1 messages, 0 statuses, phoneNumberId=862827153581278
📨 Processing inbound text message from 213550335911
💬 Message text: Yes I confirm!
✅ Found matching order cmi7m4i4b0008mm9y67w9bi6q
```

---

## 📱 Testing with Real WhatsApp Messages

### Prerequisites

1. ✅ Backend running
2. ✅ Ngrok tunnel active
3. ✅ Meta webhook configured with current ngrok URL
4. ✅ WhatsApp access token is fresh (not expired)
5. ✅ `messages` field subscribed in Meta

### Steps

1. **Start monitoring** (Terminal 1):

   ```bash
   ./monitor-webhooks.sh
   ```

2. **Open ngrok inspector** (Browser):

   ```bash
   open http://127.0.0.1:4040/inspect/http
   ```

3. **Send WhatsApp message** (Phone):
   - Open WhatsApp on your phone
   - Go to conversation with `+1 555 164 1641`
   - Send: "Hello, I want to confirm my order"

4. **Verify webhook received**:
   - ✅ POST request appears in ngrok inspector
   - ✅ Log shows "WEBHOOK POST RECEIVED" in monitor
   - ✅ Message content appears in logs

5. **Check database**:
   ```bash
   ./test-inbound-messages.sh
   ```

---

## 🔍 Debugging

### Problem: No POST requests in ngrok

**Check**:

```bash
# Is ngrok running?
ps aux | grep ngrok

# Get current URL
curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url'

# Test ngrok routing
./test-via-ngrok.sh
```

**Fix**:

- Restart ngrok: `ngrok http 3000`
- Update Meta webhook URL with new ngrok URL

---

### Problem: Webhook returns 401 or 404

**Check**:

```bash
# Is backend running?
ps aux | grep "nest start"

# Check backend logs
tail -50 /tmp/nest-startup.log
```

**Fix**:

```bash
# Kill and restart backend
lsof -ti:3000 | xargs kill -9
npm run start:dev
```

---

### Problem: Messages not stored in database

**Check**:

```bash
# Test webhook directly
./test-inbound-webhook-simple.sh

# Check logs for errors
tail -100 /tmp/nest-startup.log | grep -i error
```

**Common causes**:

- No matching order for customer phone
- Integration not set up (missing `whatsappPhoneNumberId`)
- Database connection issue

**Fix**:

- Run `./test-whatsapp-flow.sh` to create test data
- Check PostgreSQL is running: `psql $DATABASE_URL -c "SELECT 1"`

---

### Problem: Real messages don't trigger webhook

**Possible reasons**:

1. **Webhook was subscribed AFTER messages were sent**
   - Solution: Send a NEW message now

2. **Wrong phone number**
   - Check: `whatsappPhoneNumberId` in integration matches Meta config
   - Solution: Update integration or Meta config

3. **Expired access token**
   - Error: `Request failed with status code 401`
   - Solution: Get fresh token from Meta Developer Console, update `.env`

4. **Meta hasn't processed subscription yet**
   - Solution: Wait 1-2 minutes, then send message

5. **Test/Production mode mismatch**
   - Check: Are you using a test number or production?
   - Solution: Verify phone numbers in Meta dashboard

---

## 📊 Health Check

Run this to verify everything:

```bash
echo "🔍 Backend Health Check"
echo "======================"
echo ""

# Backend
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ Backend: Running on port 3000"
else
  echo "❌ Backend: Not responding"
fi

# Ngrok
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url // empty')
if [ -n "$NGROK_URL" ]; then
  echo "✅ Ngrok: $NGROK_URL"
else
  echo "❌ Ngrok: Not running"
fi

# Redis
if redis-cli ping > /dev/null 2>&1; then
  echo "✅ Redis: Connected"
else
  echo "❌ Redis: Not running"
fi

# PostgreSQL
if psql $DATABASE_URL -c "SELECT 1" > /dev/null 2>&1; then
  echo "✅ PostgreSQL: Connected"
else
  echo "❌ PostgreSQL: Not connected"
fi
```

---

## 🎯 Expected Flow

### Outbound (Bot → Customer)

1. Store receives COD order
2. Order webhook → Backend
3. Backend validates wilaya
4. Queue WhatsApp job
5. Worker sends template via Meta API
6. Meta delivers to customer's WhatsApp
7. Status updates stored in DB

### Inbound (Customer → Bot)

1. Customer replies in WhatsApp
2. Meta posts webhook to ngrok URL
3. Ngrok forwards to backend
4. Backend receives POST `/api/whatsapp/webhook`
5. Parse message, find matching order
6. Store in DB as `INBOUND` message
7. Emit SSE event for real-time UI

---

## 📝 Log Locations

- **Backend**: `/tmp/nest-startup.log`
- **Worker**: `/tmp/worker.log`
- **Ngrok Web UI**: http://127.0.0.1:4040/inspect/http

---

## 🆘 Quick Fixes

### Restart Everything

```bash
# Kill all processes
pkill -f "nest start"
lsof -ti:3000 | xargs kill -9
pkill ngrok

# Start fresh
cd /Users/mac/Documents/GitHub/ReplyFlow/backend
npm run start:dev > /tmp/nest-startup.log 2>&1 &
ngrok http 3000 > /tmp/ngrok.log 2>&1 &

# Get new ngrok URL
sleep 3
curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url'
```

### Clear Test Data

```bash
# Reset database (careful!)
cd /Users/mac/Documents/GitHub/ReplyFlow/backend
npx prisma migrate reset --force

# Re-run migrations
npx prisma migrate deploy
```

---

## ✅ Success Criteria

Your setup is working if:

- [ ] `./test-inbound-webhook-simple.sh` → Response: `{"received": true}`
- [ ] `./test-via-ngrok.sh` → POST visible in ngrok inspector
- [ ] `./test-inbound-messages.sh` → Shows inbound message count > 0
- [ ] Backend logs show "WEBHOOK POST RECEIVED"
- [ ] Backend logs show "Message text: ..."
- [ ] Database has `INBOUND` messages with `status: "DELIVERED"`

---

## 🚀 Next: Frontend Integration

Once webhooks are working, the frontend can:

1. Connect to SSE endpoint: `GET /api/sse/connect/:storeId`
2. Listen for `message_status_update` events
3. Display real-time chat history
4. Show customer replies instantly

See `README.md` for SSE event details.
