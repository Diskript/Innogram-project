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

// Load Express type augmentations
import "./express.d.ts";

// Type declarations in express.d.ts augment Express Request type automatically

// Export shared types and DTOs
export * from "./auth/index";
export * from "./posts/index";
export * from "./users/index";
export * from "./user.interface";

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

//Hashing func
export async function hashingFunction(data: string) {
  const salt = process.env.HASH_SALT;
  if (!salt) {
    throw new Error("No crypto ENV detected");
  }
  return await bcrypt.hash(data, salt);
}

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
