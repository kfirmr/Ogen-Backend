import { AppModule } from './app.module';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { GeneralFilter } from './filters/http-error.filter';
import morgan from 'morgan';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(morgan('combined'));

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
