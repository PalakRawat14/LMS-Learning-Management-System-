#!/bin/bash

# LMS Server Startup Script with Automatic IP Detection
# This script will automatically detect your IP and update configuration files

echo "🚀 Starting LMS System..."
echo ""

# Kill any existing servers
echo "🛑 Stopping any running servers..."
lsof -iTCP -sTCP:LISTEN -P | grep -E ":(5000|5173)" | awk '{print $2}' | xargs kill -9 2>/dev/null
sleep 2

# Get current IP address
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$CURRENT_IP" ]; then
    echo "❌ Could not detect IP address"
    echo "Using localhost instead..."
    CURRENT_IP="localhost"
fi

echo "📡 Detected IP: $CURRENT_IP"
echo ""

# Check if IP changed in backend .env
BACKEND_ENV="/Users/nikhil/Desktop/lms/server/.env"
if grep -q "CLIENT_URL=http://$CURRENT_IP:5173" "$BACKEND_ENV"; then
    echo "✅ Backend .env already has correct IP"
else
    echo "🔧 Updating backend .env..."
    sed -i '' "s|CLIENT_URL=http://[^:]*:5173|CLIENT_URL=http://$CURRENT_IP:5173|g" "$BACKEND_ENV"
    echo "✅ Backend .env updated"
fi

# Check if IP changed in frontend .env
FRONTEND_ENV="/Users/nikhil/Desktop/lms/client/.env"
if grep -q "VITE_API_URL=http://$CURRENT_IP:5000/api" "$FRONTEND_ENV"; then
    echo "✅ Frontend .env already has correct IP"
else
    echo "🔧 Updating frontend .env..."
    sed -i '' "s|VITE_API_URL=http://[^:]*:5000/api|VITE_API_URL=http://$CURRENT_IP:5000/api|g" "$FRONTEND_ENV"
    echo "✅ Frontend .env updated"
fi

echo ""
echo "📋 Current Configuration:"
echo "   Backend API: http://$CURRENT_IP:5000"
echo "   Frontend: http://$CURRENT_IP:5173"
echo ""

# Start backend server
echo "🔧 Starting backend server..."
cd /Users/nikhil/Desktop/lms/server
npm start > /tmp/lms-backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend is running
if lsof -iTCP:5000 -sTCP:LISTEN > /dev/null 2>&1; then
    echo "✅ Backend server started successfully on port 5000"
else
    echo "❌ Backend server failed to start. Check /tmp/lms-backend.log"
    exit 1
fi

# Start frontend server
echo "🔧 Starting frontend server..."
cd /Users/nikhil/Desktop/lms/client
npm run dev > /tmp/lms-frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

# Check if frontend is running
if lsof -iTCP:5173 -sTCP:LISTEN > /dev/null 2>&1; then
    echo "✅ Frontend server started successfully on port 5173"
else
    echo "❌ Frontend server failed to start. Check /tmp/lms-frontend.log"
    exit 1
fi

echo ""
echo "🎉 LMS System is running!"
echo ""
echo "📱 Access URLs:"
echo "   Computer: http://localhost:5173"
echo "   Network:  http://$CURRENT_IP:5173"
echo "   Phone:    http://$CURRENT_IP:5173 (same WiFi)"
echo ""
echo "👤 Admin Login:"
echo "   Email:    admin@lms.com"
echo "   Password: admin123"
echo ""
echo "📝 Logs:"
echo "   Backend:  /tmp/lms-backend.log"
echo "   Frontend: /tmp/lms-frontend.log"
echo ""
echo "🛑 To stop servers: ./stop-servers.sh"
echo "   or press Ctrl+C"
echo ""
echo "Keep this terminal window open..."
echo ""

# Wait for user interrupt
trap "echo ''; echo '🛑 Stopping servers...'; lsof -iTCP -sTCP:LISTEN -P | grep -E ':(5000|5173)' | awk '{print \$2}' | xargs kill -9 2>/dev/null; echo '✅ Servers stopped'; exit" INT TERM

# Keep script running
tail -f /tmp/lms-backend.log /tmp/lms-frontend.log
