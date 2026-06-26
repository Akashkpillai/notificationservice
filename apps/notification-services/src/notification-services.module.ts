import { Module } from '@nestjs/common';
import { NotificationRouterController } from './notification-router.controller';
import { NotificationRouterService } from './notification-router.service';
import { PrismaModule } from '@app/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get<string>('KAFKA_ROUTER_CLIENT_ID') || 'notification-services',
              brokers: [configService.get<string>('KAFKA_BROKER') || 'localhost:9092'],
            },
            consumer: {
              groupId: configService.get<string>('KAFKA_ROUTER_GROUP_ID') || 'notification-services-group',
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [NotificationRouterController],
  providers: [NotificationRouterService],
})
export class NotificationServicesModule { }
