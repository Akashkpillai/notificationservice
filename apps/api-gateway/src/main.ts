import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // ─── Security ─────────────────────────────────────
  app.use(helmet());
  app.enableCors();

  // ─── Validation ───────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields automatically
      forbidNonWhitelisted: true, // throw error if unknown fields sent
      transform: true, // auto transform types (string → number etc)
    }),
  );

  // ─── Global Interceptors & Filters ─────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ─── Swagger ──────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Notification Service API')
    .setDescription('Production-grade notification microservice')
    .setVersion('1.0')
    .addBearerAuth() // JWT auth button in Swagger UI
    .addTag('notifications')
    .addTag('health')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ─── Start ────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`🚀 API Gateway running on http://localhost:${port}`);
  logger.log(`�docs Swagger UI at http://localhost:${port}/api/docs`);
}
bootstrap();
