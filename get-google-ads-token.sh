#!/bin/bash

# Google Ads Refresh Token Generator
# This script helps you generate a refresh token for Google Ads API

CLIENT_ID="${1:-$GOOGLE_ADS_CLIENT_ID}"
CLIENT_SECRET="${2:-$GOOGLE_ADS_CLIENT_SECRET}"

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
    echo "❌ Error: Missing credentials"
    echo ""
    echo "Usage:"
    echo "  ./get-google-ads-token.sh CLIENT_ID CLIENT_SECRET"
    echo ""
    echo "Or set environment variables:"
    echo "  export GOOGLE_ADS_CLIENT_ID=your_client_id"
    echo "  export GOOGLE_ADS_CLIENT_SECRET=your_secret"
    echo "  ./get-google-ads-token.sh"
    exit 1
fi

echo "🔐 Google Ads Refresh Token Generator"
echo ""
echo "════════════════════════════════════════════════════════════"
echo "STEP 1: Authorize the Application"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Open this URL in your browser:"
echo ""

# URL encode the redirect URI
REDIRECT_URI="urn:ietf:wg:oauth:2.0:oob"
SCOPE="https://www.googleapis.com/auth/adwords"

# Generate authorization URL
AUTH_URL="https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPE}&access_type=offline&prompt=consent"

echo "$AUTH_URL"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "After authorizing, Google will show you an authorization code."
echo ""
read -p "📋 Paste the authorization code here: " AUTH_CODE

if [ -z "$AUTH_CODE" ]; then
    echo "❌ No authorization code provided"
    exit 1
fi

echo ""
echo "🔄 Exchanging authorization code for refresh token..."
echo ""

# Exchange code for tokens
RESPONSE=$(curl -s -X POST https://oauth2.googleapis.com/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "code=${AUTH_CODE}" \
    -d "client_id=${CLIENT_ID}" \
    -d "client_secret=${CLIENT_SECRET}" \
    -d "redirect_uri=${REDIRECT_URI}" \
    -d "grant_type=authorization_code")

# Check for errors
ERROR=$(echo "$RESPONSE" | grep -o '"error"' | head -1)

if [ -n "$ERROR" ]; then
    echo "❌ Token exchange failed:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

# Extract refresh token
REFRESH_TOKEN=$(echo "$RESPONSE" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$REFRESH_TOKEN" ]; then
    echo "⚠️  No refresh token in response. This usually means:"
    echo "   1. You've already authorized this app before"
    echo "   2. You need to revoke access first at: https://myaccount.google.com/permissions"
    echo ""
    echo "Full response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

echo "════════════════════════════════════════════════════════════"
echo "✅ SUCCESS! Refresh Token Generated"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🔑 GOOGLE_ADS_REFRESH_TOKEN:"
echo ""
echo "$REFRESH_TOKEN"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Copy the refresh token above"
echo "2. Update Railway environment variable:"
echo "   GOOGLE_ADS_REFRESH_TOKEN=$REFRESH_TOKEN"
echo ""
echo "3. Or set it in your local environment:"
echo "   export GOOGLE_ADS_REFRESH_TOKEN=\"$REFRESH_TOKEN\""
echo ""
echo "💡 This refresh token does NOT expire and can be reused."
echo ""
