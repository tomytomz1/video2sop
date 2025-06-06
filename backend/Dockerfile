# Use Node.js LTS version
FROM node:20-alpine

# Create app directory and set permissions
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Generate Prisma client and build TypeScript
RUN npx prisma generate && \
    npm run build

# Set proper permissions
RUN chown -R appuser:appgroup /app

# Create and set permissions for uploads directory
RUN mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app/uploads && \
    chmod 755 /app/uploads

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/status || exit 1

# Start the application
CMD ["npm", "run", "start"] 