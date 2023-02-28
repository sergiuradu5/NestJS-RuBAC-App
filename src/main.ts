import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useLogger(['log', 'debug', 'error', 'warn', 'verbose']);
  // When 'trust proxy' is enabled, it allows usage of 'X-Forwarded-For' req header
  // This allows client to "set" their own IP address and is used for testing purposes only of this app
  app.set('trust proxy', 1);
  await app.listen(3000);
}
bootstrap();
