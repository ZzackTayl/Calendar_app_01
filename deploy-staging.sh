#!/bin/bash

# Staging Deployment Script for Remote Developer Access
# This script deploys the app to Vercel for shared staging access

echo "🚀 Deploying Calendar App to Staging Environment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "📦 Deploying to Vercel..."
vercel --prod

echo "✅ Staging deployment complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Share the deployed URL with your remote developers"
echo "2. Have them test the staging environment"
echo "3. Provide them with the .env.local.example file for local development"
echo ""
echo "🔗 Staging URL will be displayed above after deployment"