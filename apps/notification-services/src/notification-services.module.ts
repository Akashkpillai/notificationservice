import { Module } from '@nestjs/common';
import { NotificationServicesController } from './notification-services.controller';
import { NotificationServicesService } from './notification-services.service';

@Module({
  imports: [],
  controllers: [NotificationServicesController],
  providers: [NotificationServicesService],
})
export class NotificationServicesModule {}
