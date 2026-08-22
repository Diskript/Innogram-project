import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthService } from "./jwt-auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import {
  CurrentUser,
  JwtUser,
  Public,
  LoginDto,
  SignUpDto,
  RefreshTokenDto,
  ValidateTokenDto,
} from "@repo/shared-types";

@ApiTags("JWT Auth")
@Controller("jwt-auth")
@UseGuards(JwtAuthGuard)
export class JwtAuthController {
  constructor(private readonly jwtAuthService: JwtAuthService) {}

  @Post("register")
  @Public()
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({ status: 201, description: "User registered successfully" })
  @ApiResponse({ status: 409, description: "User already exists" })
  async register(@Body() signUpDto: SignUpDto) {
    return this.jwtAuthService.registerUser(signUpDto);
  }

  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate user and return tokens" })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() loginDto: LoginDto) {
    return this.jwtAuthService.authenticateUser(loginDto);
  }

  @Post("refresh")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token using refresh token" })
  @ApiResponse({ status: 200, description: "Tokens refreshed successfully" })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token" })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.jwtAuthService.processRefreshToken(refreshTokenDto);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoke refresh token (logout)" })
  @ApiResponse({ status: 200, description: "Logged out successfully" })
  async logout(@CurrentUser() user: JwtUser) {
    await this.jwtAuthService.revokeRefreshToken(user.userId);
    return { message: "Logged out successfully" };
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Revoke all refresh tokens (logout from all devices)",
  })
  @ApiResponse({ status: 200, description: "Logged out from all devices" })
  async logoutAll(@CurrentUser() user: JwtUser) {
    await this.jwtAuthService.revokeAllRefreshTokens(user.userId);
    return { message: "Logged out from all devices successfully" };
  }

  @Post("validate")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Validate access token" })
  @ApiResponse({ status: 200, description: "Token is valid" })
  @ApiResponse({ status: 401, description: "Invalid or expired token" })
  async validate(@Body() validateTokenDto: ValidateTokenDto) {
    return this.jwtAuthService.validateAccessToken(validateTokenDto.token);
  }
}
