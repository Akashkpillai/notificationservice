import { Module } from '@nestjs/common';
import { EmailServicesController } from './email-services.controller';
import { EmailServices } from './email-services.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaModule } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,

    ClientsModule.registerAsync([
      {
        name: 'EMAIL_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get<string>('KAFKA_EMAIL_CLIENT_ID') || 'email-producer',
              brokers: [configService.get<string>('KAFKA_BROKER') || 'localhost:9092'],
            }
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [EmailServicesController],
  providers: [EmailServices],
})
export class EmailServicesModule { }
