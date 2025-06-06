import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, string[]>;
  path?: string;
}

// Route-specific error messages
const routeErrorMessages: Record<string, Record<string, string>> = {
  '/api/upload/youtube': {
    'INVALID_URL': 'Please enter a valid YouTube URL.',
    'VIDEO_NOT_FOUND': 'The YouTube video could not be found. Please check the URL.',
    'VIDEO_TOO_LONG': 'The video is too long. Please select a video under 1 hour.',
    'PRIVATE_VIDEO': 'This video is private. Please use a public video.',
    'AGE_RESTRICTED': 'This video is age-restricted and cannot be processed.',
    'QUOTA_EXCEEDED': 'YouTube API quota exceeded. Please try again later.',
    'DEFAULT': 'Something went wrong while uploading your video. Please try again.'
  },
  '/api/jobs/status': {
    'JOB_NOT_FOUND': 'The job could not be found. It may have been deleted.',
    'JOB_EXPIRED': 'This job has expired. Please create a new one.',
    'PROCESSING_ERROR': 'There was an error processing your video. Please try again.',
    'DEFAULT': 'Unable to check job status. Please try again.'
  },
  '/api/openai': {
    'INVALID_PROMPT': 'Please provide a valid prompt for the AI.',
    'CONTENT_FILTER': 'The prompt was flagged by our content filter. Please try a different prompt.',
    'MODEL_OVERLOADED': 'The AI model is currently busy. Please try again in a few minutes.',
    'DEFAULT': 'There was an error processing your request with AI. Please try again.'
  }
};

// HTTP status code messages
const httpStatusMessages: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Please log in to continue.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  422: 'The request was well-formed but had semantic errors.',
  429: 'Too many requests. Please try again later.',
  500: 'Server error. Please try again later.',
  503: 'Service temporarily unavailable. Please try again later.'
};

const isAxiosError = (error: unknown): error is AxiosError => {
  return error instanceof Error && 'isAxiosError' in error;
};

export const getErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    const path = apiError?.path || error.config?.url;
    
    // Try to get route-specific error message
    if (path) {
      const route = Object.keys(routeErrorMessages).find(r => path.startsWith(r));
      if (route) {
        const routeMessages = routeErrorMessages[route];
        if (apiError?.code && routeMessages[apiError.code]) {
          return routeMessages[apiError.code];
        }
        return routeMessages['DEFAULT'];
      }
    }

    // Handle specific error codes
    if (apiError?.code) {
      switch (apiError.code) {
        case 'INVALID_CREDENTIALS':
          return 'Invalid email or password. Please try again.';
        case 'UNAUTHORIZED':
          return 'Please log in to continue.';
        case 'FORBIDDEN':
          return 'You do not have permission to perform this action.';
        case 'RATE_LIMIT_EXCEEDED':
          return 'Too many requests. Please try again later.';
        case 'VALIDATION_ERROR':
          return 'Please check your input and try again.';
        case 'FILE_TOO_LARGE':
          return 'The file is too large. Please choose a smaller file.';
        case 'INVALID_FILE_TYPE':
          return 'Invalid file type. Please check the supported formats.';
        case 'JOB_NOT_FOUND':
          return 'The requested job could not be found.';
        case 'PROCESSING_ERROR':
          return 'An error occurred while processing your request.';
        default:
          return apiError.message || 'An unexpected error occurred.';
      }
    }

    // Handle HTTP status codes
    if (error.response?.status) {
      return httpStatusMessages[error.response.status] || 'An unexpected error occurred.';
    }

    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please check your connection and try again.';
    }
    if (!error.response) {
      return 'Network error. Please check your connection and try again.';
    }
  }

  // Fallback error message
  return 'An unexpected error occurred. Please try again later.';
};

export const getValidationErrors = (error: unknown): Record<string, string[]> => {
  if (isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    return apiError?.details || {};
  }
  return {};
};

export const isNetworkError = (error: unknown): boolean => {
  if (isAxiosError(error)) {
    return !error.response;
  }
  return false;
};

export const isAuthError = (error: unknown): boolean => {
  if (isAxiosError(error)) {
    return error.response?.status === 401 || error.response?.status === 403;
  }
  return false;
};

export const isRateLimitError = (error: unknown): boolean => {
  if (isAxiosError(error)) {
    return error.response?.status === 429;
  }
  return false;
};

export const isValidationError = (error: unknown): boolean => {
  if (isAxiosError(error)) {
    return error.response?.status === 422;
  }
  return false;
};

export const isServerError = (error: unknown): boolean => {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    return status !== undefined && status >= 500;
  }
  return false;
}; 