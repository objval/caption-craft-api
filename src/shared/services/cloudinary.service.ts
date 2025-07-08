import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiOptions,
  UploadApiResponse,
  DeleteApiResponse,
} from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadVideo(
    filePath: string,
    publicId?: string,
  ): Promise<UploadApiResponse> {
    try {
      const options: UploadApiOptions = {
        resource_type: 'video',
        folder: 'caption-craft/videos',
        public_id: publicId,
        overwrite: true,
      };
      const result = await cloudinary.uploader.upload(filePath, options);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Cloudinary video upload failed: ${errorMessage}`,
      );
    }
  }

  generateThumbnail(publicId: string): string {
    try {
      const url = cloudinary.url(`caption-craft/videos/${publicId}.jpg`, {
        resource_type: 'video',
        transformation: [
          { width: 300, height: 200, crop: 'fill' },
          { fetch_format: 'auto' },
        ],
      });
      return url;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Cloudinary thumbnail generation failed: ${errorMessage}`,
      );
    }
  }

  async deleteVideo(publicId: string): Promise<DeleteApiResponse> {
    try {
      const result = (await cloudinary.uploader.destroy(
        `caption-craft/videos/${publicId}`,
        {
          resource_type: 'video',
        },
      )) as DeleteApiResponse;
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Cloudinary video deletion failed: ${errorMessage}`,
      );
    }
  }

  generateVideoUrl(publicId: string): string {
    // Remove the folder prefix if it's already part of the publicId
    const cleanPublicId = publicId.startsWith('caption-craft/videos/')
      ? publicId.replace('caption-craft/videos/', '')
      : publicId;
    return cloudinary.url(`caption-craft/videos/${cleanPublicId}`, {
      resource_type: 'video',
    });
  }
}
