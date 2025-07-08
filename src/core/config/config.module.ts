import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';
import appConfig from './app.config';
import databaseConfig from './database.config';
import redisConfig from './redis.config';
import uploadConfig from './upload.config';
import { EnvironmentVariables } from './env.validation';

function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Configuration validation error: ${errors.toString()}`);
  }

  return validatedConfig;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, databaseConfig, redisConfig, uploadConfig],
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate,
    }),
  ],
  exports: [ConfigModule],
})
export class CustomConfigModule {}
