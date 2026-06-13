import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsServicesService {
  getHello(): string {
    return 'Hello World!';
  }
}
