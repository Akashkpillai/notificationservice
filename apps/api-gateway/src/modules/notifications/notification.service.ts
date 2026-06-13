import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { CreateNotificationDto, NotificationEventDto, KAFKA_TOPICS } from '@app/common';
import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  async send(dto: CreateNotificationDto) {
    const event: NotificationEventDto = {
      ...dto,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      retries: 0,
      source: 'api-gateway',
    };

    this.logger.log(`Publishing notification request ${event.id} to Kafka topic ${KAFKA_TOPICS.NOTIFICATION_REQUESTED}`);
    
    await firstValueFrom(this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_REQUESTED, event));

    return {
      success: true,
      message: 'Notification request published successfully',
      data: {
        id: event.id,
        timestamp: event.timestamp,
      },
    };
  }
}