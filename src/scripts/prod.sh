#!/bin/bash

# Production startup script for SecureAuth API with Neon Cloud
# This script starts the application in production mode with Neon Cloud database

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
print_header "🚀 SecureAuth API - Production Startup"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    print_error ".env.production file not found!"
    echo "Please ensure .env.production exists with the following variables:"
    echo "  - PORT"
    echo "  - NODE_ENV (should be 'production')"
    echo "  - LOG_LEVEL"
    echo "  - DB_URL (Neon Cloud database URL)"
    echo "  - JWT_SECRET (strong secret key)"
    echo "  - ARCJET_KEY"
    echo ""
    echo "Example .env.production:"
    echo "  PORT=3000"
    echo "  NODE_ENV=production"
    echo "  LOG_LEVEL=warn"
    echo "  DB_URL=postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require"
    echo "  JWT_SECRET=your-production-secret-key-min-32-chars"
    echo "  ARCJET_KEY=ajkey_..."
    exit 1
fi

print_success ".env.production file found"

# Validate required variables
print_info "Validating environment variables..."
required_vars=("PORT" "NODE_ENV" "LOG_LEVEL" "DB_URL" "JWT_SECRET" "ARCJET_KEY")

missing_vars=()
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env.production; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

print_success "All required environment variables present"

# Validate NODE_ENV
if ! grep -q "^NODE_ENV=production" .env.production; then
    print_error "NODE_ENV must be set to 'production' in .env.production"
    exit 1
fi

print_success "NODE_ENV is set to 'production'"

# Check if Docker is running
print_info "Checking Docker installation..."
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

print_success "Docker is running"

# Check if Docker Compose is available
print_info "Checking Docker Compose..."
if ! docker compose version >/dev/null 2>&1; then
    print_error "Docker Compose is not installed or not available!"
    exit 1
fi

print_success "Docker Compose is available"

echo ""
print_header "🐳 Building Production Image"

# Build production image
print_info "Building Docker image..."
docker compose -f docker-compose.prod.yml build --no-cache

print_success "Docker image built successfully"

echo ""
print_header "🚀 Starting Production Container"

# Stop any existing containers
print_info "Checking for existing containers..."
if docker compose -f docker-compose.prod.yml ps 2>/dev/null | grep -q "secureauth-api-prod"; then
    print_info "Found existing container, stopping it..."
    docker compose -f docker-compose.prod.yml down
    print_success "Stopped existing container"
fi

# Start production container
print_info "Starting production container..."
docker compose -f docker-compose.prod.yml up -d

print_success "Production container started"

# Wait for service to be healthy
print_info "Waiting for service to be ready..."
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
    echo "Run: docker compose -f docker-compose.prod.yml logs app"
    exit 1
fi

echo ""
print_header "🎉 Production Environment Running!"
echo ""
echo -e "${GREEN}Service:${NC}"
echo "  📱 API:              ${BLUE}http://localhost:3000${NC}"
echo "  ❤️  Health Check:    ${BLUE}http://localhost:3000/health${NC}"
echo ""
echo -e "${GREEN}Environment:${NC}"
echo "  🌍 Mode:             ${BLUE}Production${NC}"
echo "  📦 Image:            ${BLUE}secureauth-api:latest${NC}"
echo "  🗂️  Database:        ${BLUE}Neon Cloud${NC}"
echo ""
echo -e "${GREEN}Useful Commands:${NC}"
echo "  View logs:           ${BLUE}docker compose -f docker-compose.prod.yml logs -f${NC}"
echo "  View stats:          ${BLUE}docker stats secureauth-api-prod${NC}"
echo "  Stop container:      ${BLUE}docker compose -f docker-compose.prod.yml stop${NC}"
echo "  Stop & remove:       ${BLUE}docker compose -f docker-compose.prod.yml down${NC}"
echo "  Restart container:   ${BLUE}docker compose -f docker-compose.prod.yml restart${NC}"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "  • Do NOT expose .env.production in version control"
echo "  • Use strong, randomly-generated JWT_SECRET (≥32 chars)"
echo "  • Monitor logs for errors: docker compose logs -f"
echo "  • Set up monitoring and alerting for production"
echo ""
echo -e "${BLUE}To deploy to Kubernetes or other orchestrators:${NC}"
echo "  1. Push image to registry: docker push your-registry/secureauth-api:latest"
echo "  2. Update orchestrator config with new image tag"
echo "  3. Ensure DB_URL and secrets are set in your platform"
echo ""

# Show container status
echo -e "${GREEN}Container Status:${NC}"
docker compose -f docker-compose.prod.yml ps

echo ""
print_success "✨ Production deployment complete!"
