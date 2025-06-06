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

## YouTube Upload API

### POST /api/upload/youtube

Upload and process a YouTube video by URL.

**Request:**
- Method: POST
- URL: `/api/upload/youtube`
- Body (JSON):
  ```json
  { "url": "https://www.youtube.com/watch?v=..." }
  ```

**Success Response:**
- Status: 201
- Body:
  ```json
  {
    "status": "success",
    "data": {
      "jobId": "<job-id>",
      "message": "YouTube video processing started"
    }
  }
  ```

**Error Responses:**
- Status: 400 (invalid/malformed URL, unreachable video, or expired cookies)
  ```json
  {
    "status": "error",
    "message": "Invalid YouTube URL"
  }
  ```
- Status: 500 (internal server error)
  ```json
  {
    "status": "error",
    "message": "Internal server error"
  }
  ```

**Job Tracking:**
- The response includes a `jobId` for tracking processing status.
- Use the `/api/jobs` endpoint to check job status (future improvement).

**Example curl:**
```sh
curl -X POST http://localhost:4000/api/upload/youtube \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw" }'
```

**Example Postman:**
- Method: POST
- URL: http://localhost:4000/api/upload/youtube
- Body: raw JSON `{ "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw" }`
- Headers: `Content-Type: application/json`

**What to expect:**
- On success: status 201, jobId, and a message.
- On error: status 400 or 500, with a clear error message.

**Next steps:**
- Integrate Whisper for transcription in the processing pipeline.
- Add job status and result retrieval endpoints.

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

## Testing (End-to-End in Docker)

To run the YouTube upload end-to-end test suite in the correct environment (inside the backend Docker container):

### 1. Using the provided script
```sh
sh ./scripts/test-in-docker.sh
```
- This will find the running backend container and run the test suite inside it.
- All output will be printed to your console.
- The script returns the correct exit code for CI/CD or local use.

### 2. Using npm (recommended for developers)
```sh
npm run test:docker
```
- This runs the same script as above for convenience.

### Why run tests in Docker?
- The backend expects Linux-style paths and a valid cookies.txt file at `/app/cookies.txt`.
- Running tests on your host (Windows/Mac) may cause path or environment issues.
- Always use the Dockerized environment for reliable, production-like test results.

### Troubleshooting
- Ensure the backend container is running (`docker-compose up backend`).
- Ensure `cookies.txt` is present in your `backend` folder and is valid.
- If you see errors about missing cookies or file not found, check the volume mount and container path.

## Backups

Backups of uploads and exports can be created by running:

```
node scripts/backup.js
```

Backups are stored in the `/backups` directory as zip files with a timestamp.

> **Note:** Database backup integration is planned for the future. For now, only file backups are included. 