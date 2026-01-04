
export enum GenerationStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface GeneratedImage {
  id: string;
  url: string;
  originalUrl: string;
  prompt: string;
  timestamp: number;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type ImageQuality = 'Standard (Flash)' | 'Premium (Pro 1K)' | 'Ultra (Pro 4K)';
