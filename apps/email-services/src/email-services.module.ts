import { Module } from '@nestjs/common';
import { EmailServicesController } from './email-services.controller';
import { EmailServicesService } from './email-services.service';

@Module({
  imports: [],
  controllers: [EmailServicesController],
  providers: [EmailServicesService],
})
export class EmailServicesModule {}
