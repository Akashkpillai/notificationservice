import { Controller, Logger } from '@nestjs/common';
import { SmsServices } from './sms-services.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationEventDto, KAFKA_TOPICS } from '@app/common';

@Controller()
export class SmsServicesController {
  private readonly logger = new Logger(SmsServicesController.name)
  constructor(private readonly smsServices: SmsServices) { }

  @EventPattern(KAFKA_TOPICS.SMS_NOTIFICATIONS)
  async handleSmsNotifications(@Payload() data: NotificationEventDto) {
    this.logger.log(`Received sms notification: ${JSON.stringify(data)}`);
    await this.smsServices.sendSms(data);
  }
}
