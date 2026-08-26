import morgan from 'morgan';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ALLOWED_HEADERS } from '@Constants/headers';
import { DEFAULT_CLIENT_URL } from '@Constants/client';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { GeneralFilter } from './filters/http-error.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { EnvironmentManager } from '@Utilities/environment-manager.utility';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(morgan('combined'));

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
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
