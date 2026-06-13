import { Controller, Get } from '@nestjs/common';
import { PushServicesService } from './push-services.service';

@Controller()
export class PushServicesController {
  constructor(private readonly pushServicesService: PushServicesService) {}

  @Get()
  getHello(): string {
    return this.pushServicesService.getHello();
  }
}
