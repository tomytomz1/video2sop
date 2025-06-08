#!/bin/bash
set -e

echo "🚀 Starting Video2SOP Backend..."

# Function to generate a random string of specified length
generate_random_string() {
    local length=${1:-32}
    openssl rand -base64 $((length * 3 / 4)) | tr -d "=+/" | cut -c1-$length
}

# Check if essential environment variables are set, if not provide defaults
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-256-bit-secret" ]; then
    echo "⚠️  Generating random JWT_SECRET..."
    export JWT_SECRET=$(generate_random_string 64)
fi

if [ -z "$FILE_ENCRYPTION_KEY" ] || [ "$FILE_ENCRYPTION_KEY" = "your-32-character-encryption-key" ]; then
    echo "⚠️  Generating random FILE_ENCRYPTION_KEY..."
    export FILE_ENCRYPTION_KEY=$(generate_random_string 32)
fi

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "your-admin-token-must-be-at-least-32-characters-long" ]; then
    echo "⚠️  Generating random ADMIN_TOKEN..."
    export ADMIN_TOKEN=$(generate_random_string 64)
fi

# Set default values for other required variables if not set
export DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:TBtb0035993!@db:5432/video2sop"}
export REDIS_URL=${REDIS_URL:-"redis://redis:6379"}
export CORS_ORIGIN=${CORS_ORIGIN:-"http://localhost:3000"}
export PORT=${PORT:-4000}
export NODE_ENV=${NODE_ENV:-"development"}
export UPLOAD_DIR=${UPLOAD_DIR:-"./uploads"}
export MAX_FILE_SIZE=${MAX_FILE_SIZE:-"104857600"}
export JOB_RETENTION_DAYS=${JOB_RETENTION_DAYS:-"7"}
export MAX_CONCURRENT_JOBS=${MAX_CONCURRENT_JOBS:-"5"}
export LOG_LEVEL=${LOG_LEVEL:-"info"}
export YTDLP_COOKIES_PATH=${YTDLP_COOKIES_PATH:-"./cookies.txt"}
export RATE_LIMIT_WINDOW=${RATE_LIMIT_WINDOW:-"15"}
export RATE_LIMIT_MAX=${RATE_LIMIT_MAX:-"100"}
export SENSITIVE_RATE_LIMIT_WINDOW=${SENSITIVE_RATE_LIMIT_WINDOW:-"15"}
export SENSITIVE_RATE_LIMIT_MAX=${SENSITIVE_RATE_LIMIT_MAX:-"10"}
export MAX_SCREENSHOTS=${MAX_SCREENSHOTS:-"10"}
export SCREENSHOT_INTERVAL=${SCREENSHOT_INTERVAL:-"60"}
export JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-"7d"}

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ ERROR: OPENAI_API_KEY is required but not set!"
    echo "Please set the OPENAI_API_KEY environment variable."
    exit 1
fi

# Create necessary directories
mkdir -p /app/uploads /app/logs

# Create a basic cookies.txt file if it doesn't exist
if [ ! -f "$YTDLP_COOKIES_PATH" ]; then
    echo "📝 Creating basic cookies.txt file..."
    touch "$YTDLP_COOKIES_PATH"
fi

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
while ! nc -z ${DATABASE_HOST:-db} ${DATABASE_PORT:-5432}; do
  sleep 1
done
echo "✅ Database is ready!"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
while ! nc -z ${REDIS_HOST:-redis} ${REDIS_PORT:-6379}; do
  sleep 1
done
echo "✅ Redis is ready!"

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy || {
    echo "❌ Database migration failed. Trying to create database..."
    npx prisma db push --accept-data-loss || {
        echo "❌ Failed to set up database. Continuing anyway..."
    }
}

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

echo "🎉 Initialization complete! Starting application..."

# Start the application
exec "$@"