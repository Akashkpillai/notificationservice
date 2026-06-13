import { Controller, Get } from '@nestjs/common';
import { NotificationServicesService } from './notification-services.service';

@Controller()
export class NotificationServicesController {
  constructor(private readonly notificationServicesService: NotificationServicesService) {}

  @Get()
  getHello(): string {
    return this.notificationServicesService.getHello();
  }
}
