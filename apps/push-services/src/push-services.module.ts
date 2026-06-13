import { Module } from '@nestjs/common';
import { PushServicesController } from './push-services.controller';
import { PushServicesService } from './push-services.service';

@Module({
  imports: [],
  controllers: [PushServicesController],
  providers: [PushServicesService],
})
export class PushServicesModule {}
