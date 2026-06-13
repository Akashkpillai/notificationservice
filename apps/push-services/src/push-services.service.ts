import { Injectable } from '@nestjs/common';

@Injectable()
export class PushServicesService {
  getHello(): string {
    return 'Hello World!';
  }
}
