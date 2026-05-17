#!/bin/bash
# Test re-enabling a menu item

ITEM_ID=${1:-96}  # Default to Hot Dog (ID 96)

echo "Testing re-enable for item ID: $ITEM_ID"
echo ""

echo "1. Current state:"
curl -s "https://elazaros.onrender.com/api/menu-items/$ITEM_ID" | jq '{id, name, enabled}'
echo ""

echo "2. Attempting to re-enable (set enabled=true)..."
RESPONSE=$(curl -s -X PATCH "https://elazaros.onrender.com/api/menu-items/$ITEM_ID/enabled" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}')

echo "$RESPONSE" | jq '.'
echo ""

echo "3. New state:"
curl -s "https://elazaros.onrender.com/api/menu-items/$ITEM_ID" | jq '{id, name, enabled}'
echo ""

echo "4. Checking JSON file:"
curl -s "https://elazaros.onrender.com/menu-main-3.json" | jq ".data[] | select(.item_name == \"Hot Dog\") | {item_name, enabled}"
