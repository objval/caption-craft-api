import { Injectable, BadRequestException } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';

@Injectable()
export class VideoValidationService {
  async validateVideoFile(filePath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          // ffprobe failed, likely not a valid media file
          return reject(
            new BadRequestException(
              'Invalid media file. Please upload a valid video or audio file.',
            ),
          );
        }

        // Check if the file has at least one stream
        if (!metadata.streams || metadata.streams.length === 0) {
          return reject(
            new BadRequestException(
              'Invalid media file. No streams detected. Please upload a valid video or audio file.',
            ),
          );
        }

        // Check if at least one stream is video or audio
        const hasValidStream = metadata.streams.some(
          (stream) =>
            stream.codec_type === 'video' || stream.codec_type === 'audio',
        );

        if (!hasValidStream) {
          return reject(
            new BadRequestException(
              'Invalid media file. No video or audio streams detected. Please upload a valid video or audio file.',
            ),
          );
        }

        // Validation passed
        resolve();
      });
    });
  }

  validateFileSize(file: Express.Multer.File, maxSizeBytes: number): void {
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `File too large. Maximum size allowed is ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`,
      );
    }
  }

  validateFileType(
    file: Express.Multer.File,
    allowedMimeTypes: string[],
  ): void {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }
  }
}
