#!/bin/bash
# Test the full disable/enable cycle

ITEM_ID=96  # Hot Dog

echo "=== Testing Disable/Enable Cycle ==="
echo ""

echo "1. Initial state:"
curl -s "https://elazaros.onrender.com/api/menu-items/$ITEM_ID" | jq '{id, name, enabled}'
echo ""

echo "2. Disabling item (enabled=false)..."
curl -s -X PATCH "https://elazaros.onrender.com/api/menu-items/$ITEM_ID/enabled" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}' | jq '{id, name, enabled}'
echo ""

sleep 2

echo "3. Checking if disabled:"
curl -s "https://elazaros.onrender.com/api/menu-items/$ITEM_ID" | jq '{id, name, enabled}'
echo ""

echo "4. Re-enabling item (enabled=true)..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PATCH "https://elazaros.onrender.com/api/menu-items/$ITEM_ID/enabled" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.'
echo ""

sleep 2

echo "5. Final state:"
curl -s "https://elazaros.onrender.com/api/menu-items/$ITEM_ID" | jq '{id, name, enabled}'
echo ""

echo "6. Checking JSON file:"
curl -s "https://elazaros.onrender.com/menu-main-3.json" | jq ".data[] | select(.item_name == \"Hot Dog\") | {item_name, enabled}"
