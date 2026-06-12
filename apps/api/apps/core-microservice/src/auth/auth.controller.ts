import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  CurrentUser,
  JwtUser,
  LoginDto,
  Public,
  RefreshTokenDto,
  SignUpDto,
} from "@repo/shared-types";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";

@Controller("auth")
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({ status: 201, description: "User registrated successfully" })
  async register(@Body() signUpDto: SignUpDto) {
    return this.authService.register(signUpDto);
  }

  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate user and returs tokes" })
  @ApiResponse({ status: 200, description: "Login successfull" })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({ status: 200, description: "Token refreshed successfully" })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout user" })
  @ApiResponse({ status: 200, description: "Logged out seccessfully" })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout user from all devices" })
  @ApiResponse({
    status: 200,
    description: "Logged out from all devices seccessfully",
  })
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
