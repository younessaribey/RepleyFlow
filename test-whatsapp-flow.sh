#!/bin/bash

# Test WhatsApp Flow - Backend E2E Test
# This script tests: Register → Create Store → Simulate Order → Check WhatsApp Message

BASE_URL="http://localhost:3000/api"
PHONE_NUMBER="213550335911"  # Your test number from the Meta webhook

echo "================================================"
echo "🧪 Testing WhatsApp Backend Flow"
echo "================================================"
echo ""

# Step 1: Register a test user
echo "📝 Step 1: Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@replyflow.dev",
    "password": "Test123456!",
    "fullName": "Test User"
  }')

echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"

# Extract access token
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Registration failed. Trying to login instead..."
  
  LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@replyflow.dev",
      "password": "Test123456!"
    }')
  
  echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty')
fi

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token. Exiting."
  exit 1
fi

echo "✅ Got access token: ${ACCESS_TOKEN:0:20}..."
echo ""

# Step 2: Create a test store
echo "🏪 Step 2: Creating test store (Shopify)..."
STORE_RESPONSE=$(curl -s -X POST "${BASE_URL}/stores/connect" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "platform": "SHOPIFY",
    "name": "Test Shop",
    "domain": "test-shop.myshopify.com",
    "accessToken": "test_shopify_token_123",
    "timezone": "Africa/Algiers"
  }')

echo "$STORE_RESPONSE" | jq '.' 2>/dev/null || echo "$STORE_RESPONSE"

STORE_ID=$(echo "$STORE_RESPONSE" | jq -r '.id // empty')

if [ -z "$STORE_ID" ]; then
  echo "❌ Failed to create store. Exiting."
  exit 1
fi

echo "✅ Store created with ID: $STORE_ID"
echo ""

# Step 2b: Create integration with WhatsApp config
echo "🔗 Step 2b: Setting up WhatsApp integration..."
INTEGRATION_RESPONSE=$(curl -s -X PATCH "${BASE_URL}/stores/${STORE_ID}/integration" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "whatsappPhoneNumberId": "862827153581278",
    "whatsappTemplateName": "jaspers_market_plain_text_v1",
    "whatsappTemplateLanguage": "en_US"
  }')

echo "$INTEGRATION_RESPONSE" | jq '.' 2>/dev/null || echo "$INTEGRATION_RESPONSE"

# Extract webhook secret
WEBHOOK_SECRET=$(echo "$INTEGRATION_RESPONSE" | jq -r '.webhookSecret // empty')

if [ -z "$WEBHOOK_SECRET" ]; then
  echo "⚠️  Could not extract webhook secret, using fallback"
  WEBHOOK_SECRET="test_webhook_secret"
fi

echo "✅ Webhook secret: ${WEBHOOK_SECRET:0:10}..."
echo ""

# Step 3: Simulate an incoming order webhook
echo "📦 Step 3: Simulating COD order from Shopify..."

ORDER_WEBHOOK=$(curl -s -X POST "${BASE_URL}/orders/webhook/shopify?token=${WEBHOOK_SECRET}" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": 12345678,
    \"order_number\": \"#ALG-001\",
    \"created_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"total_price\": \"2500.00\",
    \"currency\": \"DZD\",
    \"financial_status\": \"pending\",
    \"customer\": {
      \"first_name\": \"Younes\",
      \"last_name\": \"Saribey\",
      \"phone\": \"${PHONE_NUMBER}\",
      \"email\": \"younes@example.dz\"
    },
    \"shipping_address\": {
      \"province_code\": \"16\",
      \"province\": \"Alger\",
      \"city\": \"Bab Ezzouar\",
      \"address1\": \"123 Test Street\",
      \"zip\": \"16000\",
      \"country\": \"DZ\"
    },
    \"line_items\": [
      {
        \"id\": 1,
        \"title\": \"Smart Watch Pro\",
        \"quantity\": 1,
        \"price\": \"2500.00\",
        \"sku\": \"WATCH-001\",
        \"variant_title\": \"Black\"
      }
    ],
    \"payment_gateway_names\": [\"cash_on_delivery\"]
  }")

echo "$ORDER_WEBHOOK" | jq '.' 2>/dev/null || echo "$ORDER_WEBHOOK"
echo ""

# Step 4: Check if job was queued
echo "⏳ Step 4: Waiting for WhatsApp job to process (5 seconds)..."
sleep 5

# Step 5: Check messages
echo "💬 Step 5: Checking sent messages..."
MESSAGES_RESPONSE=$(curl -s -X GET "${BASE_URL}/messages/${STORE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$MESSAGES_RESPONSE" | jq '.' 2>/dev/null || echo "$MESSAGES_RESPONSE"
echo ""

echo "================================================"
echo "✅ Test Complete!"
echo "================================================"
echo ""
echo "📋 Summary:"
echo "  • Backend is running on port 3000"
echo "  • Worker is processing BullMQ jobs"
echo "  • Ngrok URL: Check http://127.0.0.1:4040"
echo ""
echo "🔍 Next Steps:"
echo "  1. Check worker logs: tail -f /tmp/worker.log"
echo "  2. Check backend logs: tail -f /tmp/nest-startup.log"
echo "  3. Send a real WhatsApp message to ${PHONE_NUMBER}"
echo "  4. Watch Meta webhook dashboard for incoming messages"
echo ""

