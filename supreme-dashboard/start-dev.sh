#!/bin/bash
# Supreme Dashboard Development Startup Script
# This script ensures clean startup and prevents port conflicts

set -e

echo "🚀 Starting Supreme Dashboard Development Environment..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*index.js" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Check if ports are available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is in use. Attempting to free it..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

echo "🔍 Checking port availability..."
check_port 3001
check_port 5173

# Set environment variables
export PORT=3001
export NODE_ENV=development

# Change to project directory
cd "$(dirname "$0")"

echo "📦 Installing dependencies if needed..."
if [ ! -d "node_modules" ]; then
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    cd client && npm install && cd ..
fi

if [ ! -d "server/node_modules" ]; then
    cd server && npm install && cd ..
fi

echo "🎯 Starting development servers..."
echo "   Server: http://localhost:3001"
echo "   Client: http://localhost:5173"
echo "   API Proxy: Client → Server (5173 → 3001)"
echo "   Press Ctrl+C to stop all servers"
echo ""

# Start the development environment
npm run dev
