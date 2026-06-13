import { Test, TestingModule } from '@nestjs/testing';
import { PushServicesController } from './push-services.controller';
import { PushServicesService } from './push-services.service';

describe('PushServicesController', () => {
  let pushServicesController: PushServicesController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PushServicesController],
      providers: [PushServicesService],
    }).compile();

    pushServicesController = app.get<PushServicesController>(PushServicesController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(pushServicesController.getHello()).toBe('Hello World!');
    });
  });
});
