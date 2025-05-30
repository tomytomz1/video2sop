import morgan from 'morgan';
import { stream } from '../utils/logger';
import { Request } from 'express';

// Define custom token for request body
morgan.token('body', (req: any) => JSON.stringify(req.body));

// Define custom token for response body
morgan.token('response-body', (req: any, res: any) => {
  const responseBody = res.locals.responseBody;
  return responseBody ? JSON.stringify(responseBody) : '';
});

// Create custom format
const format = ':remote-addr - :method :url :status :response-time ms - :body - :response-body';

// Create the middleware
const requestLogger = morgan(format, {
  stream,
  skip: (req: Request) => req.path === '/health', // Skip logging for health check endpoint
});

export default requestLogger; 