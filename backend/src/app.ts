import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import testRoutes from './routes/test.routes';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Video2SOP Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      apiHealth: '/api/health',
      apiTest: '/api/test',
      apiTestPing: '/api/test/ping',
      apiTestDependencies: '/api/test/dependencies',
      jobs: '/api/jobs',
      upload: '/api/upload'
    }
  });
});

// Health endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'video2sop-backend',
    message: 'Backend is healthy'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'video2sop-backend',
    message: 'API is healthy and working'
  });
});

// Mount test routes - This handles /api/test/* routes
app.use('/api/test', testRoutes);

// Basic Jobs endpoints (placeholder)
app.get('/api/jobs', (req, res) => {
  res.json({ 
    jobs: [],
    message: 'Jobs endpoint working',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/jobs', (req, res) => {
  const { videoUrl, type } = req.body;
  
  if (!videoUrl) {
    return res.status(400).json({ error: 'Video URL is required' });
  }
  
  const job = {
    id: Math.random().toString(36).substr(2, 9),
    videoUrl,
    type: type || 'youtube',
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json(job);
});

// Upload endpoints (placeholder)
app.post('/api/upload/youtube', (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }
  
  res.json({
    message: 'YouTube URL received',
    url,
    jobId: Math.random().toString(36).substr(2, 9),
    status: 'processing'
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.originalUrl,
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
const PORT = Number(process.env.PORT) || 4000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 API docs: http://localhost:${PORT}/`);
  console.log(`🧪 Test ping: http://localhost:${PORT}/api/test/ping`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

export default app;