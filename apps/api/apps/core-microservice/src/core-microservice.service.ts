import { Injectable } from '@nestjs/common';

@Injectable()
export class CoreMicroserviceService {
  getHello(): string {
    return 'Hello World!';
  }
}
