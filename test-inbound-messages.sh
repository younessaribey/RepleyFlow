#!/bin/bash

# Test Inbound WhatsApp Messages
# This script checks if customer replies are being stored

BASE_URL="http://localhost:3000/api"

echo "================================================"
echo "🧪 Testing Inbound WhatsApp Message Capture"
echo "================================================"
echo ""

# Step 1: Login
echo "📝 Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@replyflow.dev",
    "password": "Test123456!"
  }')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Logged in"
echo ""

# Step 2: Get stores
echo "📦 Step 2: Getting your stores..."
STORES_RESPONSE=$(curl -s -X GET "${BASE_URL}/stores" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

STORE_COUNT=$(echo "$STORES_RESPONSE" | jq 'length' 2>/dev/null || echo "0")
echo "Found $STORE_COUNT stores"

# Get the LATEST store (last one created)
STORE_ID=$(echo "$STORES_RESPONSE" | jq -r '.[-1].id // empty')

if [ -z "$STORE_ID" ]; then
  echo "❌ No stores found"
  exit 1
fi

STORE_NAME=$(echo "$STORES_RESPONSE" | jq -r '.[-1].name // empty')
STORE_CREATED=$(echo "$STORES_RESPONSE" | jq -r '.[-1].createdAt // empty')

echo ""
echo "✅ Using latest store:"
echo "   • ID: $STORE_ID"
echo "   • Name: $STORE_NAME"
echo "   • Created: $STORE_CREATED"
echo ""

# Step 3: Check messages
echo "💬 Step 3: Checking all messages (OUTBOUND + INBOUND)..."
MESSAGES_RESPONSE=$(curl -s -X GET "${BASE_URL}/messages/${STORE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$MESSAGES_RESPONSE" | jq '.' 2>/dev/null || echo "$MESSAGES_RESPONSE"

# Count inbound messages
INBOUND_COUNT=$(echo "$MESSAGES_RESPONSE" | jq '[.[] | select(.direction == "INBOUND")] | length' 2>/dev/null || echo "0")
OUTBOUND_COUNT=$(echo "$MESSAGES_RESPONSE" | jq '[.[] | select(.direction == "OUTBOUND")] | length' 2>/dev/null || echo "0")

echo ""
echo "================================================"
echo "📊 Summary"
echo "================================================"
echo "  • Store ID: $STORE_ID"
echo "  • Outbound messages (sent): $OUTBOUND_COUNT"
echo "  • Inbound messages (received): $INBOUND_COUNT"
echo ""

if [ "$INBOUND_COUNT" -gt 0 ]; then
  echo "✅ SUCCESS! Customer replies are being captured!"
  LATEST_INBOUND=$(echo "$MESSAGES_RESPONSE" | jq '[.[] | select(.direction == "INBOUND")] | .[0]' 2>/dev/null)
  echo ""
  echo "🔍 Latest inbound message:"
  echo "$LATEST_INBOUND"
  INBOUND_TEXT=$(echo "$LATEST_INBOUND" | jq -r '.payload.text.body // .payload.interactive?.button_reply?.title // .payload.interactive?.list_reply?.title // "N/A"' 2>/dev/null)
  echo ""
  echo "💬 Message content:"
  echo "   \"$INBOUND_TEXT\""
else
  echo "⚠️  No inbound messages yet."
  echo ""
  echo "📱 To test:"
  echo "  1. Make sure ngrok is running: ngrok http 3000"
  echo "  2. Reply to the WhatsApp message on your phone (+213 550 33 59 11)"
  echo "  3. Wait 2-3 seconds for Meta to deliver the webhook"
  echo "  4. Run this script again"
fi

echo ""

