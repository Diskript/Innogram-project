import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Interface for JWT authenticated user
 * This is the shape of the user object attached to request.user
 */
export interface JwtUser {
  userId: string;
  email: string;
}
