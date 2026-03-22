import { Controller, Get } from '@nestjs/common';
import { CoreMicroserviceService } from './core-microservice.service';

@Controller()
export class CoreMicroserviceController {
  constructor(private readonly coreMicroserviceService: CoreMicroserviceService) {}

  @Get()
  getHello(): string {
    return this.coreMicroserviceService.getHello();
  }
}
