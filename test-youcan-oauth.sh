#!/bin/bash

# Test YouCan OAuth Flow
# This script helps you test the complete YouCan OAuth integration

set -e

BASE_URL="http://localhost:3000/api"

echo "🔐 YouCan OAuth Integration Test"
echo "================================"
echo ""

# Step 1: Register/Login
echo "📝 Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
        "email": "younes@replyflow.dev",
        "password": "password123"
      }')

JWT=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')

if [ "$JWT" == "null" ] || [ -z "$JWT" ]; then
  echo "❌ Login failed. Trying to register..."
  REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
          "email": "younes@replyflow.dev",
          "password": "password123",
          "name": "Younes"
        }')
  JWT=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken')
fi

echo "✅ JWT Token obtained"
echo ""

# Step 2: Get OAuth URL
echo "🔗 Step 2: Getting YouCan OAuth URL..."
OAUTH_RESPONSE=$(curl -s -X GET "$BASE_URL/youcan/oauth/start" \
  -H "Authorization: Bearer $JWT")

OAUTH_URL=$(echo "$OAUTH_RESPONSE" | jq -r '.url')

if [ "$OAUTH_URL" == "null" ] || [ -z "$OAUTH_URL" ]; then
  echo "❌ Failed to get OAuth URL"
  echo "Response: $OAUTH_RESPONSE"
  exit 1
fi

echo "✅ OAuth URL generated"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 MANUAL STEP REQUIRED:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Please open this URL in your browser:"
echo ""
echo "$OAUTH_URL"
echo ""
echo "Steps:"
echo "1. Click the link above (or copy and paste it into your browser)"
echo "2. You'll be redirected to YouCan's authorization page"
echo "3. Click 'Authorize' or 'Install' to grant permissions"
echo "4. YouCan will redirect you back to localhost:3000"
echo "5. Check your terminal for the callback result"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 3: Wait for callback (monitor logs)
echo "⏳ Step 3: Waiting for OAuth callback..."
echo "   (Watch your backend logs for the callback result)"
echo ""
echo "💡 Tip: After authorizing, check the backend logs for:"
echo "   - YouCan OAuth callback received"
echo "   - Store created/updated"
echo "   - Webhook subscription registered"
echo ""

# Step 4: Verify store was created
echo "🔍 Step 4: After authorization, run this command to verify:"
echo ""
echo "curl -s -X GET \"$BASE_URL/stores\" \\"
echo "  -H \"Authorization: Bearer $JWT\" | jq"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

