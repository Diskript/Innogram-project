import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly authServiceUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.authServiceUrl = process.env.AUTH_SERVICE_URL!;
  }
}
