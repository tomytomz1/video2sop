#!/bin/bash
# rebuild.sh - Full rebuild script for Video2SOP project

echo "🔧 Video2SOP Full Rebuild Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed!"
    exit 1
fi

# Step 1: Stop all containers
print_status "Stopping all containers..."
docker-compose down

# Step 2: Remove old images (optional - uncomment if you want a complete fresh build)
# print_warning "Removing old images..."
# docker-compose down --rmi all

# Step 3: Clean up any dangling images
print_status "Cleaning up dangling images..."
docker image prune -f

# Step 4: Rebuild all services with no cache
print_status "Rebuilding all services (this may take a few minutes)..."
docker-compose build --no-cache

# Step 5: Start all services
print_status "Starting all services..."
docker-compose up -d

# Step 6: Wait for services to be ready
print_status "Waiting for services to start..."
sleep 10

# Step 7: Run database migrations
print_status "Running database migrations..."
docker-compose exec -T backend npx prisma migrate deploy || print_warning "Migration failed - may already be up to date"

# Step 8: Check service status
print_status "Checking service status..."
docker-compose ps

# Step 9: Show backend logs to confirm new version
print_status "Backend logs (last 20 lines):"
docker-compose logs backend --tail=20

# Step 10: Test the endpoints
echo ""
print_status "Testing endpoints..."
echo ""

# Test health endpoint
echo "Testing /health endpoint:"
curl -s http://localhost:4000/health | jq '.' 2>/dev/null || curl -s http://localhost:4000/health
echo ""

# Test API health endpoint
echo "Testing /api/health endpoint:"
curl -s http://localhost:4000/api/health | jq '.' 2>/dev/null || curl -s http://localhost:4000/api/health
echo ""

# Test the ping endpoint
echo "Testing /api/test/ping endpoint:"
curl -s http://localhost:4000/api/test/ping
echo ""
echo ""

# Final status
print_status "Rebuild complete! 🚀"
echo ""
echo "Services running at:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:4000"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "Test the ping endpoint: curl http://localhost:4000/api/test/ping"
echo "View logs: docker-compose logs -f backend"