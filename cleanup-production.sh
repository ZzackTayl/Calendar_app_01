#!/bin/bash

echo "🧹 Cleaning up for production deployment..."

# Remove node_modules and package-lock.json
echo "📦 Removing node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

# Clean Next.js cache
echo "🗑️ Cleaning Next.js cache..."
rm -rf .next

# Install dependencies (production only)
echo "📥 Installing production dependencies..."
npm ci --only=production

# Install dev dependencies separately
echo "📥 Installing development dependencies..."
npm install --save-dev

echo "✅ Cleanup complete! Ready for production deployment."
echo ""
echo "🚀 Next steps:"
echo "1. Commit these changes to git"
echo "2. Push to your repository"
echo "3. Deploy to Vercel"
echo ""
echo "💡 The ruv-swarm package has been completely removed from the project as it should be an external MCP tool."
