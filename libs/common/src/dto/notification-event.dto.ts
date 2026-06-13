import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsInt,
  Min,
  IsISO8601,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationChannel, NotificationType } from '@app/common';

export class NotificationEventDto {
  // ─── from original HTTP request ───

  @ApiProperty({ example: 'user_12345', description: 'Unique user ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    enum: NotificationChannel,
    description: 'Notification channel (email, sms, push)',
  })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({
    example: 'Your OTP is 123456',
    description: 'Main message content',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    example: 'OTP Verification',
    description: 'Subject (mainly for email)',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    example: { otp: '123456' },
    description: 'Additional dynamic metadata',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  // ─── added by API Gateway before publishing to Kafka ───

  @ApiProperty({ example: 'evt_abc123', description: 'Unique event ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    example: '2026-05-03T10:30:00.000Z',
    description: 'Event creation timestamp (ISO string)',
  })
  @IsISO8601()
  timestamp: string;

  @ApiProperty({
    example: 0,
    description: 'Retry count (increments on failure)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  retries: number;

  @ApiProperty({
    example: 'api-gateway',
    description: 'Source service that produced the event',
  })
  @IsString()
  @IsNotEmpty()
  source: string;
}
