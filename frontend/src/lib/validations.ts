import { z } from 'zod';

// URL validation schema
export const urlSchema = z.object({
  url: z.string()
    .url('Please enter a valid URL')
    .refine(
      (url) => url.includes('youtube.com') || url.includes('youtu.be'),
      'Only YouTube URLs are supported'
    ),
});

// File upload validation schema
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(
      (file) => file.size <= 100 * 1024 * 1024, // 100MB
      'File size must be less than 100MB'
    )
    .refine(
      (file) => file.type.startsWith('video/'),
      'Only video files are supported'
    ),
});

// User settings validation schema
export const userSettingsSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .optional(),
  email: z.string()
    .email('Please enter a valid email address')
    .optional(),
  maxFileSize: z.number()
    .min(1, 'Max file size must be at least 1MB')
    .max(1000, 'Max file size must be less than 1000MB')
    .optional(),
});

// Webhook validation schema
export const webhookSchema = z.object({
  url: z.string()
    .url('Please enter a valid URL'),
  events: z.array(z.string())
    .min(1, 'Select at least one event'),
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
});

// API key validation schema
export const apiKeySchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  permissions: z.array(z.string())
    .min(1, 'Select at least one permission'),
  expiresAt: z.date()
    .optional(),
});

// Auth validations
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const newPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// SOP validations
export const sopSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters'),
  steps: z.array(z.object({
    title: z.string().min(1, 'Step title is required').max(100, 'Step title must be less than 100 characters'),
    description: z.string().max(500, 'Step description must be less than 500 characters'),
    order: z.number().min(0),
  })).min(1, 'At least one step is required'),
});

// Video upload validations
export const videoUrlSchema = z.object({
  url: z.string().url('Please enter a valid URL')
    .refine((url) => {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
      return youtubeRegex.test(url);
    }, 'Please enter a valid YouTube URL'),
});

// Search validations
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query must be less than 100 characters'),
}); 