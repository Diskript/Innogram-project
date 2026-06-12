import { HttpService } from "@nestjs/axios";
import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import {
  LoginDto,
  RefreshTokenDto,
  SignUpDto,
  ValidateTokenDto,
} from "@repo/shared-types";
import { firstValueFrom } from "rxjs";

export interface ValidateTokenResponse {
  valid: boolean;
  payload?: {
    sub: string;
    email: string;
    iat?: number;
    exp?: number;
  };
  error?: string;
}

export interface AuthTokensResponse {
  message: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokensResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly authServiceUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.authServiceUrl = process.env.AUTH_SERVICE_URL!;
  }

  async validateToken(token: ValidateTokenDto): Promise<ValidateTokenResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<ValidateTokenResponse>(
          `${this.authServiceUrl}/jwt-auth/validate`,
          { token },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to validate token: ${(error as Error).message}`,
      );
      return { valid: false, error: (error as Error).message };
    }
  }

  async register(signUpDto: SignUpDto): Promise<{
    message: string;
    userId: string;
    userEmail: string;
  }> {
    try {
      const responce = await firstValueFrom(
        this.httpService.post<{
          message: string;
          userId: string;
          userEmail: string;
        }>(`${this.authServiceUrl}/jwt-auth/register`, signUpDto),
      );
      return responce.data;
    } catch (error) {
      const axiosError = error as {
        response?: { status?: number; data?: { message?: string } };
      };
      const status = axiosError.response?.status || HttpStatus.BAD_GATEWAY;
      const message =
        axiosError.response?.data?.message || "Registration failed";
      throw new HttpException(message, status);
    }
  }

  async login(loginDto: LoginDto): Promise<AuthTokensResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<AuthTokensResponse>(
          `${this.authServiceUrl}/jwt-auth/login`,
          loginDto,
        ),
      );
      return response.data;
    } catch (error) {
      const axiosError = error as {
        response?: { status?: number; data?: { message?: string } };
      };
      const status = axiosError.response?.status || HttpStatus.BAD_GATEWAY;
      const message =
        axiosError.response?.data?.message || "Registration failed";
      throw new HttpException(message, status);
    }
  }

  async refreshTokens(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshTokensResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<RefreshTokensResponse>(
          `${this.authServiceUrl}/jwt-auth/refresh`,
          refreshTokenDto,
        ),
      );
      return response.data;
    } catch (error) {
      const axiosError = error as {
        response?: { status?: number; data?: { message?: string } };
      };
      const status = axiosError.response?.status || HttpStatus.BAD_GATEWAY;
      const message =
        axiosError.response?.data?.message || "Registration failed";
      throw new HttpException(message, status);
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<{ message: string }>(
          `${this.authServiceUrl}/jwt-auth/logout`,
          { userId },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Logout failed: ${(error as Error).message}`);
      return { message: "Logged out" };
    }
  }

  async logoutAll(userId: string): Promise<{ message: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<{ message: string }>(
          `${this.authServiceUrl}/jwt-auth/logout-all`,
          { userId },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Logout all failed: ${(error as Error).message}`);
      return { message: "Logged out from all devices" };
    }
  }
}
