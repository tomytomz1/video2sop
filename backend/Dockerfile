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

# Install runtime dependencies, including OpenSSL 1.1 and yt-dlp via pip
RUN apt-get update && \
    apt-get install -y openssl libssl1.1 ffmpeg python3 python3-pip && \
    pip3 install yt-dlp && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["npm", "start"] 