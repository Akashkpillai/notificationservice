import { Test, TestingModule } from '@nestjs/testing';
import { SmsServicesController } from './sms-services.controller';
import { SmsServicesService } from './sms-services.service';

describe('SmsServicesController', () => {
  let smsServicesController: SmsServicesController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SmsServicesController],
      providers: [SmsServicesService],
    }).compile();

    smsServicesController = app.get<SmsServicesController>(SmsServicesController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(smsServicesController.getHello()).toBe('Hello World!');
    });
  });
});
