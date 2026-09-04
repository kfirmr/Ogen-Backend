import { Express } from 'express';
import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { configureApp } from '@Utilities/app-bootstrap.utility';
import { NestExpressApplication } from '@nestjs/platform-express';

let cachedApp: Express | null = null;

// Reused across warm serverless invocations so each request doesn't re-bootstrap Nest.
export const createServerlessApp = async (): Promise<Express> => {
  if (cachedApp != null) {
    return cachedApp;
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);
  await app.init();

  const expressInstance = app.getHttpAdapter().getInstance();

  cachedApp = expressInstance;

  return expressInstance;
};
