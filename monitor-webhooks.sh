#!/bin/bash

# Real-time webhook monitor
# Shows incoming webhooks as they arrive

echo "🔍 Real-Time Webhook Monitor"
echo "============================"
echo ""
echo "✅ Ngrok: $(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url // "❌ Not running"')"
echo "✅ Backend: http://localhost:3000"
echo ""
echo "📡 Watching for incoming webhooks..."
echo "   (Send a WhatsApp message to +1 555 164 1641 now)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Monitor backend logs for webhook activity
tail -f /tmp/nest-startup.log | grep --line-buffered -E "(🔔 WEBHOOK POST RECEIVED|📊 Parsed:|📨 Processing inbound|💬 Message text:|✅ Found matching order)" --color=always

