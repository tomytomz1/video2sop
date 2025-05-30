import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import requestLogger from './middleware/request-logger';
import { errorHandler } from './middleware/error';
import jobRoutes from './routes/job.routes';
import uploadRoutes from './routes/upload.routes';
import logger from './utils/logger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API routes
app.use('/api/jobs', jobRoutes);
app.use('/api/upload', uploadRoutes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

export default app; 