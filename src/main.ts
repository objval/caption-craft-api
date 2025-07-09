import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend communication
  app.enableCors({
    origin: [
      'https://preview-nextjs-project-guide-kzmg79sm7slp8yvzg01g.vusercontent.net',
      'https://preview-nextjs-project-guide-kzmjvr5qlkak1i3lktiw.vusercontent.net',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://superbstore.lol',
      /^https:\/\/preview-nextjs-project-guide-.*\.vusercontent\.net$/,
      /^https:\/\/.*\.vusercontent\.net$/,
      /^https:\/\/.*\.v0\.app$/,
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'User-Agent',
      'DNT',
      'Cache-Control',
      'X-Mx-ReqToken',
      'Keep-Alive',
      'X-Requested-With',
      'If-Modified-Since',
    ],
    credentials: true,
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    preflightContinue: false,
    optionsSuccessStatus: 200,
  });

  // Enable global validation pipe for DTOs
  app.useGlobalPipes(new ValidationPipe());

  // Set global prefix for API routes
  app.setGlobalPrefix('v1');

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);

  // Schedule cleanup job - reduced frequency to minimize Redis usage
  const cleanupQueue = app.get<Queue>(getQueueToken('cleanup-queue'));
  await cleanupQueue.add(
    'clean-temp-files',
    { timestamp: new Date().toISOString() },
    {
      repeat: { every: 30 * 60 * 1000 }, // Every 30 minutes (reduced from 15)
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
  console.log('Cleanup job scheduled to run every 30 minutes.');
}
bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
});
