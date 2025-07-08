import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';
import * as os from 'os';

const unlinkAsync = promisify(fs.unlink);

@Injectable()
export class FfmpegService {
  async extractAudio(videoPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .save(outputPath)
        .on('end', () => resolve())
        .on('error', (err, stdout, stderr) => {
          console.error(`FFmpeg audio extraction error: ${err.message}`);
          console.error(`FFmpeg stdout: ${stdout}`);
          console.error(`FFmpeg stderr: ${stderr}`);
          reject(
            new InternalServerErrorException(
              `FFmpeg audio extraction failed: ${err.message}`,
            ),
          );
        });
    });
  }

  async burnSubtitles(
    videoPath: string,
    subtitlePath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .videoFilters(`subtitles='${subtitlePath}'`)
        .save(outputPath)
        .on('end', () => resolve())
        .on('error', (err, stdout, stderr) => {
          console.error(`FFmpeg subtitle burn-in error: ${err.message}`);
          console.error(`FFmpeg stdout: ${stdout}`);
          console.error(`FFmpeg stderr: ${stderr}`);
          reject(
            new InternalServerErrorException(
              `FFmpeg subtitle burn-in failed: ${err.message}`,
            ),
          );
        });
    });
  }

  async generateSrt(transcriptData: any, outputPath: string): Promise<void> {
    let srtContent = '';
    let counter = 1;

    for (const segment of transcriptData.segments) {
      const start = this.formatTime(segment.start);
      const end = this.formatTime(segment.end);
      const text = segment.text.trim();

      srtContent += `${counter}\n`;
      srtContent += `${start} --> ${end}\n`;
      srtContent += `${text}\n\n`;
      counter++;
    }

    await fs.promises.writeFile(outputPath, srtContent);
  }

  async downloadFromUrl(url: string, videoId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(os.tmpdir(), `${videoId}_retry.mp4`);
      ffmpeg(url)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err) =>
          reject(
            new InternalServerErrorException(
              `Failed to download video from URL: ${err.message}`,
            ),
          ),
        )
        .run();
    });
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds - Math.floor(seconds)) * 1000);

    return (
      `${String(hours).padStart(2, '0')}:` +
      `${String(minutes).padStart(2, '0')}:` +
      `${String(remainingSeconds).padStart(2, '0')},` +
      `${String(milliseconds).padStart(3, '0')}`
    );
  }

  async cleanupFile(filePath: string): Promise<void> {
    try {
      await unlinkAsync(filePath);
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
    }
  }
}
