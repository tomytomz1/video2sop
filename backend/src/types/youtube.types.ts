export interface YouTubeVideoInfo {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
}

export interface YouTubeValidationResult {
  isValid: boolean;
  error?: string;
  videoInfo?: YouTubeVideoInfo;
} 