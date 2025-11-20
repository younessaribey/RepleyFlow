#!/bin/bash

# This script directly POSTs a WhatsApp inbound message webhook
# to your local backend to verify webhook handling logic

set -e

BASE_URL="http://localhost:3000/api"

echo "🧪 Testing WhatsApp Webhook Handler Directly"
echo "=============================================="
echo ""

# Step 1: Login
echo "🔐 Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@replyflow.dev",
    "password": "password123"
  }')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Login failed. Response:"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Step 2: Get stores
echo "📦 Step 2: Fetching stores..."
STORES_RESPONSE=$(curl -s -X GET "${BASE_URL}/stores" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

STORE_ID=$(echo "$STORES_RESPONSE" | jq -r '.[-1].id // empty')
STORE_NAME=$(echo "$STORES_RESPONSE" | jq -r '.[-1].name // empty')

if [ -z "$STORE_ID" ]; then
  echo "❌ No stores found. Create one first with test-whatsapp-flow.sh"
  exit 1
fi

echo "✅ Using store: $STORE_NAME ($STORE_ID)"
echo ""

# Step 3: Get integration to find phone_number_id
echo "🔌 Step 3: Fetching integration..."
STORE_DETAIL=$(curl -s -X GET "${BASE_URL}/stores/${STORE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

PHONE_NUMBER_ID=$(echo "$STORE_DETAIL" | jq -r '.integration.whatsappPhoneNumberId // empty')

if [ -z "$PHONE_NUMBER_ID" ]; then
  echo "❌ No whatsappPhoneNumberId found. Run test-whatsapp-flow.sh first"
  exit 1
fi

echo "✅ Using WhatsApp Phone Number ID: $PHONE_NUMBER_ID"
echo ""

# Step 4: Get latest order
echo "📋 Step 4: Fetching latest order..."
ORDERS_RESPONSE=$(curl -s -X GET "${BASE_URL}/orders/${STORE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

ORDER_ID=$(echo "$ORDERS_RESPONSE" | jq -r '.[-1].id // empty')
CUSTOMER_PHONE=$(echo "$ORDERS_RESPONSE" | jq -r '.[-1].customerPhone // empty')

if [ -z "$ORDER_ID" ]; then
  echo "❌ No orders found. Run test-whatsapp-flow.sh first"
  exit 1
fi

echo "✅ Found order: $ORDER_ID"
echo "   Customer phone: $CUSTOMER_PHONE"
echo ""

# Step 5: Simulate inbound webhook
echo "📨 Step 5: Simulating inbound WhatsApp message webhook..."
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
                  "name": "Test Customer"
                },
                "wa_id": "${CUSTOMER_PHONE}"
              }
            ],
            "messages": [
              {
                "from": "${CUSTOMER_PHONE}",
                "id": "wamid.TEST_$(date +%s)",
                "timestamp": "$(date +%s)",
                "text": {
                  "body": "Yes, I confirm my order!"
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

echo "Sending webhook payload..."
WEBHOOK_RESPONSE=$(curl -s -X POST "${BASE_URL}/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_PAYLOAD")

echo "$WEBHOOK_RESPONSE" | jq '.'

echo ""
echo "✅ Webhook sent"
echo ""

# Step 6: Check messages
echo "💬 Step 6: Checking messages..."
sleep 2
MESSAGES_RESPONSE=$(curl -s -X GET "${BASE_URL}/messages/${STORE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

INBOUND_COUNT=$(echo "$MESSAGES_RESPONSE" | jq '[.[] | select(.direction == "INBOUND")] | length')
OUTBOUND_COUNT=$(echo "$MESSAGES_RESPONSE" | jq '[.[] | select(.direction == "OUTBOUND")] | length')

echo "   Outbound messages (sent): $OUTBOUND_COUNT"
echo "   Inbound messages (received): $INBOUND_COUNT"
echo ""

if [ "$INBOUND_COUNT" -gt 0 ]; then
  echo "✅ SUCCESS! Inbound message captured:"
  LATEST_INBOUND=$(echo "$MESSAGES_RESPONSE" | jq '.[] | select(.direction == "INBOUND") | .payload.text.body' | tail -n 1)
  echo "   Content: $LATEST_INBOUND"
else
  echo "❌ No inbound messages found"
fi

echo ""
echo "🎯 Check backend logs at /tmp/nest-startup.log for detailed webhook processing"

