// Shared types and DTOs for NestJS microservices

import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  Logger,
  NestMiddleware,
} from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import * as bcrypt from "bcrypt";

// Add empty export to make this a module
export {};

// Export shared types and DTOs
export * from "./auth/index";
export * from "./posts/index";
export * from "./users/index";
export * from "./profile/index";
export * from "./user.interface";
export * from "./assets/index";
export * from "./notifications/index";

// Roles as const assertion for better type inference and JS output
export const Roles = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

// Inferred type from the const
export type Role = (typeof Roles)[keyof typeof Roles];

// Current user decorator
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export function ParseExpirationToSeconds(expiration: string): number {
  const unit = expiration.slice(-1);
  const value = parseInt(expiration, 10);

  switch (unit) {
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 60 * 60 * 24;
    default:
      return 7 * 24 * 60 * 60; // default 7 days
  }
}

//Hashing func
export async function hashingFunction(data: string) {
  const salt = process.env.HASH_SALT;
  if (!salt) {
    throw new Error("No crypto ENV detected");
  }
  return await bcrypt.hash(data, salt);
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Request-Response logging middleware
@Injectable()
export class ReqResLoggerMiddelware implements NestMiddleware {
  private logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { originalUrl, method, ip } = req;

    res.on("finish", () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      const user = req.user as { id: string } | undefined;
      const userInfo = user
        ? ` - User: ${user.id} Authenticated successfully`
        : "";

      this.logger.log(
        `${ip} ${method} ${originalUrl} ${statusCode} - ${duration}ms${userInfo}`,
      );
    });

    next();
  }
}
