require('tsconfig-paths/register');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { CleanupProcessor } = require('./dist/modules/queues/cleanup.processor');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.get(CleanupProcessor);
  console.log('Cleanup worker process started.');
}
bootstrap();
