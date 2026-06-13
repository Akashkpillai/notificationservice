import { Module } from '@nestjs/common';
import { SmsServicesController } from './sms-services.controller';
import { SmsServicesService } from './sms-services.service';

@Module({
  imports: [],
  controllers: [SmsServicesController],
  providers: [SmsServicesService],
})
export class SmsServicesModule {}
