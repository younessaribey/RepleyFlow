#!/bin/bash

# Test AI-powered conversation handling

set -e

BASE_URL="http://localhost:3000/api"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        🤖 AI-POWERED CONVERSATION TEST                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
  echo "⚠️  WARNING: OPENAI_API_KEY not set in environment"
  echo "   Please add it to your .env file:"
  echo "   OPENAI_API_KEY=sk-..."
  echo ""
  echo "   For now, this test will simulate the webhook but AI won't respond."
  echo ""
fi

# Step 1: Get latest store and order
echo "📦 Step 1: Getting latest store and order..."

# Login first
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@replyflow.dev",
    "password": "password123"
  }')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Login failed. Run ./test-whatsapp-flow.sh first"
  exit 1
fi

STORES_RESPONSE=$(curl -s -X GET "${BASE_URL}/stores" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

STORE_ID=$(echo "$STORES_RESPONSE" | jq -r '.[-1].id // empty')
STORE_NAME=$(echo "$STORES_RESPONSE" | jq -r '.[-1].name // empty')

echo "✅ Using store: $STORE_NAME"
echo ""

# Get integration
STORE_DETAIL=$(curl -s -X GET "${BASE_URL}/stores/${STORE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

PHONE_NUMBER_ID=$(echo "$STORE_DETAIL" | jq -r '.integration.whatsappPhoneNumberId // empty')

echo "   Phone Number ID: $PHONE_NUMBER_ID"
echo ""

# Step 2: Simulate customer asking about order
echo "💬 Step 2: Simulating customer message..."
echo "   Customer: \"Hello, when will my order arrive?\""
echo ""

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
                "id": "wamid.AI_TEST_$(date +%s)",
                "timestamp": "$(date +%s)",
                "text": {
                  "body": "Hello, when will my order arrive?"
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

echo "✅ Webhook received: $(echo "$WEBHOOK_RESPONSE" | jq -r '.received // "error"')"
echo ""

# Step 3: Wait for AI processing
echo "⏳ Step 3: Waiting for AI to process and reply (5 seconds)..."
sleep 5
echo ""

# Step 4: Check messages
echo "📊 Step 4: Checking conversation..."
MESSAGES_RESPONSE=$(curl -s -X GET "${BASE_URL}/messages/${STORE_ID}" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

TOTAL_MESSAGES=$(echo "$MESSAGES_RESPONSE" | jq 'length')
INBOUND_COUNT=$(echo "$MESSAGES_RESPONSE" | jq '[.[] | select(.direction == "INBOUND")] | length')
OUTBOUND_COUNT=$(echo "$MESSAGES_RESPONSE" | jq '[.[] | select(.direction == "OUTBOUND")] | length')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 CONVERSATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   Total messages: $TOTAL_MESSAGES"
echo "   📥 Inbound (customer): $INBOUND_COUNT"
echo "   📤 Outbound (bot): $OUTBOUND_COUNT"
echo ""

# Show latest conversation
echo "💬 Latest Conversation:"
echo ""

# Get last 3 messages
echo "$MESSAGES_RESPONSE" | jq -r '.[-3:] | .[] | 
  if .direction == "INBOUND" then
    "   👤 Customer: " + (.payload.text.body // "N/A")
  else
    "   🤖 Bot: " + (
      if .payload.text.body then
        .payload.text.body
      elif .templateName then
        "Template: " + .templateName
      else
        "Message sent"
      end
    )
  end'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if AI replied
LATEST_OUTBOUND=$(echo "$MESSAGES_RESPONSE" | jq '.[-1] | select(.direction == "OUTBOUND")')
if [ -n "$LATEST_OUTBOUND" ]; then
  AI_REPLY=$(echo "$LATEST_OUTBOUND" | jq -r '.payload.text.body // empty')
  if [ -n "$AI_REPLY" ]; then
    echo "✅ SUCCESS! AI replied automatically:"
    echo ""
    echo "   🤖 \"$AI_REPLY\""
    echo ""
  else
    echo "⚠️  Outbound message sent, but no text body found"
    echo "   (might be a template message)"
  fi
else
  echo "⚠️  No AI reply detected"
  echo ""
  echo "   Possible reasons:"
  echo "   • OPENAI_API_KEY not set in .env"
  echo "   • AI processing failed (check logs)"
  echo "   • WhatsApp API error"
  echo ""
  echo "   Check backend logs:"
  echo "   tail -50 /tmp/nest-startup.log | grep -E '(🤖|AI|OpenAI)'"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

