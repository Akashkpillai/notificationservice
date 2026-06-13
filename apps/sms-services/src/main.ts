import { NestFactory } from '@nestjs/core';
import { SmsServicesModule } from './sms-services.module';

async function bootstrap() {
  const app = await NestFactory.create(SmsServicesModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
