import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailServicesService {
  getHello(): string {
    return 'Hello World!';
  }
}
