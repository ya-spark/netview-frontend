#!/bin/bash

# NetView Frontend - Cleanup Script
# This script cleans up build artifacts, cache, and temporary files

set -e  # Exit on any error

echo "🧹 Cleaning NetView Frontend Project..."
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "🗑️  Removing build artifacts..."

# Remove build directories
if [ -d "dist" ]; then
    echo "  - Removing dist/ directory"
    rm -rf dist
fi

if [ -d "client/dist" ]; then
    echo "  - Removing client/dist/ directory"
    rm -rf client/dist
fi

# Remove cache directories
if [ -d "node_modules/.cache" ]; then
    echo "  - Removing node_modules/.cache/"
    rm -rf node_modules/.cache
fi

if [ -d ".vite" ]; then
    echo "  - Removing .vite/ cache directory"
    rm -rf .vite
fi

# Remove TypeScript build info
if [ -f "tsconfig.tsbuildinfo" ]; then
    echo "  - Removing TypeScript build info"
    rm -f tsconfig.tsbuildinfo
fi

# Remove logs
if [ -d "logs" ]; then
    echo "  - Removing logs/ directory"
    rm -rf logs
fi

# Remove temporary files
echo "🧽 Cleaning temporary files..."
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name "*.temp" -delete 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true

echo "✅ Cleanup completed!"
echo ""
echo "💡 To reinstall dependencies, run: ./setup.sh"
echo "💡 To start development server, run: ./run.sh"
