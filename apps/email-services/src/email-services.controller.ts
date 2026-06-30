import { Controller, Logger } from '@nestjs/common';
import { EmailServices } from './email-services.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationEventDto, KAFKA_TOPICS } from '@app/common';

@Controller()
export class EmailServicesController {
  private readonly logger = new Logger(EmailServicesController.name)
  constructor(private readonly emailServices: EmailServices) { }

  @EventPattern(KAFKA_TOPICS.EMAIL_NOTIFICATIONS)
  async handleEmailNotifications(@Payload() data: NotificationEventDto) {
    this.logger.log(`Received email notification: ${JSON.stringify(data)}`);
    await this.emailServices.sendEmail(data);
  }
}
