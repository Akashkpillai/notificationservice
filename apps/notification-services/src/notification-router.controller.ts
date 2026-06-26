import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationEventDto, KAFKA_TOPICS } from '@app/common';
import { NotificationRouterService } from './notification-router.service';

@Controller()
export class NotificationRouterController {
  private readonly logger = new Logger(NotificationRouterController.name);

  constructor(
    private readonly notificationRouterService: NotificationRouterService,
  ) { }


  @EventPattern(KAFKA_TOPICS.NOTIFICATION_REQUESTED)
  async handleNotificationRequested(@Payload() data: NotificationEventDto) {
    this.logger.log(`Received notification request: ${JSON.stringify(data)}`);
    await this.notificationRouterService.handleNotificationRequested(data);
  }
}
