import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { configureApp } from '@Utilities/app-bootstrap.utility';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
