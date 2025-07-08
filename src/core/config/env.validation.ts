import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export class EnvironmentVariables {
  @IsString()
  @IsOptional()
  APP_NAME?: string;

  @IsString()
  @IsOptional()
  APP_VERSION?: string;

  @IsEnum(["development", "production", "test"])
  @IsOptional()
  NODE_ENV?: "development" | "production" | "test";

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  PORT?: number;

  @IsString()
  @IsOptional()
  HOST?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  @IsString()
  @IsOptional()
  JWT_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string;

  @IsString()
  @IsOptional()
  SUPABASE_URL?: string;

  @IsString()
  @IsOptional()
  SUPABASE_ANON_KEY?: string;

  @IsString()
  @IsOptional()
  REDIS_HOST?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  REDIS_PORT?: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  MAX_FILE_SIZE?: number;

  @IsString()
  @IsOptional()
  TEMP_UPLOAD_DIR?: string;

  @IsString()
  @IsOptional()
  ALLOWED_MIME_TYPES?: string;

  @IsEnum(["error", "warn", "info", "debug"])
  @IsOptional()
  LOG_LEVEL?: "error" | "warn" | "info" | "debug";

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value !== "false")
  ENABLE_SWAGGER?: boolean;
}
