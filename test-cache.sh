#!/bin/bash

echo "🧪 Testing Buoy Cache System"
echo "================================"

# Test cache status (should show no cache initially)
echo "1. Testing cache status API..."
curl -s "http://localhost:3000/api/cache?action=status" | head -50

echo -e "\n2. Fetching buoy data (first time - should be slow)..."
time curl -s "http://localhost:3000/api/buoys" > /tmp/buoys1.json

echo -e "\n3. Checking cache status after first fetch..."
curl -s "http://localhost:3000/api/cache?action=status" | head -50

echo -e "\n4. Fetching buoy data (second time - should be fast from cache)..."
time curl -s "http://localhost:3000/api/buoys" > /tmp/buoys2.json

echo -e "\n5. Comparing data consistency..."
if diff /tmp/buoys1.json /tmp/buoys2.json > /dev/null; then
    echo "✅ Data is consistent between cache and fresh fetch"
else
    echo "❌ Data differs between cache and fresh fetch"
fi

echo -e "\n6. Testing cache clear..."
curl -s "http://localhost:3000/api/cache?action=clear"

echo -e "\n7. Cache status after clear..."
curl -s "http://localhost:3000/api/cache?action=status" | head -50

echo -e "\n🎉 Cache testing complete!"
