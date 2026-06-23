#!/bin/bash

# Stop LMS Servers

echo "🛑 Stopping LMS servers..."

# Kill all servers on ports 5000 and 5173
lsof -iTCP -sTCP:LISTEN -P | grep -E ":(5000|5173)" | awk '{print $2}' | xargs kill -9 2>/dev/null

sleep 1

# Verify they're stopped
if lsof -iTCP -sTCP:LISTEN -P | grep -E ":(5000|5173)" > /dev/null 2>&1; then
    echo "⚠️  Some servers may still be running"
else
    echo "✅ All servers stopped successfully"
fi
