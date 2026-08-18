#!/bin/bash

# Development startup script for SecureAuth API with Neon Local
# This script starts the application in development mode with Neon Local database

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Main script
print_header "🚀 SecureAuth API - Development Startup"

# Check if .env.development exists
if [ ! -f .env.development ]; then
    print_error ".env.development file not found!"
    echo "Please ensure .env.development exists with the following variables:"
    echo "  - PORT"
    echo "  - NODE_ENV"
    echo "  - LOG_LEVEL"
    echo "  - DB_URL (for Neon Local)"
    echo "  - JWT_SECRET"
    echo "  - ARCJET_KEY"
    echo "  - NEON_API_KEY"
    echo "  - NEON_PROJECT_ID"
    exit 1
fi

print_success ".env.development file found"

# Check if Docker is running
print_info "Checking Docker installation..."
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

print_success "Docker is running"

# Check if Docker Compose is available
print_info "Checking Docker Compose..."
if ! docker compose version >/dev/null 2>&1; then
    print_error "Docker Compose is not installed or not available!"
    echo "Please ensure Docker Desktop is installed with Compose support."
    exit 1
fi

print_success "Docker Compose is available"

# Create necessary directories
print_info "Setting up directories..."
mkdir -p .neon_local
print_success "Created .neon_local directory"

# Add to .gitignore if needed
if ! grep -q ".neon_local/" .gitignore 2>/dev/null; then
    echo ".neon_local/" >> .gitignore
    print_success "Added .neon_local/ to .gitignore"
else
    print_success ".neon_local/ already in .gitignore"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_info "Installing npm dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

echo ""
print_header "🐳 Docker Compose Setup"

# Stop any existing containers
print_info "Checking for existing containers..."
if docker compose -f docker-compose.dev.yml ps 2>/dev/null | grep -q "secureauth-api-dev\|neon-local-db"; then
    print_info "Found existing containers, stopping them..."
    docker compose -f docker-compose.dev.yml down --remove-orphans
    print_success "Stopped existing containers"
fi

# Build and start containers
print_info "Building and starting development containers..."
docker compose -f docker-compose.dev.yml up --build -d

print_success "Containers started"

# Wait for services to be healthy
print_info "Waiting for services to be ready..."
echo "  Checking Neon Local database..."

# Wait for database
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker compose -f docker-compose.dev.yml exec -T neon-local pg_isready -U postgres >/dev/null 2>&1; then
        print_success "Neon Local database is ready"
        break
    fi
    attempt=$((attempt + 1))
    sleep 1
done

if [ $attempt -eq $max_attempts ]; then
    print_error "Database failed to start within timeout"
    echo "Run: docker compose -f docker-compose.dev.yml logs neon-local"
    exit 1
fi

# Wait for API
echo "  Checking API service..."
sleep 3

max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:3000/health >/dev/null 2>&1; then
        print_success "API service is ready"
        break
    fi
    attempt=$((attempt + 1))
    sleep 1
done

if [ $attempt -eq $max_attempts ]; then
    print_error "API failed to start within timeout"
    echo "Run: docker compose -f docker-compose.dev.yml logs app"
    exit 1
fi

# Run database migrations
print_info "Applying database schema with Drizzle..."
if docker compose -f docker-compose.dev.yml exec -T app npm run db:migrate 2>/dev/null; then
    print_success "Database migrations applied"
else
    print_info "Could not apply migrations (database might not be fully initialized)"
fi

echo ""
print_header "🎉 Development Environment Ready!"
echo ""
echo -e "${GREEN}Services running:${NC}"
echo "  📱 API:              ${BLUE}http://localhost:3000${NC}"
echo "  ❤️  Health Check:    ${BLUE}http://localhost:3000/health${NC}"
echo "  🐘 PostgreSQL:       ${BLUE}localhost:5432${NC}"
echo ""
echo -e "${GREEN}Documentation:${NC}"
echo "  📖 API Routes:       See src/routes/auth.route.js"
echo "  🔐 Auth Flow:        See README.md#api-endpoints"
echo ""
echo -e "${GREEN}Useful Commands:${NC}"
echo "  View logs:           ${BLUE}docker compose -f docker-compose.dev.yml logs -f${NC}"
echo "  View app logs:       ${BLUE}docker compose -f docker-compose.dev.yml logs -f app${NC}"
echo "  View DB logs:        ${BLUE}docker compose -f docker-compose.dev.yml logs -f neon-local${NC}"
echo "  DB Shell:            ${BLUE}docker compose -f docker-compose.dev.yml exec neon-local psql -U postgres${NC}"
echo "  Run migrations:      ${BLUE}docker compose -f docker-compose.dev.yml exec app npm run db:migrate${NC}"
echo "  Run seed:            ${BLUE}docker compose -f docker-compose.dev.yml exec app npm run db:seed${NC}"
echo "  Stop environment:    ${BLUE}docker compose -f docker-compose.dev.yml down${NC}"
echo "  Full cleanup:        ${BLUE}docker compose -f docker-compose.dev.yml down -v${NC}"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "  • Code changes auto-reload (npm run dev is running)"
echo "  • Database persists in Docker volume (survives container restart)"
echo "  • To reset database: docker compose -f docker-compose.dev.yml down -v && ./dev.sh"
echo ""
echo -e "${YELLOW}To stop this environment, press Ctrl+C or run:${NC}"
echo "  ${BLUE}docker compose -f docker-compose.dev.yml down${NC}"
echo ""

# Tail logs
print_info "Streaming container logs (press Ctrl+C to stop)..."
echo ""
docker compose -f docker-compose.dev.yml logs -f app
