import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationServicesService {
  getHello(): string {
    return 'Hello World!';
  }
}
