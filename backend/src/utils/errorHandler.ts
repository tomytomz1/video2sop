import { Response } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleError = (error: Error, res: Response) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message
    });
  }

  console.error('Unexpected error:', error);
  return res.status(500).json({
    error: 'An unexpected error occurred'
  });
}; 