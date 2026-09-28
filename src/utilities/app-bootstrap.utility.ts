import morgan from 'morgan';
import { HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ALLOWED_HEADERS } from '@Constants/headers';
import { DEFAULT_CLIENT_URL } from '@Constants/client';
import { GeneralFilter } from '../filters/http-error.filter';
import { REQUEST_BODY_LIMITS } from '@Constants/request-body';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { EnvironmentManager } from './environment-manager.utility';

export const configureApp = (app: NestExpressApplication): void => {
  app.use(morgan('combined'));
  app.useBodyParser('json', { limit: REQUEST_BODY_LIMITS.JSON });

  app.enableCors({
    credentials: true,
    allowedHeaders: ALLOWED_HEADERS,
    origin: EnvironmentManager.get('CLIENT_URL', {
      defaultValue: DEFAULT_CLIENT_URL,
    }),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nest Server API')
    .setDescription('API documentation for the Nest server skeleton')
    .setVersion('1.0.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api', app, swaggerDocument);

  app.useGlobalFilters(new GeneralFilter(app.get(HttpAdapterHost)));
};
