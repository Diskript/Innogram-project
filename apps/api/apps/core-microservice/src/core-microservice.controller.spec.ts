import { Test, TestingModule } from '@nestjs/testing';
import { CoreMicroserviceController } from './core-microservice.controller';
import { CoreMicroserviceService } from './core-microservice.service';

describe('CoreMicroserviceController', () => {
  let coreMicroserviceController: CoreMicroserviceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CoreMicroserviceController],
      providers: [CoreMicroserviceService],
    }).compile();

    coreMicroserviceController = app.get<CoreMicroserviceController>(CoreMicroserviceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(coreMicroserviceController.getHello()).toBe('Hello World!');
    });
  });
});
