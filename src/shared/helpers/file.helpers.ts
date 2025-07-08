import { extname } from 'path';

/**
 * Generate a random filename with the original file extension
 */
export function generateRandomFilename(
  originalFilename: string,
  length = 32,
): string {
  const randomName = Array(length)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join('');
  return `${randomName}${extname(originalFilename)}`;
}

/**
 * Convert bytes to human readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Convert MB to bytes
 */
export function mbToBytes(mb: number): number {
  return mb * 1024 * 1024;
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
}

/**
 * Check if file extension is allowed
 */
export function isAllowedFileType(
  filename: string,
  allowedExtensions: string[],
): boolean {
  const ext = extname(filename).toLowerCase();
  return allowedExtensions.includes(ext);
}
