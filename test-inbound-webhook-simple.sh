#!/bin/bash

# Simple script to test inbound webhook POST
# This simulates Meta posting an inbound message to your webhook

set -e

echo "🧪 Testing Inbound WhatsApp Webhook"
echo "===================================="
echo ""

# Use existing phone_number_id and customer phone from previous test
PHONE_NUMBER_ID="862827153581278"
CUSTOMER_PHONE="213550335911"

echo "📨 Posting inbound message webhook..."
echo "   Phone Number ID: $PHONE_NUMBER_ID"
echo "   Customer Phone: $CUSTOMER_PHONE"
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
                "id": "wamid.TEST_DIRECT_$(date +%s)",
                "timestamp": "$(date +%s)",
                "text": {
                  "body": "Yes I confirm! This is a test reply."
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

echo "Sending to http://localhost:3000/api/whatsapp/webhook..."
RESPONSE=$(curl -s -X POST "http://localhost:3000/api/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_PAYLOAD")

echo "Response:"
echo "$RESPONSE" | jq '.'
echo ""

echo "✅ Webhook POST completed"
echo ""
echo "📋 Now check backend logs:"
echo "   tail -50 /tmp/nest-startup.log | grep -A 10 'WEBHOOK POST RECEIVED'"
echo ""
echo "🔍 Or check ngrok requests:"
echo "   open http://127.0.0.1:4040/inspect/http"

