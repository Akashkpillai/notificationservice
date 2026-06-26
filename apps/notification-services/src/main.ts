import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { NotificationServicesModule } from './notification-services.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(NotificationServicesModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
        clientId: process.env.KAFKA_ROUTER_CLIENT_ID || 'notification-router-client',
      },
      consumer: {
        groupId: process.env.KAFKA_ROUTER_GROUP_ID || 'notification-router-group',
        allowAutoTopicCreation: true,
      },
    },
  });
  await app.listen();
}
bootstrap();
