import { NestFactory } from '@nestjs/core';
import { NotificationServicesModule } from './notification-services.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationServicesModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
