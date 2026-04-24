import { Controller, Get, Req, Res } from "@nestjs/common";
import { GoogleOAuthService, GoogleUser } from "./google.service";
import { Request, Response } from "express";
import { cookieOptions, ParseExpirationToSeconds } from "@repo/shared-types";

@Controller("google")
export class GoogleController {
  constructor(private readonly googleOAuthService: GoogleOAuthService) {}

  @Get("google")
  async googleAuth() {}

  @Get("google/callback")
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
