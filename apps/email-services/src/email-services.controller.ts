import { Controller, Get } from '@nestjs/common';
import { EmailServicesService } from './email-services.service';

@Controller()
export class EmailServicesController {
  constructor(private readonly emailServicesService: EmailServicesService) {}

  @Get()
  getHello(): string {
    return this.emailServicesService.getHello();
  }
}
