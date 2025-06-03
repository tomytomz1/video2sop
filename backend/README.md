# Video-to-SOP Backend

This is the backend service for the Video-to-SOP converter project. It handles video processing, transcription, and SOP generation.

## Prerequisites

- Node.js 18 or later
- PostgreSQL 12 or later
- Redis 6 or later
- ffmpeg
- yt-dlp

## Installation

1. Install Node.js dependencies:
```bash
npm install
```

2. Install system dependencies:

For Windows:
```powershell
# Run PowerShell as Administrator
.\scripts\install-dependencies.ps1
```

For Linux/Mac:
```bash
# Run with sudo if needed
chmod +x scripts/install-dependencies.sh
./scripts/install-dependencies.sh
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npx prisma migrate dev
```

## Development

Start the development server:
```bash
npm run dev
```

## Production

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## API Documentation

### Jobs

#### Create a new job
```http
POST /api/jobs
Content-Type: application/json

{
  "videoUrl": "https://example.com/video.mp4",
  "type": "file"
}
```

#### Get job status
```http
GET /api/jobs/:id
```

#### List all jobs
```http
GET /api/jobs
```

#### Delete a job
```http
DELETE /api/jobs/:id
```

## Architecture

The backend service uses the following components:

- Express.js for the web server
- Prisma for database access
- BullMQ for job queue management
- ffmpeg for video processing
- yt-dlp for YouTube video downloading
- OpenAI Whisper for transcription (TODO)
- OpenAI GPT-4 for SOP generation (TODO)

## License

MIT 