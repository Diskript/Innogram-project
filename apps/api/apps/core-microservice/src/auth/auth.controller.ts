import {
  Body,
  Controller,
  HttpException,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  CurrentUser,
  JwtUser,
  LoginDto,
  RefreshTokenDto,
  SignUpDto,
} from "@repo/shared-types";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() signUpDto: SignUpDto) {
    return this.authService.register(signUpDto);
  }

  @Post("login")
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("refresh")
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: JwtUser) {
    if (!user) {
      throw new HttpException(
        "No current user found, redirectiong to the login page",
        403,
      );
    }

    return this.authService.logout(user.userId);
  }

  @Post("logout-all")
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUser() user: JwtUser) {
    if (!user) {
      throw new HttpException(
        "No current user found, redirectiong to the login page",
        403,
      );
    }

    return this.authService.logoutAll(user.userId);
  }
}
