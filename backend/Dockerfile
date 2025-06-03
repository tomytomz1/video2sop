# ---- Build stage ----
FROM node:18-bullseye-slim AS builder

WORKDIR /app

# Install system dependencies for build
RUN apt-get update && \
    apt-get install -y openssl libssl1.1 ffmpeg python3 python3-pip && \
    pip3 install yt-dlp && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy the rest of the source code
COPY . .

# Generate Prisma client (for the correct platform)
RUN npx prisma generate

# Build your app (TypeScript)
RUN npm run build

# ---- Production stage ----
FROM node:18-bullseye-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y openssl libssl1.1 ffmpeg python3 python3-pip && \
    pip3 install yt-dlp && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create necessary directories
RUN mkdir -p uploads logs

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["npm", "start"] 