import app from './app';
import { validateEnv } from './utils/env';
const env = validateEnv();
const PORT = env.PORT;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 API docs: http://localhost:${PORT}/`);
  console.log(`🧪 Test ping: http://localhost:${PORT}/api/test/ping`);
});
