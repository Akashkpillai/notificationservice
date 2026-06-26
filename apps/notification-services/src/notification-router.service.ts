import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { KAFKA_TOPICS, NotificationEventDto, PrismaService, NotificationType } from '@app/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class NotificationRouterService implements OnModuleInit {
    private readonly logger = new Logger(NotificationRouterService.name);

    constructor(
        private readonly prismaService: PrismaService,
        @Inject('NOTIFICATION_SERVICE') private readonly kafkaClient: ClientKafka,
    ) { }

    async handleNotificationRequested(data: NotificationEventDto) {
        this.logger.log(`Received notification request: ${JSON.stringify(data)}`);
        const notification = await this.prismaService.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                channel: data.channel,
                payload: { ...data },
                status: 'pending',
            },
        });
        this.logger.log(`Created notification: ${JSON.stringify(notification)}`);
        let topicMap: string = KAFKA_TOPICS.NOTIFICATION_REQUESTED;
        switch (notification.type) {
            case NotificationType.EMAIL:
                topicMap = KAFKA_TOPICS.EMAIL_NOTIFICATIONS;
                break;
            case NotificationType.SMS:
                topicMap = KAFKA_TOPICS.SMS_NOTIFICATIONS;
                break;
            case NotificationType.PUSH:
                topicMap = KAFKA_TOPICS.PUSH_NOTIFICATIONS;
                break;
            default:
                this.logger.warn(`Unknown notification type: ${notification.type}. Skipping.`);
                return;
        }
        this.kafkaClient.emit(topicMap, data);
    }

    async onModuleInit() {
        await this.kafkaClient.connect();
    }


}
