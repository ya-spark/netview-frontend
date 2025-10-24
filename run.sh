#!/bin/bash

# NetView Frontend - Development Server Runner
# This script starts the Vite development server with proper configuration

set -e  # Exit on any error

echo "🚀 Starting NetView Frontend Development Server..."
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies first..."
    npm install
fi

# Check if dependencies are up to date
if [ "package-lock.json" -nt "node_modules" ]; then
    echo "📦 Dependencies may be outdated. Installing..."
    npm install
fi

echo "🔧 Starting Vite development server..."
echo "🌐 Server will be available at: http://localhost:5173"
echo "📝 Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm run dev
