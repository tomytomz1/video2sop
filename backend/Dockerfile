# Use Node.js LTS version
FROM node:20-alpine

# Install system dependencies including netcat for health checks
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg \
    yt-dlp \
    netcat-openbsd \
    openssl \
    dos2unix \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy application code
COPY . .

# Prepare the entrypoint script
RUN dos2unix docker-entrypoint.sh && \
    chmod +x docker-entrypoint.sh

# Generate Prisma client and build TypeScript
RUN npx prisma generate && \
    npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create necessary directories and set permissions
RUN mkdir -p /app/uploads /app/logs /app/uploads/temp /app/uploads/processed /app/uploads/exports && \
    chown -R appuser:appgroup /app && \
    chmod 755 /app/uploads /app/logs

# Create a basic cookies.txt file with proper permissions
RUN touch /app/cookies.txt && \
    chown appuser:appgroup /app/cookies.txt && \
    chmod 644 /app/cookies.txt

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD nc -z localhost 4000 || exit 1

# Use the entrypoint script
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]

# Start the application
CMD ["npm", "run", "start"]