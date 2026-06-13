import { NestFactory } from '@nestjs/core';
import { PushServicesModule } from './push-services.module';

async function bootstrap() {
  const app = await NestFactory.create(PushServicesModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
