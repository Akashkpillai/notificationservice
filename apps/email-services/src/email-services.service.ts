import { NotificationEventDto, PrismaService, KAFKA_TOPICS } from '@app/common';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import * as nodemailer from 'nodemailer'
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EmailServices implements OnModuleInit {
  private readonly logger = new Logger(EmailServices.name)
  private transporter: nodemailer.Transporter;
  constructor(
    private readonly prismaService: PrismaService,
    @Inject('EMAIL_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly configService: ConfigService
  ) {

  }

  async onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
    await this.kafkaClient.connect();
  }
  /**
   * @description send email notification and update the status in the database
   * @param data Email Notification Event
   * @returns 
   */
  async sendEmail(data: NotificationEventDto) {
    this.logger.log(`Received email notification request: ${JSON.stringify(data)}`);
    const existing = await this.prismaService.notification.findUnique({
      where: { id: data.id },
    });
    // to check the notification is already sent
    if (existing?.status === 'sent') {
      this.logger.warn(`Notification ${data.id} already sent — skipping duplicate`);
      return;
    }
    // to check email exist in the metadata
    if (!data.metadata?.email) {
      this.logger.error(`Notification ${data.id} missing recipient email — cannot send`);
      await this.prismaService.notification.update({
        where: { id: data.id },
        data: { status: 'dead', errorMessage: 'Missing recipient email' },
      });
      return;
    }

    try {
      // Sending email to the user
      await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_FROM'),
        to: data.metadata?.email,
        subject: data.subject,
        text: data.message,
        html: data.metadata?.html,
      })
      this.logger.log(`Email sent successfully: ${JSON.stringify(data)}`);
      // to update the status in the database
      await this.prismaService.notification.update({
        where: {
          id: data.id,
        },
        data: {
          status: 'sent',
          sentAt: new Date()
        },
      })
    } catch (error) {
      // to handle the error
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email notification: ${errorMessage}`);
      // to increment the retry count
      data.retries++;
      // to check the retry count
      if (data.retries >= 3) {
        // to update the status in the database
        await this.prismaService.notification.update({
          where: { id: data.id },
          data: {
            status: 'dead',
            retries: data.retries,
            errorMessage,
          },
        });
        this.logger.warn(
          `Notification ${data.id} exceeded max retries — moved to Dead Letter Queue`,
        );
        // to send the notification to the dead letter queue
        await firstValueFrom(
          this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATIONS_DLQ, data),
        );
      } else {
        // to update the status in the database
        await this.prismaService.notification.update({
          where: { id: data.id },
          data: {
            status: 'failed',
            retries: data.retries,
            errorMessage,
          },
        });

        this.logger.warn(
          `Notification ${data.id} failed — scheduled for retry (${data.retries}/3)`,
        );

        await firstValueFrom(
          this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATIONS_RETRY, data),
        );
      }

    }
  }
}