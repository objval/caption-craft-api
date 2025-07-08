require('tsconfig-paths/register');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { BurnInProcessor } = require('./dist/modules/queues/burn-in.processor');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.get(BurnInProcessor);
  console.log('Burn-in worker process started.');
}
bootstrap();
