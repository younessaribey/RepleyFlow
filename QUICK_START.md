# ⚡ Quick Start Guide

Get your WhatsApp bot backend running in 5 minutes.

---

## 🚀 Start Everything (3 Terminals)

### Terminal 1: Backend
```bash
cd /Users/mac/Documents/GitHub/ReplyFlow/backend
npm run start:dev
```

### Terminal 2: Worker (Optional)
```bash
cd /Users/mac/Documents/GitHub/ReplyFlow/backend
npm run start:worker
```

### Terminal 3: Ngrok
```bash
ngrok http 3000
```

---

## 🔗 Get Ngrok URL

```bash
curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url'
```

Example: `https://piacular-rapaciously-mayson.ngrok-free.dev`

---

## ⚙️ Configure Meta Webhook

1. **Go to**: https://developers.facebook.com/apps
2. **Select**: Your App → WhatsApp → Configuration
3. **Callback URL**: `https://YOUR-NGROK-URL.ngrok-free.dev/api/whatsapp/webhook`
4. **Verify Token**: `younessaribey`
5. **Subscribe**: `messages` field
6. **Save**

---

## 🧪 Test It Works

### Quick Test (30 seconds)
```bash
cd /Users/mac/Documents/GitHub/ReplyFlow/backend
./test-inbound-webhook-simple.sh
```

✅ Should see: `{"received": true}`

---

### Full Test (2 minutes)
```bash
./test-whatsapp-flow.sh
```

✅ Creates user, store, integration, simulates order

---

### Check Messages
```bash
./test-inbound-messages.sh
```

✅ Shows all stored messages

---

### Real-Time Monitor
```bash
./monitor-webhooks.sh
```

✅ Watch webhooks arrive live

---

## 📱 Test with Real WhatsApp

1. **Start monitoring**:
   ```bash
   ./monitor-webhooks.sh
   ```

2. **Open WhatsApp** on your phone

3. **Send message** to: `+1 555 164 1641`

4. **Watch logs** for:
   ```
   🔔 WEBHOOK POST RECEIVED
   💬 Message text: ...
   ```

5. **Verify database**:
   ```bash
   ./test-inbound-messages.sh
   ```

---

## 🔍 Check If Everything is Running

```bash
# Backend
curl -s http://localhost:3000/api/health

# Ngrok
open http://127.0.0.1:4040/inspect/http

# Redis
redis-cli ping

# PostgreSQL
psql $DATABASE_URL -c "SELECT 1"
```

---

## 🆘 Quick Fixes

### Restart Everything
```bash
pkill -f "nest start"
lsof -ti:3000 | xargs kill -9
pkill ngrok

cd /Users/mac/Documents/GitHub/ReplyFlow/backend
npm run start:dev > /tmp/nest-startup.log 2>&1 &
ngrok http 3000 > /tmp/ngrok.log 2>&1 &
```

### Update Access Token (if expired)
1. Meta Developer Console → WhatsApp → API Setup
2. Copy new token
3. Update `.env` → `WHATSAPP_ACCESS_TOKEN`
4. Restart backend

---

## 📚 More Help

- **Testing**: See `TESTING_GUIDE.md`
- **Status**: See `WEBHOOK_STATUS.md`
- **Full Docs**: See `README.md`

---

## ✅ Success Checklist

- [ ] Backend running (port 3000)
- [ ] Ngrok tunnel active
- [ ] Meta webhook configured
- [ ] `./test-inbound-webhook-simple.sh` passes
- [ ] Messages stored in database
- [ ] Monitor shows webhook activity

---

**You're ready!** 🎉

Now send a WhatsApp message and watch it appear in your backend logs.

