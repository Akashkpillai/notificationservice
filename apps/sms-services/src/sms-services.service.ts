import { NotificationEventDto, KAFKA_TOPICS } from '@app/common';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@app/common';
import { ClientKafka } from '@nestjs/microservices';
import twilio, { Twilio } from 'twilio';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SmsServices implements OnModuleInit {
  private readonly logger = new Logger(SmsServices.name);
  private twilioClient: Twilio;

  constructor(
    private readonly prismaService: PrismaService,
    @Inject('SMS_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly configService: ConfigService,
  ) { }

  async onModuleInit() {
    this.twilioClient = twilio(
      this.configService.get<string>('TWILIO_ACCOUNT_SID'),
      this.configService.get<string>('TWILIO_AUTH_TOKEN'),
    );
    await this.kafkaClient.connect();
  }

  async sendSms(data: NotificationEventDto) {
    this.logger.log(`Received SMS notification request: ${data.id}`);

    // deduplication check
    const existing = await this.prismaService.notification.findUnique({
      where: { id: data.id },
    });
    if (existing?.status === 'sent') {
      this.logger.warn(`Notification ${data.id} already sent — skipping`);
      return;
    }

    // validate recipient
    if (!data?.metadata?.to) {
      this.logger.error(`Notification ${data.id} missing recipient phone`);
      await this.prismaService.notification.update({
        where: { id: data.id },
        data: { status: 'dead', errorMessage: 'Missing recipient phone' },
      });
      return;
    }

    try {
      await this.twilioClient.messages.create({
        body: data.message,
        from: this.configService.get<string>('TWILIO_PHONE_NUMBER'),
        to: data?.metadata?.to,
      });

      this.logger.log(`SMS sent successfully: ${data.id}`);

      await this.prismaService.notification.update({
        where: { id: data.id },
        data: { status: 'sent', sentAt: new Date() },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send SMS: ${errorMessage}`);

      data.retries++;

      if (data.retries >= 3) {
        await this.prismaService.notification.update({
          where: { id: data.id },
          data: { status: 'dead', retries: data.retries, errorMessage },
        });
        this.logger.warn(`Notification ${data.id} moved to DLQ`);
        await firstValueFrom(
          this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATIONS_DLQ, data),
        );
      } else {
        await this.prismaService.notification.update({
          where: { id: data.id },
          data: { status: 'failed', retries: data.retries, errorMessage },
        });
        this.logger.warn(
          `Notification ${data.id} scheduled for retry (${data.retries}/3)`,
        );
        await firstValueFrom(
          this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATIONS_RETRY, data),
        );
      }
    }
  }
}