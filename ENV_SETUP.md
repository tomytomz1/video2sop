# Environment Variables Setup

This document outlines all the required environment variables for both the frontend and backend services.

## Backend (.env)

Create a `.env` file in the `backend` directory with the following variables:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/video2sop?schema=public"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# OpenAI Configuration
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
```

## Frontend (.env.local)

Create a `.env.local` file in the `frontend` directory with the following variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Feature Flags
NEXT_PUBLIC_ENABLE_FILE_UPLOAD=true
NEXT_PUBLIC_ENABLE_YOUTUBE_UPLOAD=true

# Analytics (Optional)
NEXT_PUBLIC_ANALYTICS_ID=

# Build Configuration
NEXT_PUBLIC_BUILD_ID=development
```

## Development Setup

1. Copy the backend `.env` content into a new file at `backend/.env`
2. Copy the frontend `.env.local` content into a new file at `frontend/.env.local`
3. Update the values according to your development environment
4. Make sure to never commit these files to version control

## Production Setup

For production deployment:

1. Use different values for sensitive information
2. Set `NODE_ENV=production`
3. Use secure database credentials
4. Configure proper CORS origins
5. Set appropriate rate limits
6. Use production-grade logging levels

## Security Notes

- Never commit `.env` or `.env.local` files to version control
- Keep your OpenAI API key secure
- Use strong database passwords in production
- Regularly rotate sensitive credentials
- Use environment-specific values for different deployments 