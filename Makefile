# PolyHarmony Calendar - Docker Commands
# Simple commands for beginners and developers

.PHONY: help dev prod test clean logs restart rebuild

# Default target
help:
	@echo "🐳 PolyHarmony Calendar - Docker Commands"
	@echo ""
	@echo "📋 Available commands:"
	@echo "  make dev      - Start simple development environment"
	@echo "  make prod     - Start production environment"
	@echo "  make test     - Start testing environment"
	@echo "  make clean    - Clean up all containers and volumes"
	@echo "  make logs     - View application logs"
	@echo "  make restart  - Restart all services"
	@echo "  make rebuild  - Rebuild and start development"
	@echo ""
	@echo "🚀 Quick start: make dev"

# Simple development environment (beginner-friendly)
dev:
	@echo "🚀 Starting PolyHarmony development environment..."
	@echo "📱 App will be available at: http://localhost:3000"
	@echo "📧 Email testing at: http://localhost:8025"
	@echo "🗄️ Database at: localhost:5432"
	docker-compose -f docker-compose.simple.yml up

# Production environment
prod:
	@echo "🏭 Starting PolyHarmony production environment..."
	docker-compose up -d

# Testing environment
test:
	@echo "🧪 Starting PolyHarmony testing environment..."
	docker-compose -f docker-compose.test.yml up --build

# Staging environment
staging:
	@echo "🎭 Starting PolyHarmony staging environment..."
	docker-compose -f docker-compose.staging.yml up -d

# Clean up everything
clean:
	@echo "🧹 Cleaning up Docker environment..."
	docker-compose -f docker-compose.simple.yml down -v
	docker-compose -f docker-compose.test.yml down -v
	docker-compose -f docker-compose.staging.yml down -v
	docker-compose down -v
	docker system prune -f
	@echo "✅ Cleanup complete!"

# View logs
logs:
	@echo "📋 Showing application logs..."
	docker-compose -f docker-compose.simple.yml logs -f

# Restart services
restart:
	@echo "🔄 Restarting services..."
	docker-compose -f docker-compose.simple.yml restart

# Rebuild and start
rebuild:
	@echo "🔨 Rebuilding and starting development environment..."
	docker-compose -f docker-compose.simple.yml up --build

# Health check
health:
	@echo "🏥 Checking service health..."
	@docker-compose -f docker-compose.simple.yml ps

# Database access
db:
	@echo "🗄️ Connecting to database..."
	docker-compose -f docker-compose.simple.yml exec db psql -U postgres -d polyharmony_dev

# Shell access to app container
shell:
	@echo "🐚 Opening shell in app container..."
	docker-compose -f docker-compose.simple.yml exec app sh

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	docker-compose -f docker-compose.simple.yml exec app npm install

# Run tests
test-run:
	@echo "🧪 Running tests..."
	docker-compose -f docker-compose.simple.yml exec app npm test

# Build production
build-prod:
	@echo "🏗️ Building production image..."
	docker build -f Dockerfile.production -t polyharmony:production .

# Show all running containers
ps:
	@echo "📋 All running containers:"
	docker ps

# Show Docker system info
info:
	@echo "ℹ️ Docker system information:"
	docker system df
	docker version