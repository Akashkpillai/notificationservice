import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CreateNotificationDto } from '@app/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Post()
  @ApiOperation({ summary: 'Send a notification event' })
  @ApiResponse({ status: 201, description: 'Notification request accepted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async sendNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationService.send(dto);
  }
}