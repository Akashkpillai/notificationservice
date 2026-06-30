import { NestFactory } from '@nestjs/core';
import { EmailServicesModule } from './email-services.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(EmailServicesModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
        clientId: process.env.KAFKA_EMAIL_CLIENT_ID || 'email-client',
      },
      consumer: {
        groupId: process.env.KAFKA_EMAIL_GROUP_ID || 'email-group',
        allowAutoTopicCreation: true,
      },
    },
  });
  await app.listen();
}
bootstrap();
