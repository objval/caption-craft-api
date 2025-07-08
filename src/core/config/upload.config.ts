import { registerAs } from '@nestjs/config';

export default registerAs('upload', () => ({
  maxFileSize:
    (process.env.MAX_FILE_SIZE && parseInt(process.env.MAX_FILE_SIZE)) ||
    250 * 1024 * 1024, // 250MB
  tempUploadDir: process.env.TEMP_UPLOAD_DIR || './tmp',
  allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(',') || [
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-msvideo',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
  ],
  filenameLength:
    (process.env.FILENAME_LENGTH && parseInt(process.env.FILENAME_LENGTH)) ||
    32,
}));
