import { Module } from '@nestjs/common';
import { SmsServicesController } from './sms-services.controller';
import { SmsServices } from './sms-services.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@app/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    ClientsModule.registerAsync([
      {
        name: 'SMS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get<string>('KAFKA_SMS_CLIENT_ID') || 'sms-producer',
              brokers: [configService.get<string>('KAFKA_BROKER') || 'localhost:9092'],
            }
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [SmsServicesController],
  providers: [SmsServices],
})
export class SmsServicesModule { }
