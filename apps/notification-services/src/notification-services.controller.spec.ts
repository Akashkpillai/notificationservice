import { Test, TestingModule } from '@nestjs/testing';
import { NotificationServicesController } from './notification-services.controller';
import { NotificationServicesService } from './notification-services.service';

describe('NotificationServicesController', () => {
  let notificationServicesController: NotificationServicesController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [NotificationServicesController],
      providers: [NotificationServicesService],
    }).compile();

    notificationServicesController = app.get<NotificationServicesController>(NotificationServicesController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(notificationServicesController.getHello()).toBe('Hello World!');
    });
  });
});
