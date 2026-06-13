import { Controller, Get } from '@nestjs/common';
import { SmsServicesService } from './sms-services.service';

@Controller()
export class SmsServicesController {
  constructor(private readonly smsServicesService: SmsServicesService) {}

  @Get()
  getHello(): string {
    return this.smsServicesService.getHello();
  }
}
