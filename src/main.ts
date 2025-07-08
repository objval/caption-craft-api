import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend communication
  app.enableCors();

  // Enable global validation pipe for DTOs
  app.useGlobalPipes(new ValidationPipe());

  // Set global prefix for API routes
  app.setGlobalPrefix('v1');

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);

  // Schedule cleanup job
  const cleanupQueue = app.get<Queue>(getQueueToken('cleanup-queue'));
  await cleanupQueue.add(
    'clean-temp-files',
    { timestamp: new Date().toISOString() },
    {
      repeat: { every: 5 * 60 * 1000 }, // Every 5 minutes
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
  console.log('Cleanup job scheduled to run every 5 minutes.');
}
bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
});
