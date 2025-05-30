# Video to SOP Converter

Convert videos into detailed Standard Operating Procedures (SOPs) using AI.

## Features

- Upload local video files or provide YouTube URLs
- Automatic transcription using OpenAI Whisper
- AI-powered SOP generation with GPT-4
- Automatic screenshot extraction
- Export to PDF/Markdown
- Job history and management dashboard

## Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, TypeScript
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL
- **Queue:** Redis, BullMQ
- **AI:** OpenAI Whisper & GPT-4
- **Video Processing:** FFmpeg, yt-dlp

## Prerequisites

- Node.js 20 or later
- Docker and Docker Compose
- OpenAI API key
- FFmpeg installed on your system

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/video2sop.git
   cd video2sop
   ```

2. Set up environment variables:

   Create `.env` file in the `backend` directory:
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

   Create `.env.local` file in the `frontend` directory:
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

3. Start the development environment:
   ```bash
   docker-compose up -d
   ```

4. Initialize the database:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

5. Start the development servers:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## Production Deployment

1. Build the Docker images:
   ```bash
   docker-compose build
   ```

2. Start the production environment:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

## API Documentation

The API documentation is available at `/api/docs` when running the backend server.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for providing the AI models
- FFmpeg team for video processing capabilities
- All contributors and users of this project