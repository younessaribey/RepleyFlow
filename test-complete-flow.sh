#!/bin/bash

# Complete end-to-end test: Send template + Receive reply

set -e

BASE_URL="http://localhost:3000/api"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🧪 COMPLETE WHATSAPP FLOW TEST (SEND + RECEIVE)           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
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
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Logged in"
echo ""

# Step 2: Get latest store
echo "📦 Step 2: Getting latest store..."
STORES_RESPONSE=$(curl -s -X GET "${BASE_URL}/stores" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

STORE_ID=$(echo "$STORES_RESPONSE" | jq -r '.[-1].id // empty')
STORE_NAME=$(echo "$STORES_RESPONSE" | jq -r '.[-1].name // empty')

if [ -z "$STORE_ID" ]; then
  echo "❌ No stores found. Run ./test-whatsapp-flow.sh first"
  exit 1
fi

echo "✅ Using store: $STORE_NAME ($STORE_ID)"
echo ""

# Step 3: Get integration details
echo "🔌 Step 3: Getting integration..."
STORE_DETAIL=$(curl -s -X GET "${BASE_URL}/stores/${STORE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

PHONE_NUMBER_ID=$(echo "$STORE_DETAIL" | jq -r '.integration.whatsappPhoneNumberId // empty')
WEBHOOK_SECRET=$(echo "$STORE_DETAIL" | jq -r '.integration.webhookSecret // empty')

echo "   Phone Number ID: $PHONE_NUMBER_ID"
echo "   Webhook Secret: ${WEBHOOK_SECRET:0:20}..."
echo ""

# Step 4: Simulate order webhook (this triggers template send)
echo "📋 Step 4: Creating test order..."
ORDER_PAYLOAD=$(cat <<EOF
{
  "id": $(date +%s),
  "order_number": "TEST-$(date +%s)",
  "email": "customer@example.com",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "total_price": "2500.00",
  "currency": "DZD",
  "financial_status": "pending",
  "customer": {
    "first_name": "Test",
    "last_name": "Customer",
    "phone": "+213550335911"
  },
  "shipping_address": {
    "address1": "123 Test St",
    "city": "Alger",
    "province": "Alger",
    "country": "Algeria",
    "zip": "16000",
    "phone": "+213550335911"
  },
  "line_items": [
    {
      "id": 1,
      "title": "Test Product",
      "quantity": 1,
      "price": "2500.00"
    }
  ],
  "payment_gateway_names": ["cash_on_delivery"]
}
EOF
)

ORDER_RESPONSE=$(curl -s -X POST "${BASE_URL}/orders/webhook/shopify" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-SHA256: ${WEBHOOK_SECRET}" \
  -d "$ORDER_PAYLOAD")

echo "✅ Order created"
echo ""

# Step 5: Wait for WhatsApp message to be sent
echo "⏳ Step 5: Waiting for WhatsApp template to send (5 seconds)..."
sleep 5
echo ""

# Step 6: Check sent messages
echo "📤 Step 6: Checking sent messages..."
MESSAGES_RESPONSE=$(curl -s -X GET "${BASE_URL}/messages/${STORE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

OUTBOUND_COUNT=$(echo "$MESSAGES_RESPONSE" | jq '[.[] | select(.direction == "OUTBOUND")] | length')
LATEST_OUTBOUND=$(echo "$MESSAGES_RESPONSE" | jq '.[] | select(.direction == "OUTBOUND") | {id, status, templateName, errorMessage}' | head -20)

echo "   Outbound messages: $OUTBOUND_COUNT"
echo "$LATEST_OUTBOUND" | jq '.'
echo ""

# Step 7: Simulate inbound reply
echo "📥 Step 7: Simulating customer reply..."
INBOUND_PAYLOAD=$(cat <<EOF
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
                "wa_id": "213550335911"
              }
            ],
            "messages": [
              {
                "from": "213550335911",
                "id": "wamid.COMPLETE_TEST_$(date +%s)",
                "timestamp": "$(date +%s)",
                "text": {
                  "body": "Yes, I confirm my order! Please deliver it."
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

WEBHOOK_RESPONSE=$(curl -s -X POST "${BASE_URL}/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d "$INBOUND_PAYLOAD")

echo "✅ Inbound webhook sent: $(echo "$WEBHOOK_RESPONSE" | jq -r '.received // "error"')"
echo ""

# Step 8: Wait and check all messages
echo "⏳ Step 8: Waiting for processing (2 seconds)..."
sleep 2
echo ""

echo "💬 Step 9: Checking all messages..."
FINAL_MESSAGES=$(curl -s -X GET "${BASE_URL}/messages/${STORE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

FINAL_OUTBOUND=$(echo "$FINAL_MESSAGES" | jq '[.[] | select(.direction == "OUTBOUND")] | length')
FINAL_INBOUND=$(echo "$FINAL_MESSAGES" | jq '[.[] | select(.direction == "INBOUND")] | length')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 FINAL RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   Store: $STORE_NAME"
echo "   Store ID: $STORE_ID"
echo ""
echo "   📤 Outbound messages (sent): $FINAL_OUTBOUND"
echo "   📥 Inbound messages (received): $FINAL_INBOUND"
echo ""

if [ "$FINAL_INBOUND" -gt 0 ]; then
  LATEST_INBOUND_TEXT=$(echo "$FINAL_MESSAGES" | jq -r '.[] | select(.direction == "INBOUND") | .payload.text.body' | tail -n 1)
  echo "   💬 Latest customer reply:"
  echo "      \"$LATEST_INBOUND_TEXT\""
  echo ""
fi

if [ "$FINAL_OUTBOUND" -gt 0 ]; then
  LATEST_OUTBOUND_STATUS=$(echo "$FINAL_MESSAGES" | jq -r '.[] | select(.direction == "OUTBOUND") | .status' | tail -n 1)
  echo "   📊 Latest template status: $LATEST_OUTBOUND_STATUS"
  
  if [ "$LATEST_OUTBOUND_STATUS" = "FAILED" ]; then
    ERROR_MSG=$(echo "$FINAL_MESSAGES" | jq -r '.[] | select(.direction == "OUTBOUND") | .errorMessage' | tail -n 1)
    echo "   ⚠️  Error: $ERROR_MSG"
    echo ""
    echo "   💡 If error is '401', update WHATSAPP_ACCESS_TOKEN in .env"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$FINAL_INBOUND" -gt 0 ]; then
  echo "✅ SUCCESS! Both sending and receiving are working!"
else
  echo "⚠️  Outbound working, but no inbound messages yet."
  echo "   This test simulated an inbound message locally."
  echo "   For real WhatsApp messages, ensure Meta webhook is configured."
fi

echo ""

