// Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 250 * 1024 * 1024, // 250 MB
  ALLOWED_MIME_TYPES: [
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-msvideo',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
  ],
  TEMP_UPLOAD_DIR: './tmp',
  FILENAME_LENGTH: 32,
} as const;

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
  UPLOAD: {
    LIMIT: 5,
    TTL: 60000, // 1 minute
  },
  GLOBAL: {
    LIMIT: 10,
    TTL: 60000, // 1 minute
  },
} as const;

// Credit Configuration
export const CREDIT_CONFIG = {
  UPLOAD_COST: 1,
  BURN_IN_COST: 5,
  RETRY_COST: 0, // Free retries
} as const;

// Queue Configuration
export const QUEUE_CONFIG = {
  TRANSCRIPTION: {
    NAME: 'transcription-queue',
    CONCURRENCY: 1,
  },
  BURN_IN: {
    NAME: 'burn-in-queue',
    CONCURRENCY: 1,
  },
  CLEANUP: {
    NAME: 'cleanup-queue',
    REPEAT_INTERVAL: 5 * 60 * 1000, // 5 minutes
  },
} as const;
