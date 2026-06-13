import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel, NotificationType } from '@app/common';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'ID of the user to notify',
    example: 'user-uuid-123',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Delivery method',
    enum: NotificationType,
    example: NotificationType.EMAIL,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    description: 'What triggered this notification',
    enum: NotificationChannel,
    example: NotificationChannel.ORDER,
  })
  @IsEnum(NotificationChannel)
  @IsNotEmpty()
  channel: NotificationChannel;

  @ApiPropertyOptional({
    description: 'Email subject — only for email notifications',
    example: 'Your order has been shipped!',
  })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({
    description: 'Main notification message',
    example: 'Your order #1234 is on the way!',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Extra dynamic data for templates',
    example: { orderId: '1234', trackingUrl: 'https://track.example.com' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
