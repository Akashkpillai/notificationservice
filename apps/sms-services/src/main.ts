import { NestFactory } from '@nestjs/core';
import { SmsServicesModule } from './sms-services.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(SmsServicesModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
        clientId: process.env.KAFKA_SMS_CLIENT_ID || 'sms-client',
      },
      consumer: {
        groupId: process.env.KAFKA_SMS_GROUP_ID || 'sms-group',
        allowAutoTopicCreation: true,
      },
    },
  });
  await app.listen();
}
bootstrap();
