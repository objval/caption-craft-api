require('tsconfig-paths/register');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { TranscriptionProcessor } = require('./dist/modules/queues/transcription.processor');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.get(TranscriptionProcessor);
  console.log('Transcription worker process started.');
}
bootstrap();
