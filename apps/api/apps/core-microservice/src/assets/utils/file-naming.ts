import crypto from "crypto";
import { JwtUser, Visibility } from "@repo/shared-types";

export function generateFileName(originalName: string): string {
  const uuid = crypto.randomUUID();
  const extension = originalName.split(".").pop()?.toLowerCase() || "bin";
  return `${uuid}.${extension}`;
}

export function generateThumbnailName(fileName: string): string {
  const [name, ext] = fileName.split(".");
  return `${name}_thumb.${ext}`;
}

export function generateMediumName(fileName: string): string {
  const [name, ext] = fileName.split(".");
  return `${name}_med.${ext}`;
}

export function getStoragePath(): string;
export function getStoragePath(
  visibility: Visibility,
  user: JwtUser,
  fileName: string,
  conversationId?: string,
): string;
export function getStoragePath(
  visibility?: Visibility,
  user?: JwtUser,
  fileName?: string,
  conversationId?: string,
): string {
  // No-arg overload: multer staging dir (relative to the uploads root).
  // Uploads land here from disk storage and are moved to the
  // visibility-scoped path once the multipart body is parsed.
  if (!visibility || !user || !fileName) {
    return "staging/original";
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  if (conversationId) {
    return `${visibility.toLowerCase()}/conversations/${conversationId}/${year}/${month}/${day}/original/${fileName}`;
  }

  return `${visibility.toLowerCase()}/users/${user.userId}/${year}/${month}/${day}/original/${fileName}`;
}
