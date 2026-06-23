#!/bin/bash

# Find your Mac's local IP address
echo "🔍 Finding your Mac's IP address..."
echo ""

# Get IP address
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$IP" ]; then
    echo "❌ Could not find IP address"
    echo "Try running: ifconfig | grep 'inet '"
else
    echo "✅ Your Mac's IP address: $IP"
    echo ""
    echo "📱 To access LMS from your phone:"
    echo ""
    echo "1. Make sure your phone is on the SAME WiFi network as your Mac"
    echo ""
    echo "2. Update .env file:"
    echo "   CLIENT_URL=http://$IP:5173"
    echo ""
    echo "3. Restart the servers"
    echo ""
    echo "4. Send a new teacher invitation"
    echo ""
    echo "5. The email will have a link like:"
    echo "   http://$IP:5173/register/teacher/..."
    echo ""
    echo "6. This link will work on your phone! ✅"
    echo ""
    echo "📝 Backend will be accessible at: http://$IP:5000"
    echo "📝 Frontend will be accessible at: http://$IP:5173"
fi
