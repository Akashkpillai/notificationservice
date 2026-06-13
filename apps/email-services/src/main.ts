import { NestFactory } from '@nestjs/core';
import { EmailServicesModule } from './email-services.module';

async function bootstrap() {
  const app = await NestFactory.create(EmailServicesModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
