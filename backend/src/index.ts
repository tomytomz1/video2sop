import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import jobsRouter from './routes/jobs';
import { VideoWorker } from './workers/videoWorker';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/jobs', jobsRouter);

// Health check route
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Initialize video worker
const videoWorker = new VideoWorker({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API listening on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing worker...');
  await videoWorker.close();
  process.exit(0);
}); 