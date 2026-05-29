import { Controller, Get, Req, Res, Redirect } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { GoogleOAuthService, GoogleUser } from "./google.service";
import { Request, Response } from "express";
import { cookieOptions, ParseExpirationToSeconds } from "@repo/shared-types";

@ApiTags("Google OAuth")
@Controller("google")
export class GoogleController {
  constructor(private readonly googleOAuthService: GoogleOAuthService) {}

  @Get("google")
  @ApiOperation({ summary: "Initiate Google OAuth flow" })
  @ApiResponse({
    status: 302,
    description: "Redirects to Google OAuth consent screen",
  })
  @Redirect()
  async googleAuth() {
    // Passport will handle the redirect to Google's OAuth consent screen
    // This endpoint returns nothing as Passport intercepts and handles the flow
    return { url: "/auth/google" };
  }

  @Get("google/callback")
  @ApiOperation({ summary: "Handle Google OAuth callback" })
  @ApiResponse({
    status: 302,
    description: "Redirects to frontend after successful authentication",
  })
  @ApiResponse({ status: 401, description: "Authentication failed" })
  async OAuthCallback(@Req() req: Request, @Res() res: Response) {
    const googleUser = req.user as GoogleUser;

    const result =
      await this.googleOAuthService.handleOAuthCallback(googleUser);

    res.cookie("access_token", result.accessToken, {
      ...cookieOptions,
      maxAge: ParseExpirationToSeconds(process.env.JWT_EXPIRES_IN!),
    });
    res.cookie("refresh_token", result.refreshToken, {
      ...cookieOptions,
      maxAge: ParseExpirationToSeconds(process.env.JWT_REFRESH_EXPIRES_IN!),
    });
    res.cookie("auth_seccess", "true", {
      ...cookieOptions,
      maxAge: 5000,
    });

    return res.redirect(result.redirectUrl);
  }
}
