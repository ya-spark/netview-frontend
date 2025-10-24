#!/bin/bash

# NetView Frontend - Setup Script
# This script sets up the development environment for the NetView Frontend project

set -e  # Exit on any error

echo "🛠️  Setting up NetView Frontend Development Environment..."
echo "======================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check Node.js version
echo "🔍 Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null || echo "not found")
if [ "$NODE_VERSION" = "not found" ]; then
    echo "❌ Error: Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"

# Check npm version
echo "🔍 Checking npm version..."
NPM_VERSION=$(npm --version 2>/dev/null || echo "not found")
if [ "$NPM_VERSION" = "not found" ]; then
    echo "❌ Error: npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $NPM_VERSION"

# Clean any existing installation
echo "🧹 Cleaning previous installation..."
if [ -d "node_modules" ]; then
    echo "  - Removing existing node_modules"
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    echo "  - Removing package-lock.json"
    rm -f package-lock.json
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check for vulnerabilities
echo "🔒 Checking for security vulnerabilities..."
if npm audit --audit-level=high 2>/dev/null; then
    echo "✅ No high-severity vulnerabilities found"
else
    echo "⚠️  High-severity vulnerabilities detected. Run 'npm audit fix' to fix them."
fi

# Update browserslist if needed
echo "🌐 Updating browserslist database..."
npx update-browserslist-db@latest 2>/dev/null || echo "⚠️  Could not update browserslist (optional)"

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x run.sh clean.sh setup.sh 2>/dev/null || true

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🚀 Next steps:"
echo "  1. Run './run.sh' to start the development server"
echo "  2. Open http://localhost:5173 in your browser"
echo "  3. Start developing!"
echo ""
echo "📚 Available commands:"
echo "  ./run.sh    - Start development server"
echo "  ./clean.sh  - Clean build artifacts and cache"
echo "  ./setup.sh  - Reinstall dependencies"
echo ""
echo "🔧 Development commands:"
echo "  npm run dev     - Start development server"
echo "  npm run build   - Build for production"
echo "  npm run preview - Preview production build"
echo "  npm run check   - Type checking"
