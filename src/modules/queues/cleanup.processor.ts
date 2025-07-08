import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

@Processor('cleanup-queue', { concurrency: 1 })
export class CleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(CleanupProcessor.name);
  private readonly tmpDir = path.join(process.cwd(), 'tmp'); // Assuming tmp folder is in project root
  private readonly cleanupThresholdMs = 5 * 60 * 1000; // 5 minutes old

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Starting cleanup job ${job.id}...`);

    try {
      const files = await readdir(this.tmpDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tmpDir, file);
        try {
          const fileStat = await stat(filePath);
          if (
            fileStat.isFile() &&
            now - fileStat.mtime.getTime() > this.cleanupThresholdMs
          ) {
            await unlink(filePath);
            this.logger.log(`Deleted old temporary file: ${filePath}`);
          }
        } catch (err) {
          this.logger.warn(
            `Could not process or delete file ${filePath}: ${err.message}`,
          );
        }
      }
      this.logger.log(`Cleanup job ${job.id} completed.`);
      return { status: 'completed' };
    } catch (error) {
      this.logger.error(
        `Cleanup job ${job.id} failed: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to mark job as failed in BullMQ
    }
  }
}
