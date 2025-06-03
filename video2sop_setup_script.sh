#!/bin/bash

# Video2SOP Development Setup Script
# Run this script in your project root directory (where docker-compose.yml is located)

set -e  # Exit on any error

echo "🚀 Setting up Video2SOP development environment..."
echo "📍 Current directory: $(pwd)"

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found!"
    echo "Please run this script in your project root directory (where docker-compose.yml is located)"
    exit 1
fi

if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ Error: frontend or backend directories not found!"
    echo "Please make sure you're in the video2sop project root directory"
    exit 1
fi

echo "✅ Found project structure, proceeding with setup..."

# Create the development Dockerfile for frontend
echo "📁 Creating frontend development Dockerfile..."
cat > frontend/Dockerfile.dev << 'EOF'
# Development Dockerfile for Next.js
FROM node:20-alpine

WORKDIR /app

# Install dependencies for development
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
EOF

# Update the docker-compose.yml to use the development Dockerfile
echo "🐳 Updating docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: video2sop
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=development
      - PORT=4000
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/video2sop?schema=public
      - REDIS_URL=redis://redis:6379
      - CORS_ORIGIN=http://localhost:3000
      - MAX_FILE_SIZE=104857600
      - UPLOAD_DIR=/app/uploads
      - JOB_RETENTION_DAYS=7
      - MAX_CONCURRENT_JOBS=5
      - LOG_LEVEL=debug
    ports:
      - "4000:4000"
    volumes:
      - ./backend:/app
      - /app/node_modules
      - ./backend/uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:4000/api
      - NEXT_PUBLIC_ENABLE_FILE_UPLOAD=true
      - NEXT_PUBLIC_ENABLE_YOUTUBE_UPLOAD=true
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
EOF

# Update the Prisma schema in the correct location
echo "🗄️  Updating Prisma schema..."
cat > backend/prisma/schema.prisma << 'EOF'
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

// Looking for ways to speed up your queries, or scale easily with your serverless or edge functions?
// Try Prisma Accelerate: https://pris.ly/cli/accelerate-init

generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-1.1.x"]
  // output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Job {
  id          String   @id @default(uuid())
  videoUrl    String
  type        String   // 'file' or 'youtube'
  status      String   @default("PENDING") // PENDING, PROCESSING, COMPLETED, FAILED
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  resultUrl   String?
  error       String?
  screenshots String[] // Array of screenshot URLs
  transcript  String?  // Full transcript text
  sop         String?  // Generated SOP content
  metadata    Json?    // Additional metadata (type, originalUrl, status, lastUpdated, etc.)

  @@index([status])
  @@index([createdAt])
  @@index([type])
}
EOF

# Update Next.js config
echo "⚙️  Updating Next.js configuration..."
cat > frontend/next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Enable standalone output for production builds
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  // Ensure proper API URL resolution
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
EOF

# Create environment files if they don't exist
echo "📝 Creating environment files..."

# Backend .env
if [ ! -f backend/.env ]; then
  cat > backend/.env << 'EOF'
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/video2sop?schema=public"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# OpenAI Configuration (Add your API key here)
OPENAI_API_KEY=your_openai_api_key_here

# File Upload Configuration
MAX_FILE_SIZE=104857600  # 100MB in bytes
UPLOAD_DIR=./uploads

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=15  # minutes
RATE_LIMIT_MAX=100    # requests per window

# Job Configuration
JOB_RETENTION_DAYS=7  # days to keep completed jobs
MAX_CONCURRENT_JOBS=5  # maximum number of concurrent processing jobs

# Logging
LOG_LEVEL=debug  # debug, info, warn, error
EOF
  echo "✅ Created backend/.env"
else
  echo "ℹ️  backend/.env already exists, skipping..."
fi

# Frontend .env.local
if [ ! -f frontend/.env.local ]; then
  cat > frontend/.env.local << 'EOF'
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Feature Flags
NEXT_PUBLIC_ENABLE_FILE_UPLOAD=true
NEXT_PUBLIC_ENABLE_YOUTUBE_UPLOAD=true

# Analytics (Optional)
NEXT_PUBLIC_ANALYTICS_ID=

# Build Configuration
NEXT_PUBLIC_BUILD_ID=development
EOF
  echo "✅ Created frontend/.env.local"
else
  echo "ℹ️  frontend/.env.local already exists, skipping..."
fi

# Stop existing containers
echo "🛑 Stopping any existing containers..."
docker-compose down 2>/dev/null || true

# Remove existing volumes to start fresh
echo "🧹 Cleaning up old data..."
docker-compose down -v 2>/dev/null || true

# Clean up Docker system
echo "🧼 Cleaning Docker system..."
docker system prune -f

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Check if backend is running
echo "🔍 Checking backend status..."
if ! docker-compose ps | grep -q "backend.*Up"; then
    echo "❌ Backend container failed to start. Checking logs..."
    docker-compose logs backend
    exit 1
fi

# Run database migrations
echo "🗄️  Running database migrations..."
if ! docker-compose exec -T backend npx prisma migrate dev --name init; then
    echo "⚠️  Migration failed, trying to create migration manually..."
    docker-compose exec -T backend npx prisma migrate deploy || true
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
docker-compose exec -T backend npx prisma generate

# Check service status
echo "📊 Checking service status..."
docker-compose ps

echo ""
echo "🎉 Setup complete! Your services should be running at:"
echo "   🌐 Frontend: http://localhost:3000"
echo "   🔧 Backend API: http://localhost:4000"
echo "   🗄️  PostgreSQL: localhost:5432"
echo "   📱 Redis: localhost:6379"
echo ""
echo "📝 Next steps:"
echo "   1. ✏️  Add your OpenAI API key to backend/.env"
echo "   2. 🎬 Install FFmpeg on your host system (if not already installed)"
echo "   3. 🌐 Visit http://localhost:3000 to test the application"
echo ""
echo "🔧 Useful commands:"
echo "   📊 Check logs: docker-compose logs -f"
echo "   🐚 Access backend: docker-compose exec backend sh"
echo "   🐚 Access frontend: docker-compose exec frontend sh"
echo "   🛑 Stop services: docker-compose down"
echo "   ♻️  Restart services: docker-compose restart"
echo ""
echo "🎯 If you encounter issues:"
echo "   1. Check logs with: docker-compose logs -f [service-name]"
echo "   2. Restart a specific service: docker-compose restart [service-name]"
echo "   3. Rebuild everything: docker-compose down && docker-compose up --build"