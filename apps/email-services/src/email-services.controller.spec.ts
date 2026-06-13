import { Test, TestingModule } from '@nestjs/testing';
import { EmailServicesController } from './email-services.controller';
import { EmailServicesService } from './email-services.service';

describe('EmailServicesController', () => {
  let emailServicesController: EmailServicesController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [EmailServicesController],
      providers: [EmailServicesService],
    }).compile();

    emailServicesController = app.get<EmailServicesController>(EmailServicesController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(emailServicesController.getHello()).toBe('Hello World!');
    });
  });
});
