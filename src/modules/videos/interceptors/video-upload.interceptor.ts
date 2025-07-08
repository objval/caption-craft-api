import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UPLOAD_CONFIG } from '../../../core/config/constants';
import { generateRandomFilename } from '../../../shared/helpers/file.helpers';
import { VideoValidationService } from '../services/video-validation.service';

@Injectable()
export class VideoUploadInterceptor implements NestInterceptor {
  constructor(
    private readonly videoValidationService: VideoValidationService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const file = request.file as Express.Multer.File;

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file using the validation service
    await this.videoValidationService.validateVideoFile(file.path);

    return next.handle();
  }
}

export const createVideoFileInterceptor = () => {
  return FileInterceptor('video', {
    storage: diskStorage({
      destination: UPLOAD_CONFIG.TEMP_UPLOAD_DIR,
      filename: (req, file, cb) => {
        const filename = generateRandomFilename(file.originalname);
        return cb(null, filename);
      },
    }),
    limits: { fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE },
  });
};
