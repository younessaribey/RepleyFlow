#!/bin/bash

# Test webhook through ngrok (simulates Meta posting to your public URL)

set -e

echo "🧪 Testing Webhook Through Ngrok"
echo "================================="
echo ""

# Get ngrok URL
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url // empty')

if [ -z "$NGROK_URL" ]; then
  echo "❌ Ngrok is not running"
  exit 1
fi

echo "✅ Ngrok URL: $NGROK_URL"
echo ""

PHONE_NUMBER_ID="862827153581278"
CUSTOMER_PHONE="213550335911"

echo "📨 Posting inbound message webhook via ngrok..."
echo "   (This simulates Meta posting to your public URL)"
echo ""

WEBHOOK_PAYLOAD=$(cat <<EOF
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "723166274164804",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551641641",
              "phone_number_id": "${PHONE_NUMBER_ID}"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Younes Saribey"
                },
                "wa_id": "${CUSTOMER_PHONE}"
              }
            ],
            "messages": [
              {
                "from": "${CUSTOMER_PHONE}",
                "id": "wamid.NGROK_TEST_$(date +%s)",
                "timestamp": "$(date +%s)",
                "text": {
                  "body": "Test via NGROK - This should appear in logs!"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
EOF
)

echo "Sending to ${NGROK_URL}/api/whatsapp/webhook..."
RESPONSE=$(curl -s -X POST "${NGROK_URL}/api/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_PAYLOAD")

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""

echo "✅ Webhook POST via ngrok completed"
echo ""
echo "📋 Check ngrok web interface:"
echo "   http://127.0.0.1:4040/inspect/http"
echo ""
echo "   You should see a POST request to /api/whatsapp/webhook"
echo ""
echo "📋 Check backend logs:"
echo "   tail -50 /tmp/nest-startup.log | grep -A 10 'WEBHOOK POST RECEIVED'"

